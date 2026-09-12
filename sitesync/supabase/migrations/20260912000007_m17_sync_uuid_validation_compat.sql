-- M1.7 compatibility correction.
-- PostgreSQL UUID accepts any 128-bit hexadecimal UUID representation; it does
-- not require RFC version/variant bits. The sync envelope already has UUID-typed
-- parameters, so payload assignment validation must validate UUID syntax without
-- imposing RFC version/variant semantics that the existing SITE-SYNC identifiers
-- do not require.
DO $$
DECLARE
    fn text;
    old_pattern text := '''^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$''';
    new_pattern text := '''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''';
BEGIN
    SELECT pg_get_functiondef(p.oid)
      INTO fn
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname = 'sync_attendance_command'
       AND pg_get_function_identity_arguments(p.oid) = 'command_id uuid, device_installation_id uuid, project_id uuid, person_id uuid, work_date_utc date, base_revision bigint, command_type text, payload jsonb';

    IF fn IS NULL THEN
        RAISE EXCEPTION 'sync_attendance_command function not found';
    END IF;

    IF position(old_pattern IN fn) = 0 THEN
        RAISE EXCEPTION 'expected UUID validation pattern not found in sync_attendance_command';
    END IF;

    EXECUTE replace(fn, old_pattern, new_pattern);
END;
$$;

ALTER FUNCTION public.sync_attendance_command(
    UUID, UUID, UUID, UUID, DATE, BIGINT, TEXT, JSONB
) SET plpgsql.variable_conflict = 'use_variable';
