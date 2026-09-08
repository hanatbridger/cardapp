-- CardPulse server-side alert targets. Run in the Supabase SQL editor
-- (cardpulse project). Re-runnable: every policy is dropped before it is
-- created and every schema change is guarded.
--
-- Clients mirror their active alerts here (src/services/alert-sync.ts)
-- so the daily snapshot cron (api/cron/snapshot-prices.ts) can fire Expo
-- pushes while the app is fully closed. The in-app checker remains the
-- real-time path while the app is open; this table only covers the
-- once-daily server sweep.
--
-- Two kinds of row, discriminated by `kind`:
--   price   — target_price + direction on a card+grade.
--   grading — "worth grading" flip: threshold_net (USD expected net after
--             fees) + direction, evaluated by re-running the grading
--             verdict (src/services/grading-verdict.ts) on the card's
--             live raw price, PSA 10 sold price and gem rate. card_number
--             and condition are the extra inputs. grade is pinned to
--             'UNGRADED' so the (user, card, kind, grade) key keeps one
--             grading rule per card.

create extension if not exists "pgcrypto";

create table if not exists public.alert_targets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  push_token    text not null check (char_length(push_token) between 20 and 512),
  kind          text not null default 'price',
  card_id       text not null,
  card_name     text not null,
  grade         text not null default 'UNGRADED',
  target_price  numeric check (target_price > 0),
  direction     text not null check (direction in ('above', 'below')),
  card_number   text,
  condition     text,
  threshold_net numeric,
  created_at    timestamptz default now(),
  triggered_at  timestamptz
);

-- Upgrade path for tables created before grading alerts (price-only
-- shape: no kind, target_price NOT NULL). Each step is a no-op once
-- applied. Deploy order: run this BEFORE shipping a client that writes
-- `kind` — the client's price-alert sync filters on the column and
-- silently no-ops until it exists.
alter table public.alert_targets add column if not exists kind          text not null default 'price';
alter table public.alert_targets add column if not exists card_number   text;
alter table public.alert_targets add column if not exists condition     text;
alter table public.alert_targets add column if not exists threshold_net numeric;
alter table public.alert_targets alter column target_price drop not null;

alter table public.alert_targets drop constraint if exists alert_targets_kind_check;
alter table public.alert_targets add constraint alert_targets_kind_check
  check (kind in ('price', 'grading'));

-- Each kind carries its own inputs; nothing else is nullable-by-accident.
-- Every branch must evaluate to true or false, never NULL: a CHECK that
-- evaluates to NULL PASSES, so a bare `condition in (...)` would have let
-- a grading row through with a null condition.
alter table public.alert_targets drop constraint if exists alert_targets_kind_shape_check;
alter table public.alert_targets add constraint alert_targets_kind_shape_check check (
  (kind = 'price' and target_price is not null)
  or (
    kind = 'grading'
    and threshold_net is not null
    and card_number is not null
    and condition is not null
    and condition in ('mint', 'near_mint', 'lightly_played', 'moderately_played', 'heavily_played')
  )
);

alter table public.alert_targets enable row level security;

drop policy if exists "alert_targets_insert_own" on public.alert_targets;
drop policy if exists "alert_targets_select_own" on public.alert_targets;
drop policy if exists "alert_targets_delete_own" on public.alert_targets;

create policy "alert_targets_insert_own" on public.alert_targets for insert with check (auth.uid() = user_id);
create policy "alert_targets_select_own" on public.alert_targets for select using (auth.uid() = user_id);
create policy "alert_targets_delete_own" on public.alert_targets for delete using (auth.uid() = user_id);
-- Deliberately NO update policy for clients: triggered_at is written
-- only by the cron via the service-role key. Clients re-arm by
-- delete + insert (see alert-sync.ts), which the policies above allow.

-- One active rule per (user, card, kind, grade) — mirrors the client
-- store's upsert semantics. Replaces the pre-grading (user, card, grade)
-- index, under which a card's price and grading rules would collide.
drop index if exists public.alert_targets_user_card_grade_idx;
create unique index if not exists alert_targets_user_card_kind_grade_idx
  on public.alert_targets (user_id, card_id, kind, grade);

-- The cron sweeps only un-triggered rows.
create index if not exists alert_targets_untriggered_idx
  on public.alert_targets (card_id)
  where triggered_at is null;
