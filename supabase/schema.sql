-- Run once in Supabase SQL Editor. Replace OWNER_EMAIL with the project owner's email.
-- No customer data, passwords or service-role keys belong in this repository.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.app_owners (email text primary key check (email = lower(email)));
revoke all on private.app_owners from public, anon, authenticated;
insert into private.app_owners(email) values (lower('OWNER_EMAIL'));
create function private.is_app_owner() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (select 1 from private.app_owners o
 where o.email = lower((select auth.jwt())->>'email'));
$$;
revoke all on function private.is_app_owner() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_app_owner() to authenticated;
create table public.risk_cases (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 name text not null check (char_length(trim(name)) between 1 and 80),
 payload jsonb not null check (
  jsonb_typeof(payload) = 'object' and payload ?& array['version','members'] and payload->>'version' = '2'
  and jsonb_typeof(payload->'members') = 'array'
  and jsonb_array_length(payload->'members') between 1 and 30
  and octet_length(payload::text) <= 1000000
 ),
 revision integer not null default 1 check (revision > 0),
 updated_at timestamptz not null default now()
);
create index risk_cases_owner_updated on public.risk_cases(user_id, updated_at desc);
alter table public.risk_cases enable row level security;
revoke all on public.risk_cases from public, anon, authenticated;
grant select, insert, update on public.risk_cases to authenticated;
create policy owner_read on public.risk_cases for select to authenticated
 using ((select private.is_app_owner()) and user_id = (select auth.uid()));
create policy owner_insert on public.risk_cases for insert to authenticated
 with check ((select private.is_app_owner()) and user_id = (select auth.uid()));
create policy owner_update on public.risk_cases for update to authenticated
 using ((select private.is_app_owner()) and user_id = (select auth.uid()))
 with check ((select private.is_app_owner()) and user_id = (select auth.uid()));
create function private.stamp_case_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
 if TG_OP = 'INSERT' then NEW.revision := 1;
 else NEW.revision := OLD.revision + 1; end if;
 NEW.updated_at := now();
 return NEW;
end;
$$;
revoke all on function private.stamp_case_revision() from public, anon, authenticated;
create trigger stamp_case before insert or update on public.risk_cases
 for each row execute function private.stamp_case_revision();
commit;
