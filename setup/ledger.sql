-- 💐 Finished Ledger setup (HD0.6) — run ONCE in Supabase → SQL Editor (idempotent)
-- 1. Permanent single-row ledger table
create table if not exists public.finished_ledger(id int primary key default 1, value text, updated_at timestamptz default now());
insert into public.finished_ledger(id,value) values(1,'{"people":[]}') on conflict do nothing;
alter table public.finished_ledger add constraint finished_ledger_id_is_1 check (id = 1);

-- 2. Auto-touch trigger
create or replace function public.touch_finished_ledger() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_finished_ledger on public.finished_ledger;
create trigger trg_touch_finished_ledger before update on public.finished_ledger for each row execute function public.touch_finished_ledger();

-- 3. RLS: anon + authenticated read/write
alter table public.finished_ledger enable row level security;
drop policy if exists ledger_read on public.finished_ledger;
drop policy if exists ledger_insert on public.finished_ledger;
drop policy if exists ledger_update on public.finished_ledger;
create policy ledger_read on public.finished_ledger for select using(true) to anon,authenticated;
create policy ledger_insert on public.finished_ledger for insert with check(true) to anon,authenticated;
create policy ledger_update on public.finished_ledger for update using(true) with check(true) to anon,authenticated;

-- 4. Public storage bucket copy (survives every table wipe)
insert into storage.buckets(id,name,public) values('site-ledger','site-ledger',true) on conflict (id) do nothing;
drop policy if exists ledger_public_read on storage.objects;
drop policy if exists ledger_anon_write on storage.objects;
drop policy if exists ledger_anon_update on storage.objects;
create policy ledger_public_read on storage.objects for select using(bucket_id='site-ledger') to public;
create policy ledger_anon_write on storage.objects for insert with check(bucket_id='site-ledger') to anon;
create policy ledger_anon_update on storage.objects for update using(bucket_id='site-ledger') with check(bucket_id='site-ledger') to anon;

-- 5. Self-healing RPC (new domains/devices recreate the store if missing)
create or replace function public.ensure_finished_ledger_table() returns void language plpgsql security definer as $$
begin
  create table if not exists public.finished_ledger(id int primary key default 1, value text, updated_at timestamptz default now());
  insert into public.finished_ledger(id,value) values(1,'{"people":[]}') on conflict do nothing;
  alter table public.finished_ledger enable row level security;
  drop policy if exists ledger_read on public.finished_ledger;
  drop policy if exists ledger_insert on public.finished_ledger;
  drop policy if exists ledger_update on public.finished_ledger;
  create policy ledger_read on public.finished_ledger for select using(true) to anon,authenticated;
  create policy ledger_insert on public.finished_ledger for insert with check(true) to anon,authenticated;
  create policy ledger_update on public.finished_ledger for update using(true) with check(true) to anon,authenticated;
  insert into storage.buckets(id,name,public) values('site-ledger','site-ledger',true) on conflict (id) do nothing;
end $$;
grant execute on function public.ensure_finished_ledger_table() to anon, authenticated;

-- 6. guest_submissions status CHECK must allow 'finished'
--    (adjust table name if yours differs; T_GUEST = guest_submissions)
alter table public.guest_submissions drop constraint if exists guest_submissions_status_check;
alter table public.guest_submissions add constraint guest_submissions_status_check check (status in ('pending','approved','finished','rejected'));
