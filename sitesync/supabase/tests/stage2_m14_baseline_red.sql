-- Stage-2 baseline RED for M1.4.
-- This test intentionally fails against the current unfixed authorization semantic:
-- an ACTIVE project assignment remains visible when its linked membership is INACTIVE.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('51111111-1111-1111-1111-111111111111', 'stage2-supervisor@test.invalid')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organisations (id, name) VALUES
  ('cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Stage-2 RED Org')
ON CONFLICT DO NOTHING;

INSERT INTO public.companies (id, organisation_id, name) VALUES
  ('cbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Stage-2 Company')
ON CONFLICT DO NOTHING;

INSERT INTO public.persons (id, organisation_id, display_name) VALUES
  ('cbbbbbbb-bbbb-bbbb-bbbb-100000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Stage-2 Supervisor'),
  ('cbbbbbbb-bbbb-bbbb-bbbb-100000000002', 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Stage-2 Worker')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_profiles (user_id, organisation_id, person_id) VALUES
  ('51111111-1111-1111-1111-111111111111', 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cbbbbbbb-bbbb-bbbb-bbbb-100000000001')
ON CONFLICT DO NOTHING;

INSERT INTO public.company_memberships (id, organisation_id, company_id, person_id, status) VALUES
  ('cbbbbbbb-bbbb-bbbb-bbbb-200000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-100000000001', 'ACTIVE'),
  ('cbbbbbbb-bbbb-bbbb-bbbb-200000000002', 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-100000000002', 'INACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO public.projects (id, organisation_id, name) VALUES
  ('cbbbbbbb-bbbb-bbbb-bbbb-300000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Stage-2 RED Project')
ON CONFLICT DO NOTHING;

INSERT INTO public.project_company_participation (organisation_id, project_id, company_id, status) VALUES
  ('cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cbbbbbbb-bbbb-bbbb-bbbb-300000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO public.project_assignments (id, organisation_id, project_id, company_id, company_membership_id, person_id, project_role, status) VALUES
  ('cbbbbbbb-bbbb-bbbb-bbbb-400000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-200000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-100000000001', 'SUPERVISOR', 'ACTIVE'),
  ('cbbbbbbb-bbbb-bbbb-bbbb-400000000002', 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cbbbbbbb-bbbb-bbbb-bbbb-300000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'cbbbbbbb-bbbb-bbbb-bbbb-200000000002', 'cbbbbbbb-bbbb-bbbb-bbbb-100000000002', 'WORKER', 'ACTIVE')
ON CONFLICT DO NOTHING;

GRANT SELECT ON public.project_assignments TO authenticated;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT ON public.project_company_participation TO authenticated;
GRANT SELECT ON public.persons TO authenticated;
GRANT SELECT ON public.company_memberships TO authenticated;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '51111111-1111-1111-1111-111111111111';

\echo 'STAGE2_RED_CASE=inactive_membership_active_assignment'
\echo 'STAGE2_RED_EXPECTED=target_assignment_not_visible'

SELECT
  count(*) AS visible_target_assignment_count
FROM public.project_assignments
WHERE id = 'cbbbbbbb-bbbb-bbbb-bbbb-400000000002';

SELECT
  CASE
    WHEN count(*) = 0 THEN 'PASS'
    ELSE 'RED'
  END AS inactive_membership_denied
FROM public.project_assignments
WHERE id = 'cbbbbbbb-bbbb-bbbb-bbbb-400000000002';

DO $$
DECLARE
  visible_count integer;
BEGIN
  SELECT count(*) INTO visible_count
  FROM public.project_assignments
  WHERE id = 'cbbbbbbb-bbbb-bbbb-bbbb-400000000002';

  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'STAGE2_RED: inactive-membership assignment is visible (% row)', visible_count;
  END IF;
END
$$;

RESET ROLE;
ROLLBACK;
