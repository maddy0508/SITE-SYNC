-- M1.7 compatibility hardening.
-- The existing RPC intentionally uses input parameter names that overlap with
-- relation column names. Force PL/pgSQL's documented variable-precedence for
-- this function so expressions such as pa.project_id = project_id resolve to
-- the RPC input rather than becoming ambiguous under the default error policy.
ALTER FUNCTION public.sync_attendance_command(
    UUID, UUID, UUID, UUID, DATE, BIGINT, TEXT, JSONB
) SET plpgsql.variable_conflict = 'use_variable';
