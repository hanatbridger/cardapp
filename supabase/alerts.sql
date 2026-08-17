-- CardPulse server-side price-alert targets. Run in the Supabase SQL
-- editor (cardpulse project). Re-runnable: every policy is dropped
-- before it is created.
--
-- Clients mirror their active price alerts here (src/services/
-- alert-sync.ts) so the daily snapshot cron (api/cron/snapshot-prices.ts)
-- can fire Expo pushes while the app is fully closed. The in-app checker
-- remains the real-time path while the app is open; this table only
-- covers the once-daily server sweep.

create extension if not exists "pgcrypto";

create table if not exists public.alert_targets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  push_token   text not null check (char_length(push_token) between 20 and 512),
  card_id      text not null,
  card_name    text not null,
  grade        text not null default 'UNGRADED',
  target_price numeric not null check (target_price > 0),
  direction    text not null check (direction in ('above', 'below')),
  created_at   timestamptz default now(),
  triggered_at timestamptz
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

-- One rule per user+card+grade — mirrors the client store's upsert
-- semantics (a card+grade has at most one active alert).
create unique index if not exists alert_targets_user_card_grade_idx
  on public.alert_targets (user_id, card_id, grade);

-- The cron sweeps only un-triggered rows.
create index if not exists alert_targets_untriggered_idx
  on public.alert_targets (card_id)
  where triggered_at is null;
