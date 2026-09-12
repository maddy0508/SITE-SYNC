-- PostgreSQL recommends explicitly placing pg_temp last for SECURITY DEFINER functions.
-- All authoritative references are already schema-qualified; this closes the remaining
-- search_path hardening gap.
ALTER FUNCTION public.sitesync_sync_authorized(UUID, UUID, UUID)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.sync_attendance_command(UUID, UUID, UUID, UUID, DATE, BIGINT, TEXT, JSONB)
  SET search_path = public, pg_temp;

-- Client event IDs are identity-bearing evidence and must not be reused across accepted commands.
CREATE UNIQUE INDEX sitesync_attendance_event_event_id_uidx
  ON public.sitesync_attendance_event (event_id);
