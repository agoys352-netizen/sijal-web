-- SIJAL: multi-road arm mapping for intersection survey sessions
create table if not exists public.survey_session_road_links (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.survey_sessions(id) on delete cascade,
  road_segment_id uuid not null references public.road_segments(id) on delete restrict,
  arm_order integer not null check (arm_order > 0),
  arm_label text not null,
  created_at timestamptz not null default now(),
  unique(session_id, road_segment_id),
  unique(session_id, arm_order)
);
create index if not exists survey_session_road_links_session_idx on public.survey_session_road_links(session_id);
create index if not exists survey_session_road_links_road_idx on public.survey_session_road_links(road_segment_id);
alter table public.survey_session_road_links enable row level security;
grant select, insert, delete on public.survey_session_road_links to authenticated;
drop policy if exists survey_session_road_links_select_member on public.survey_session_road_links;
create policy survey_session_road_links_select_member on public.survey_session_road_links
for select to authenticated using (
  exists (select 1 from public.session_members sm where sm.session_id=survey_session_road_links.session_id and sm.user_id=(select auth.uid()))
);
drop policy if exists survey_session_road_links_insert_leader on public.survey_session_road_links;
create policy survey_session_road_links_insert_leader on public.survey_session_road_links
for insert to authenticated with check (
  exists (select 1 from public.session_members sm where sm.session_id=survey_session_road_links.session_id and sm.user_id=(select auth.uid()) and sm.role='LEADER')
  and exists (select 1 from public.road_segments r where r.id=survey_session_road_links.road_segment_id and r.status='ACTIVE')
);
drop policy if exists survey_session_road_links_delete_leader on public.survey_session_road_links;
create policy survey_session_road_links_delete_leader on public.survey_session_road_links
for delete to authenticated using (
  exists (select 1 from public.session_members sm where sm.session_id=survey_session_road_links.session_id and sm.user_id=(select auth.uid()) and sm.role='LEADER')
);
