-- M1.7 adversarial server-boundary acceptance tests.
-- Requires the identity/device migrations followed by all M1.7 migrations.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
 ('31111111-1111-1111-1111-111111111111', 'supervisor@test.invalid'),
 ('32222222-2222-2222-2222-222222222222', 'target@test.invalid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.organisations (id, name) VALUES
 ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Adversarial Org') ON CONFLICT DO NOTHING;
INSERT INTO public.companies (id, organisation_id, name) VALUES
 ('caaaaaaa-aaaa-aaaa-aaaa-000000000001','caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Company A'),
 ('caaaaaaa-aaaa-aaaa-aaaa-000000000002','caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Company B') ON CONFLICT DO NOTHING;
INSERT INTO public.persons (id, organisation_id, display_name) VALUES
 ('caaaaaaa-aaaa-aaaa-aaaa-100000000001','caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Supervisor'),
 ('caaaaaaa-aaaa-aaaa-aaaa-100000000002','caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Worker') ON CONFLICT DO NOTHING;
INSERT INTO public.user_profiles (user_id, organisation_id, person_id) VALUES
 ('31111111-1111-1111-1111-111111111111','caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','caaaaaaa-aaaa-aaaa-aaaa-100000000001'),
 ('32222222-2222-2222-2222-222222222222','caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','caaaaaaa-aaaa-aaaa-aaaa-100000000002') ON CONFLICT DO NOTHING;
INSERT INTO public.company_memberships (id, organisation_id, company_id, person_id, status) VALUES
 ('caaaaaaa-aaaa-aaaa-aaaa-200000000001','caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','caaaaaaa-aaaa-aaaa-aaaa-000000000001','caaaaaaa-aaaa-aaaa-aaaa-100000000001','ACTIVE'),
 ('caaaaaaa-aaaa-aaaa-aaaa-200000000002','caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','caaaaaaa-aaaa-aaaa-aaaa-000000000002','caaaaaaa-aaaa-aaaa-aaaa-100000000002','ACTIVE') ON CONFLICT DO NOTHING;
INSERT INTO public.projects (id, organisation_id, name) VALUES
 ('caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Project') ON CONFLICT DO NOTHING;
INSERT INTO public.project_company_participation (organisation_id, project_id, company_id, status) VALUES
 ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-000000000001','ACTIVE'),
 ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-000000000002','ACTIVE') ON CONFLICT DO NOTHING;
INSERT INTO public.project_assignments (id, organisation_id, project_id, company_id, company_membership_id, person_id, project_role, status) VALUES
 ('caaaaaaa-aaaa-aaaa-aaaa-400000000001','caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-000000000001','caaaaaaa-aaaa-aaaa-aaaa-200000000001','caaaaaaa-aaaa-aaaa-aaaa-100000000001','SUPERVISOR','ACTIVE'),
 ('caaaaaaa-aaaa-aaaa-aaaa-400000000002','caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-000000000002','caaaaaaa-aaaa-aaaa-aaaa-200000000002','caaaaaaa-aaaa-aaaa-aaaa-100000000002','WORKER','ACTIVE') ON CONFLICT DO NOTHING;
INSERT INTO public.device_installations (id, user_id, installation_key, status) VALUES
 ('caaaaaaa-aaaa-aaaa-aaaa-500000000001','31111111-1111-1111-1111-111111111111','adv-device','ACTIVE') ON CONFLICT DO NOTHING;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '31111111-1111-1111-1111-111111111111';

-- SELF cannot target another company/person aggregate; the hardened authorization
-- boundary rejects the request before target-specific mutation logic is reached.
SELECT (sync_attendance_command(
 'caaaaaaa-aaaa-aaaa-aaaa-600000000001','caaaaaaa-aaaa-aaaa-aaaa-500000000001','caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-100000000002',DATE '2026-09-14',0,'CHECK_IN',
 '{"commandId":"caaaaaaa-aaaa-aaaa-aaaa-600000000001","eventId":"caaaaaaa-aaaa-aaaa-aaaa-700000000001","projectId":"caaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"caaaaaaa-aaaa-aaaa-aaaa-100000000002","workDateUtc":"2026-09-14","commandType":"CHECK_IN","projectAssignmentId":"caaaaaaa-aaaa-aaaa-aaaa-400000000002","clientOccurredAt":"2026-09-14T09:00:00Z","source":"SELF"}'::jsonb)->>'code') = 'NOT_AUTHORIZED' AS self_target_blocked;

-- QR cross-company targeting is forbidden by the same relational authorization boundary.
SELECT (sync_attendance_command(
 'caaaaaaa-aaaa-aaaa-aaaa-600000000002','caaaaaaa-aaaa-aaaa-aaaa-500000000001','caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-100000000002',DATE '2026-09-14',0,'CHECK_IN',
 '{"commandId":"caaaaaaa-aaaa-aaaa-aaaa-600000000002","eventId":"caaaaaaa-aaaa-aaaa-aaaa-700000000002","projectId":"caaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"caaaaaaa-aaaa-aaaa-aaaa-100000000002","workDateUtc":"2026-09-14","commandType":"CHECK_IN","projectAssignmentId":"caaaaaaa-aaaa-aaaa-aaaa-400000000002","clientOccurredAt":"2026-09-14T09:00:00Z","source":"QR"}'::jsonb)->>'code') = 'NOT_AUTHORIZED' AS cross_company_blocked;

-- A malformed assignment must be a permanent validation result, not a raw UUID exception.
SELECT (sync_attendance_command(
 'caaaaaaa-aaaa-aaaa-aaaa-600000000003','caaaaaaa-aaaa-aaaa-aaaa-500000000001','caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-100000000001',DATE '2026-09-14',0,'CHECK_IN',
 '{"commandId":"caaaaaaa-aaaa-aaaa-aaaa-600000000003","eventId":"caaaaaaa-aaaa-aaaa-aaaa-700000000003","projectId":"caaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"caaaaaaa-aaaa-aaaa-aaaa-100000000001","workDateUtc":"2026-09-14","commandType":"CHECK_IN","projectAssignmentId":"not-a-uuid","clientOccurredAt":"2026-09-14T09:00:00Z","source":"SELF"}'::jsonb)->>'code') = 'INVALID_ASSIGNMENT' AS malformed_assignment_rejected;

-- Missing event identity and work-date/timestamp mismatch are validation failures.
SELECT (sync_attendance_command(
 'caaaaaaa-aaaa-aaaa-aaaa-600000000004','caaaaaaa-aaaa-aaaa-aaaa-500000000001','caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-100000000001',DATE '2026-09-14',0,'CHECK_IN',
 '{"commandId":"caaaaaaa-aaaa-aaaa-aaaa-600000000004","projectId":"caaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"caaaaaaa-aaaa-aaaa-aaaa-100000000001","workDateUtc":"2026-09-14","commandType":"CHECK_IN","projectAssignmentId":"caaaaaaa-aaaa-aaaa-aaaa-400000000001","clientOccurredAt":"2026-09-14T09:00:00Z","source":"SELF"}'::jsonb)->>'code') = 'INVALID_PAYLOAD' AS missing_event_rejected;
SELECT (sync_attendance_command(
 'caaaaaaa-aaaa-aaaa-aaaa-600000000005','caaaaaaa-aaaa-aaaa-aaaa-500000000001','caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-100000000001',DATE '2026-09-14',0,'CHECK_IN',
 '{"commandId":"caaaaaaa-aaaa-aaaa-aaaa-600000000005","eventId":"caaaaaaa-aaaa-aaaa-aaaa-700000000005","projectId":"caaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"caaaaaaa-aaaa-aaaa-aaaa-100000000001","workDateUtc":"2026-09-14","commandType":"CHECK_IN","projectAssignmentId":"caaaaaaa-aaaa-aaaa-aaaa-400000000001","clientOccurredAt":"2026-09-15T09:00:00Z","source":"SELF"}'::jsonb)->>'code') = 'WORK_DATE_MISMATCH' AS work_date_mismatch_rejected;

-- Initial CHECK_OUT cannot create an empty aggregate.
SELECT (sync_attendance_command(
 'caaaaaaa-aaaa-aaaa-aaaa-600000000006','caaaaaaa-aaaa-aaaa-aaaa-500000000001','caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-100000000001',DATE '2026-09-14',0,'CHECK_OUT',
 '{"commandId":"caaaaaaa-aaaa-aaaa-aaaa-600000000006","eventId":"caaaaaaa-aaaa-aaaa-aaaa-700000000006","projectId":"caaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"caaaaaaa-aaaa-aaaa-aaaa-100000000001","workDateUtc":"2026-09-14","commandType":"CHECK_OUT","projectAssignmentId":"caaaaaaa-aaaa-aaaa-aaaa-400000000001","clientOccurredAt":"2026-09-14T09:00:00Z","source":"SELF"}'::jsonb)->>'code') = 'INVALID_STATE_TRANSITION' AS initial_checkout_rejected;
RESET ROLE;
SELECT count(*) = 0 AS rejected_checkout_did_not_create_aggregate FROM public.sitesync_attendance_day WHERE project_id='caaaaaaa-aaaa-aaaa-aaaa-300000000001' AND person_id='caaaaaaa-aaaa-aaaa-aaaa-100000000001' AND work_date_utc='2026-09-14';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '31111111-1111-1111-1111-111111111111';

-- Create a valid check-in, then reject a predated check-out.
SELECT (sync_attendance_command(
 'caaaaaaa-aaaa-aaaa-aaaa-600000000007','caaaaaaa-aaaa-aaaa-aaaa-500000000001','caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-100000000001',DATE '2026-09-14',0,'CHECK_IN',
 '{"commandId":"caaaaaaa-aaaa-aaaa-aaaa-600000000007","eventId":"caaaaaaa-aaaa-aaaa-aaaa-700000000007","projectId":"caaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"caaaaaaa-aaaa-aaaa-aaaa-100000000001","workDateUtc":"2026-09-14","commandType":"CHECK_IN","projectAssignmentId":"caaaaaaa-aaaa-aaaa-aaaa-400000000001","clientOccurredAt":"2026-09-14T10:00:00Z","source":"SELF"}'::jsonb)->>'status') = 'ACCEPTED' AS valid_checkin;
SELECT (sync_attendance_command(
 'caaaaaaa-aaaa-aaaa-aaaa-600000000008','caaaaaaa-aaaa-aaaa-aaaa-500000000001','caaaaaaa-aaaa-aaaa-aaaa-300000000001','caaaaaaa-aaaa-aaaa-aaaa-100000000001',DATE '2026-09-14',1,'CHECK_OUT',
 '{"commandId":"caaaaaaa-aaaa-aaaa-aaaa-600000000008","eventId":"caaaaaaa-aaaa-aaaa-aaaa-700000000008","projectId":"caaaaaaa-aaaa-aaaa-aaaa-300000000001","personId":"caaaaaaa-aaaa-aaaa-aaaa-100000000001","workDateUtc":"2026-09-14","commandType":"CHECK_OUT","projectAssignmentId":"caaaaaaa-aaaa-aaaa-aaaa-400000000001","clientOccurredAt":"2026-09-14T09:00:00Z","source":"SELF"}'::jsonb)->>'code') = 'INVALID_CHRONOLOGY' AS predated_checkout_rejected;

-- Revocation is monotonic. First verify the authenticated API cannot bypass RLS,
-- then verify the database trigger itself at the owner level.
RESET ROLE;
UPDATE public.device_installations SET status='REVOKED', revoked_at=NOW() WHERE id='caaaaaaa-aaaa-aaaa-aaaa-500000000001';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '31111111-1111-1111-1111-111111111111';
SELECT count(*) = 0 AS revoked_update_blocked_by_rls
FROM public.device_installations
WHERE id='caaaaaaa-aaaa-aaaa-aaaa-500000000001' AND status='ACTIVE';
RESET ROLE;
DO $$
BEGIN
  BEGIN
    UPDATE public.device_installations SET status='ACTIVE' WHERE id='caaaaaaa-aaaa-aaaa-aaaa-500000000001';
    RAISE EXCEPTION 'revoked device was reactivated';
  EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%cannot be reactivated%' THEN RAISE; END IF;
  END;
END $$;

ROLLBACK;
