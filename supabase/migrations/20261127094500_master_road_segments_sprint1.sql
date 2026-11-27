-- SIJAL Sprint 1: Master Road Segments
create sequence if not exists public.road_segments_code_seq start 1;
create table if not exists public.road_segments (
  id uuid primary key default gen_random_uuid(), road_code text not null unique,
  name text not null, official_code text, road_type text not null default 'Kabupaten',
  regency text not null, district text not null, width_avg_m numeric(6,2),
  surface_type text, description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint road_segments_name_nonempty check (length(trim(name)) > 0),
  constraint road_segments_regency_nonempty check (length(trim(regency)) > 0),
  constraint road_segments_district_nonempty check (length(trim(district)) > 0),
  constraint road_segments_width_positive check (width_avg_m is null or width_avg_m > 0)
);
create or replace function public.set_road_segment_code()
returns trigger language plpgsql set search_path = public as $$
begin
 if new.road_code is null or new.road_code = '' then
  new.road_code := 'RWS-' || lpad(nextval('public.road_segments_code_seq')::text, 6, '0');
 end if;
 return new;
end; $$;
drop trigger if exists road_segments_code_trigger on public.road_segments;
create trigger road_segments_code_trigger before insert on public.road_segments for each row execute function public.set_road_segment_code();
create or replace function public.road_segments_updated_at()
returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists road_segments_updated_at_trigger on public.road_segments;
create trigger road_segments_updated_at_trigger before update on public.road_segments for each row execute function public.road_segments_updated_at();
create index if not exists road_segments_status_idx on public.road_segments(status);
create index if not exists road_segments_region_idx on public.road_segments(regency, district);
create index if not exists road_segments_created_by_idx on public.road_segments(created_by);
alter table public.road_segments enable row level security;
grant select, insert, update on public.road_segments to authenticated;\ngrant usage, select on sequence public.road_segments_code_seq to authenticated;
drop policy if exists road_segments_select_active_or_owner on public.road_segments;
create policy road_segments_select_active_or_owner on public.road_segments for select to authenticated using (status = 'ACTIVE' or created_by = (select auth.uid()));
drop policy if exists road_segments_insert_self on public.road_segments;
create policy road_segments_insert_self on public.road_segments for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists road_segments_update_owner on public.road_segments;
create policy road_segments_update_owner on public.road_segments for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
