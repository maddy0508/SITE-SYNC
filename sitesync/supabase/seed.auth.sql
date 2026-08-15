-- ==========================================
-- Phase 2 local auth fixtures
--
-- The main seed creates deterministic auth.users rows directly so public
-- fixtures can reference stable auth user IDs. GoTrue requires the
-- string-valued token columns to be non-NULL and email/password users need
-- a complete email identity. For email identities, provider_id is the
-- auth.users UUID, not the email address.
-- ==========================================

UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  recovery_token = COALESCE(recovery_token, '')
WHERE id IN (
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111112',
  '11111111-1111-4111-8111-111111111113',
  '11111111-1111-4111-8111-111111111121',
  '11111111-1111-4111-8111-111111111122',
  '11111111-1111-4111-8111-111111111123'
);

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  ('88888888-8888-4888-8888-888888888881', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', '{"sub":"11111111-1111-4111-8111-111111111111","email":"supervisor@sitesync.test"}', 'email', NULL, NOW(), NOW()),
  ('88888888-8888-4888-8888-888888888882', '11111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111112', '{"sub":"11111111-1111-4111-8111-111111111112","email":"worker@sitesync.test"}', 'email', NULL, NOW(), NOW()),
  ('88888888-8888-4888-8888-888888888883', '11111111-1111-4111-8111-111111111113', '11111111-1111-4111-8111-111111111113', '{"sub":"11111111-1111-4111-8111-111111111113","email":"worker-b@sitesync.test"}', 'email', NULL, NOW(), NOW()),
  ('88888888-8888-4888-8888-888888888884', '11111111-1111-4111-8111-111111111121', '11111111-1111-4111-8111-111111111121', '{"sub":"11111111-1111-4111-8111-111111111121","email":"worker-a2@sitesync.test"}', 'email', NULL, NOW(), NOW()),
  ('88888888-8888-4888-8888-888888888885', '11111111-1111-4111-8111-111111111122', '11111111-1111-4111-8111-111111111122', '{"sub":"11111111-1111-4111-8111-111111111122","email":"admin-a@sitesync.test"}', 'email', NULL, NOW(), NOW()),
  ('88888888-8888-4888-8888-888888888886', '11111111-1111-4111-8111-111111111123', '11111111-1111-4111-8111-111111111123', '{"sub":"11111111-1111-4111-8111-111111111123","email":"supervisor-b@sitesync.test"}', 'email', NULL, NOW(), NOW());
