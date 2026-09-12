-- M1.7 server acceptance suite.
-- The harness must provide Supabase-compatible auth.uid() and the existing SITE-SYNC
-- identity/device migrations before executing this file.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'sitesync_attendance_day' AND c.contype = 'p'
  ) THEN RAISE EXCEPTION 'attendance-day primary key missing'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'sitesync_attendance_day' AND pg_get_constraintdef(c.oid) LIKE '%server_revision >= 0%'
  ) THEN RAISE EXCEPTION 'server revision invariant missing'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'sitesync_sync_command_receipt' AND c.contype = 'p'
  ) THEN RAISE EXCEPTION 'command idempotency key missing'; END IF;
END $$;

INSERT INTO auth.users (id, email) VALUES
 ('11111111-1111-1111-1111-111111111111', 'actor-a@test.invalid'),
 ('22222222-2222-2222-2222-222222222222', 'actor-b@test.invalid')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organisations (id, name) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.companies (id, organisation_id, name) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Company A'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Company B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.persons (id, organisation_id, display_name) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-100000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Worker A'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-100000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Worker B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (user_id, organisation_id, person_id) VALUES
 ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-100000000001'),
 ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-100000000001')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.company_memberships (id, organisation_id, company_id, person_id, status) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-200000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-100000000001', 'ACTIVE'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-200000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-100000000001', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projects (id, organisation_id, name) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-300000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Project A'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-300000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Project B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.project_company_participation (organisation_id, project_id, company_id, status) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-300000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'ACTIVE'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-300000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO public.project_assignments (id, organisation_id, project_id, company_id, company_membership_id, person_id, project_role, status) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-400000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-300000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-200000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-100000000001', 'WORKER', 'ACTIVE'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-400000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-300000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-200000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-100000000001', 'WORKER', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.device_installations (id, user_id, installation_key, status)
VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-500000000001', '11111111-1111-1111-1111-111111111111', 'device-a', 'ACTIVE'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-500000000001', '22222222-2222-2222-2222-222222222222', 'device-b', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Actor A: first command must accept revision 0 and become revision 1.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

SELECT (sync_attendance_command(
 'aaaaaaaa-aaaa-aaaa-aaaa-600000000001',
 'aaaaaaaa-aaaa-aaaa-aaaa-500000000001',
 'aaaaaaaa-aaaa-aaaa-aaaa-300000000001',
 'aaaaaaaa-aaaa-aaaa-aaaa-100000000001',
 DATE '2026-09-12', 0, 'CHECK_IN',
 '{"commandId":"aaaaaaaa-aaaa-aaaa-aaaa-600000000001","eventId":"aaaaaaaa-aaaa-aaaa-aaaa-700000000001","projectId":"aaaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"aaaaaaaa-aaaa-aaaa-aaaa-100000000001","workDateUtc":"2026-09-12","commandType":"CHECK_IN","projectAssignmentId":"aaaaaaaa-aaaa-aaaa-aaaa-400000000001","clientOccurredAt":"2026-09-12T00:00:00.000Z","source":"SELF"}'::jsonb
)->>'status') = 'ACCEPTED' AS accepted_first;

RESET ROLE;

DO $$
DECLARE rev bigint; event_count integer; receipt_count integer;
BEGIN
 SELECT server_revision INTO rev FROM public.sitesync_attendance_day WHERE project_id='aaaaaaaa-aaaa-aaaa-aaaa-300000000001' AND person_id='aaaaaaaa-aaaa-aaaa-aaaa-100000000001' AND work_date_utc='2026-09-12';
 SELECT count(*) INTO event_count FROM public.sitesync_attendance_event WHERE command_id='aaaaaaaa-aaaa-aaaa-aaaa-600000000001';
 SELECT count(*) INTO receipt_count FROM public.sitesync_sync_command_receipt WHERE command_id='aaaaaaaa-aaaa-aaaa-aaaa-600000000001';
 IF rev <> 1 OR event_count <> 1 OR receipt_count <> 1 THEN RAISE EXCEPTION 'accepted command did not atomically create revision/event/receipt'; END IF;
END $$;

-- Duplicate delivery must return DUPLICATE_ACCEPTED without another revision/event.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT (sync_attendance_command(
 'aaaaaaaa-aaaa-aaaa-aaaa-600000000001','aaaaaaaa-aaaa-aaaa-aaaa-500000000001',
 'aaaaaaaa-aaaa-aaaa-aaaa-300000000001','aaaaaaaa-aaaa-aaaa-aaaa-100000000001',DATE '2026-09-12',0,'CHECK_IN',
 '{"commandId":"aaaaaaaa-aaaa-aaaa-aaaa-600000000001","eventId":"aaaaaaaa-aaaa-aaaa-aaaa-700000000001","projectId":"aaaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"aaaaaaaa-aaaa-aaaa-aaaa-100000000001","workDateUtc":"2026-09-12","commandType":"CHECK_IN","projectAssignmentId":"aaaaaaaa-aaaa-aaaa-aaaa-400000000001","clientOccurredAt":"2026-09-12T00:00:00Z","source":"SELF"}'::jsonb
)->>'status') = 'DUPLICATE_ACCEPTED' AS duplicate_idempotent;
RESET ROLE;

-- Stale revision must conflict and leave revision unchanged.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT (sync_attendance_command(
 'aaaaaaaa-aaaa-aaaa-aaaa-600000000002','aaaaaaaa-aaaa-aaaa-aaaa-500000000001',
 'aaaaaaaa-aaaa-aaaa-aaaa-300000000001','aaaaaaaa-aaaa-aaaa-aaaa-100000000001',DATE '2026-09-12',0,'CHECK_OUT',
 '{"commandId":"aaaaaaaa-aaaa-aaaa-aaaa-600000000002","eventId":"aaaaaaaa-aaaa-aaaa-aaaa-700000000002","projectId":"aaaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"aaaaaaaa-aaaa-aaaa-aaaa-100000000001","workDateUtc":"2026-09-12","commandType":"CHECK_OUT","projectAssignmentId":"aaaaaaaa-aaaa-aaaa-aaaa-400000000001","clientOccurredAt":"2026-09-12T08:00:00Z","source":"SELF"}'::jsonb
)->>'status') = 'REVISION_CONFLICT' AS stale_conflict;
RESET ROLE;

-- Correct revision must accept CHECK_OUT and become revision 2.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT (sync_attendance_command(
 'aaaaaaaa-aaaa-aaaa-aaaa-600000000003','aaaaaaaa-aaaa-aaaa-aaaa-500000000001',
 'aaaaaaaa-aaaa-aaaa-aaaa-300000000001','aaaaaaaa-aaaa-aaaa-aaaa-100000000001',DATE '2026-09-12',1,'CHECK_OUT',
 '{"commandId":"aaaaaaaa-aaaa-aaaa-aaaa-600000000003","eventId":"aaaaaaaa-aaaa-aaaa-aaaa-700000000003","projectId":"aaaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"aaaaaaaa-aaaa-aaaa-aaaa-100000000001","workDateUtc":"2026-09-12","commandType":"CHECK_OUT","projectAssignmentId":"aaaaaaaa-aaaa-aaaa-aaaa-400000000001","clientOccurredAt":"2026-09-12T08:00:00Z","source":"SELF"}'::jsonb
)->>'status') = 'ACCEPTED' AS accepted_checkout;
RESET ROLE;

-- Cross-user device must not authorize actor A.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT (sync_attendance_command(
 'aaaaaaaa-aaaa-aaaa-aaaa-600000000004','bbbbbbbb-bbbb-bbbb-bbbb-500000000001',
 'aaaaaaaa-aaaa-aaaa-aaaa-300000000001','aaaaaaaa-aaaa-aaaa-aaaa-100000000001',DATE '2026-09-12',2,'CHECK_IN',
 '{"commandId":"aaaaaaaa-aaaa-aaaa-aaaa-600000000004","eventId":"aaaaaaaa-aaaa-aaaa-aaaa-700000000004","projectId":"aaaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"aaaaaaaa-aaaa-aaaa-aaaa-100000000001","workDateUtc":"2026-09-12","commandType":"CHECK_IN","projectAssignmentId":"aaaaaaaa-aaaa-aaaa-aaaa-400000000001","clientOccurredAt":"2026-09-12T09:00:00Z","source":"SELF"}'::jsonb
)->>'status') = 'AUTHORIZATION_REJECTED' AS cross_user_device_rejected;
RESET ROLE;

UPDATE public.device_installations SET status='REVOKED', revoked_at=NOW() WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-500000000001';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT (sync_attendance_command(
 'aaaaaaaa-aaaa-aaaa-aaaa-600000000005','aaaaaaaa-aaaa-aaaa-aaaa-500000000001',
 'aaaaaaaa-aaaa-aaaa-aaaa-300000000001','aaaaaaaa-aaaa-aaaa-aaaa-100000000001',DATE '2026-09-12',2,'CHECK_IN',
 '{"commandId":"aaaaaaaa-aaaa-aaaa-aaaa-600000000005","eventId":"aaaaaaaa-aaaa-aaaa-aaaa-700000000005","projectId":"aaaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"aaaaaaaa-aaaa-aaaa-aaaa-100000000001","workDateUtc":"2026-09-12","commandType":"CHECK_IN","projectAssignmentId":"aaaaaaaa-aaaa-aaaa-aaaa-400000000001","clientOccurredAt":"2026-09-12T09:00:00Z","source":"SELF"}'::jsonb
)->>'status') = 'DEVICE_REVOKED' AS revoked_device_rejected;
RESET ROLE;

DO $$
DECLARE rev bigint; events integer; receipts integer;
BEGIN
 SELECT server_revision INTO rev FROM public.sitesync_attendance_day WHERE project_id='aaaaaaaa-aaaa-aaaa-aaaa-300000000001' AND person_id='aaaaaaaa-aaaa-aaaa-aaaa-100000000001' AND work_date_utc='2026-09-12';
 SELECT count(*) INTO events FROM public.sitesync_attendance_event WHERE project_id='aaaaaaaa-aaaa-aaaa-aaaa-300000000001' AND person_id='aaaaaaaa-aaaa-aaaa-aaaa-100000000001' AND work_date_utc='2026-09-12';
 SELECT count(*) INTO receipts FROM public.sitesync_sync_command_receipt WHERE project_id='aaaaaaaa-aaaa-aaaa-aaaa-300000000001' AND person_id='aaaaaaaa-aaaa-aaaa-aaaa-100000000001' AND work_date_utc='2026-09-12';
 IF rev <> 2 OR events <> 2 OR receipts <> 2 THEN RAISE EXCEPTION 'revision/event/receipt counts are incorrect'; END IF;
END $$;

ROLLBACK;
