-- SIJAL security hardening: expose only intended RPCs to authenticated users.
-- SECURITY DEFINER application RPCs require a fixed search_path and explicit grants.
REVOKE EXECUTE ON FUNCTION public.add_session_segment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_session_segment(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.delete_survey_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_survey_session(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_session_leader(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_session_leader(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_session_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_session_member(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_session_unlocked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_session_unlocked(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.join_survey_session_by_code(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_survey_session_by_code(text, text) TO authenticated, service_role;

-- Trigger-only functions are not RPCs. Remove direct client execution grants.
REVOKE EXECUTE ON FUNCTION public.prevent_session_unlock() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.road_segments_updated_at() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.set_road_segment_code() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.sync_survey_session_road_snapshot() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;

-- Fix mutable search_path on trigger functions flagged by the security advisor.
ALTER FUNCTION public.prevent_session_unlock() SET search_path = '';
ALTER FUNCTION public.road_segments_updated_at() SET search_path = '';
ALTER FUNCTION public.set_road_segment_code() SET search_path = '';
ALTER FUNCTION public.sync_survey_session_road_snapshot() SET search_path = '';
