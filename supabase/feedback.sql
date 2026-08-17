-- CardPulse feedback loop. Run once in the Supabase SQL editor (cardpulse
-- project). Re-runnable: every policy is dropped before it is created.
-- Ported from pogo-trade-app/mobile/supabase/feedback.sql with one
-- difference: CardPulse has no public.profiles table, so the admin gate
-- is the JWT email claim — exactly one account may triage.

create extension if not exists "pgcrypto";

-- Who may triage. The JWT email is set by Supabase auth and cannot be
-- chosen by the client, so this is as strong as the profiles.is_admin
-- flag pogo uses, without needing a profiles table.
create or replace function public.is_feedback_admin()
returns boolean language sql stable as $$
  select coalesce(lower(auth.jwt()->>'email') = 'hanwong118@gmail.com', false);
$$;

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  username    text not null,
  kind        text not null default 'bug' check (kind in ('bug', 'idea', 'general')),
  message     text not null check (char_length(message) between 1 and 5000),
  screenshot  text,
  app_version text,
  context     jsonb not null default '{}'::jsonb,
  status      text not null default 'open' check (status in ('open', 'triaged', 'queued', 'fixed', 'dismissed')),
  queued_at   timestamptz,
  admin_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "feedback_insert_own"   on public.feedback;
drop policy if exists "feedback_select_own"   on public.feedback;
drop policy if exists "feedback_select_admin" on public.feedback;
drop policy if exists "feedback_update_admin" on public.feedback;

create policy "feedback_insert_own" on public.feedback for insert with check (auth.uid() = user_id);
create policy "feedback_select_own" on public.feedback for select using (auth.uid() = user_id);
-- Admin reads and triages everything. No delete policy: feedback is
-- never destroyed, only dismissed.
create policy "feedback_select_admin" on public.feedback for select using (public.is_feedback_admin());
create policy "feedback_update_admin" on public.feedback for update using (public.is_feedback_admin());

-- Clients may only write the submission columns; status/queued_at/
-- admin_note are the triage surface.
revoke insert on public.feedback from anon, authenticated;
grant  insert (user_id, username, kind, message, screenshot, app_version, context) on public.feedback to authenticated;

create index if not exists feedback_status_idx on public.feedback (status, created_at desc);
create index if not exists feedback_user_idx   on public.feedback (user_id, created_at desc);

create or replace function public.touch_feedback()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_feedback on public.feedback;
create trigger trg_touch_feedback before update on public.feedback
  for each row execute function public.touch_feedback();

-- Screenshot storage: PRIVATE bucket. A feedback screenshot routinely
-- shows the reporter's own account details, so it gets the same
-- protection as the row: reporter and admin only, via signed URLs.
insert into storage.buckets (id, name, public)
values ('feedback-shots', 'feedback-shots', false)
on conflict (id) do update set public = false;

drop policy if exists "feedback_shots_insert" on storage.objects;
drop policy if exists "feedback_shots_read"   on storage.objects;

create policy "feedback_shots_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'feedback-shots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "feedback_shots_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'feedback-shots'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_feedback_admin())
  );
