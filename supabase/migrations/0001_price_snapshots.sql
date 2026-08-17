-- Migration 0001 — price_snapshots
--
-- Stores daily price observations per card so we can serve real
-- historical charts from /api/tcgplayer/history. Backfilled by a
-- Vercel cron that polls mycollectrics.com once a day (api/cron/
-- snapshot-prices.ts) and upserts every row in their leaderboard.
--
-- Schema rationale:
--   - product_id is always populated (parsed from the collectrics
--     image URL) and is the upstream identity we're snapshotting.
--   - card_id is the Pokemon TCG cardId (e.g. "sv8pt5-64") resolved
--     server-side via api.pokemontcg.io; may be null for cards the
--     resolver missed (new sets, unusual variants). When null, the
--     row still gets stored — once the resolver catches up we can
--     backfill the card_id via a one-shot update.
--   - source allows future-proofing if we add eBay sold-listing
--     snapshots for graded prices (PSA 10) later.
--
-- Read access is public via the anon role so the unauthenticated
-- chart endpoint can serve history without a session. Writes are
-- limited to the service role (RLS blocks anon writes by default,
-- service_role bypasses RLS).

create table if not exists public.price_snapshots (
  id              bigserial primary key,
  product_id      text not null,
  card_id         text,
  snapshot_date   date not null,
  raw_price       numeric(12, 2) not null,
  dod_change_pct  numeric(10, 4),
  baseline_change_pct numeric(10, 4),
  source          text not null default 'collectrics',
  created_at      timestamptz not null default now()
);

-- One snapshot per product, per day, per source. Cron job re-runs
-- against the same day are idempotent via ON CONFLICT.
create unique index if not exists price_snapshots_product_date_source_idx
  on public.price_snapshots (product_id, snapshot_date, source);

-- Most common query: "give me every snapshot for cardId X, ordered
-- by date" — for the history chart.
create index if not exists price_snapshots_card_date_idx
  on public.price_snapshots (card_id, snapshot_date);

-- RLS — public read, service-role-only write
alter table public.price_snapshots enable row level security;

drop policy if exists "Public read price_snapshots" on public.price_snapshots;
create policy "Public read price_snapshots"
  on public.price_snapshots
  for select
  to anon, authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies for anon/authenticated. The
-- service_role used by the cron bypasses RLS entirely.

comment on table public.price_snapshots is
  'Daily price observations per card, ingested from mycollectrics.com via Vercel cron. Read-only to clients; written exclusively by service_role.';
