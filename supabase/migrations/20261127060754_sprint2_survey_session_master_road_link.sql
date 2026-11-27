-- SIJAL Sprint 2: Master Road integration with survey sessions
alter table public.survey_sessions
  add column if not exists road_segment_id uuid references public.road_segments(id) on delete restrict,
  add column if not exists road_name_snapshot text,
  add column if not exists road_code_snapshot text,
  add column if not exists road_regency_snapshot text,
  add column if not exists road_district_snapshot text,
  add column if not exists road_type_snapshot text;

create index if not exists survey_sessions_road_segment_idx on public.survey_sessions(road_segment_id);

create or replace function public.sync_survey_session_road_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
declare road record;
begin
  if new.road_segment_id is null then
    new.road_name_snapshot := null;
    new.road_code_snapshot := null;
    new.road_regency_snapshot := null;
    new.road_district_snapshot := null;
    new.road_type_snapshot := null;
    return new;
  end if;
  select id, road_code, name, regency, district, road_type, status
    into road from public.road_segments where id = new.road_segment_id;
  if not found then
    raise exception 'Master ruas jalan tidak ditemukan atau tidak dapat diakses.';
  end if;
  if road.status <> 'ACTIVE' then
    raise exception 'Sesi baru hanya dapat dibuat pada master ruas berstatus Aktif.';
  end if;
  new.road_name_snapshot := road.name;
  new.road_code_snapshot := road.road_code;
  new.road_regency_snapshot := road.regency;
  new.road_district_snapshot := road.district;
  new.road_type_snapshot := road.road_type;
  return new;
end;
$$;

drop trigger if exists survey_sessions_road_snapshot_trigger on public.survey_sessions;
create trigger survey_sessions_road_snapshot_trigger
before insert or update of road_segment_id
on public.survey_sessions
for each row execute function public.sync_survey_session_road_snapshot();
