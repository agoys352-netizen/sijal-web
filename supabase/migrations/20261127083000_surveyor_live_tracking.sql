-- SIJAL team live location sharing
-- Applied to project anonywvrimfuatfbbvdl on 2026-11-27 via Supabase migration tool.
create table if not exists public.surveyor_locations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.survey_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  surveyor_name text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision,
  is_tracking boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (session_id, user_id)
);
create index if not exists surveyor_locations_session_tracking_idx
  on public.surveyor_locations(session_id, is_tracking, updated_at desc);
alter table public.surveyor_locations enable row level security;
grant select, insert, update, delete on public.surveyor_locations to authenticated;
drop policy if exists surveyor_locations_select_members on public.surveyor_locations;
create policy surveyor_locations_select_members on public.surveyor_locations
for select to authenticated using (
  exists (select 1 from public.session_members m
          where m.session_id = surveyor_locations.session_id and m.user_id = (select auth.uid()))
  and (user_id = (select auth.uid()) or (is_tracking = true and updated_at > now() - interval '90 seconds'))
);
drop policy if exists surveyor_locations_insert_self on public.surveyor_locations;
create policy surveyor_locations_insert_self on public.surveyor_locations
for insert to authenticated with check (
  user_id = (select auth.uid()) and
  exists (select 1 from public.session_members m
          where m.session_id = surveyor_locations.session_id and m.user_id = (select auth.uid()))
);
drop policy if exists surveyor_locations_update_self on public.surveyor_locations;
create policy surveyor_locations_update_self on public.surveyor_locations
for update to authenticated using (
  user_id = (select auth.uid()) and
  exists (select 1 from public.session_members m
          where m.session_id = surveyor_locations.session_id and m.user_id = (select auth.uid()))
) with check (
  user_id = (select auth.uid()) and
  exists (select 1 from public.session_members m
          where m.session_id = public.surveyor_locations.session_id and m.user_id = (select auth.uid()))
);
drop policy if exists surveyor_locations_delete_self on public.surveyor_locations;
create policy surveyor_locations_delete_self on public.surveyor_locations
for delete to authenticated using (
  user_id = (select auth.uid()) and
  exists (select 1 from public.session_members m
          where m.session_id = surveyor_locations.session_id and m.user_id = (select auth.uid()))
);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='surveyor_locations') then
    alter publication supabase_realtime add table public.surveyor_locations;
  end if;
end $$;
