-- ==========================================
-- ORG A (Primary Test Tenant)
-- ==========================================
INSERT INTO public.organisations (id, name) VALUES 
  ('00000000-0000-4000-8000-000000000001', 'Organisation A');

INSERT INTO public.companies (id, organisation_id, name) VALUES 
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Company A');

INSERT INTO public.persons (id, organisation_id, display_name) VALUES 
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'Alice Supervisor'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'Bob Worker');

INSERT INTO public.projects (id, organisation_id, name) VALUES 
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000001', 'Project A Solar Farm');

INSERT INTO public.company_memberships (id, organisation_id, company_id, person_id, status) VALUES 
  ('22222222-2222-4222-8222-222222222221', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000011', 'ACTIVE'),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000012', 'ACTIVE');

INSERT INTO public.project_company_participation (organisation_id, project_id, company_id, status) VALUES 
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', 'ACTIVE');

INSERT INTO public.project_assignments (id, organisation_id, project_id, company_id, company_membership_id, person_id, project_role, status) VALUES 
  ('33333333-3333-4333-8333-333333333331', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', '22222222-2222-4222-8222-222222222221', '00000000-0000-4000-8000-000000000011', 'SUPERVISOR', 'ACTIVE'),
  ('33333333-3333-4333-8333-333333333332', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', '22222222-2222-4222-8222-222222222222', '00000000-0000-4000-8000-000000000012', 'WORKER', 'ACTIVE');

-- ==========================================
-- ORG B (Isolation Test Target)
-- ==========================================
INSERT INTO public.organisations (id, name) VALUES 
  ('00000000-0000-4000-8000-000000000101', 'Organisation B');

INSERT INTO public.companies (id, organisation_id, name) VALUES 
  ('00000000-0000-4000-8000-000000000110', '00000000-0000-4000-8000-000000000101', 'Company B');

INSERT INTO public.persons (id, organisation_id, display_name) VALUES 
  ('00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000101', 'Charlie Worker');

INSERT INTO public.projects (id, organisation_id, name) VALUES 
  ('00000000-0000-4000-8000-000000000120', '00000000-0000-4000-8000-000000000101', 'Project B Wind Farm');

INSERT INTO public.company_memberships (id, organisation_id, company_id, person_id, status) VALUES 
  ('22222222-2222-4222-8222-222222222223', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000110', '00000000-0000-4000-8000-000000000111', 'ACTIVE');

INSERT INTO public.project_company_participation (organisation_id, project_id, company_id, status) VALUES 
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000120', '00000000-0000-4000-8000-000000000110', 'ACTIVE');

INSERT INTO public.project_assignments (id, organisation_id, project_id, company_id, company_membership_id, person_id, project_role, status) VALUES 
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000120', '00000000-0000-4000-8000-000000000110', '22222222-2222-4222-8222-222222222223', '00000000-0000-4000-8000-000000000111', 'WORKER', 'ACTIVE');

-- ==========================================
-- AUTH USERS (Mocked for local dev linking)
-- ==========================================
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES 
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'supervisor@sitesync.test', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('11111111-1111-4111-8111-111111111112', '00000000-0000-0000-0000-000000000000', 'worker@sitesync.test', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('11111111-1111-4111-8111-111111111113', '00000000-0000-0000-0000-000000000000', 'worker-b@sitesync.test', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated');

-- ==========================================
-- USER PROFILES (Linking Auth to Persons)
-- ==========================================
INSERT INTO public.user_profiles (user_id, organisation_id, person_id) VALUES 
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011'),
  ('11111111-1111-4111-8111-111111111112', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012'),
  ('11111111-1111-4111-8111-111111111113', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000111');
