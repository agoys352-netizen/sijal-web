create policy road_segments_delete_owner
on public.road_segments
for delete
to authenticated
using (created_by = (select auth.uid()));
