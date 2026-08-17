# M1.4 Identity, Device Registration, and Project Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete M1.4 by adding the authenticated device-registration lifecycle and authoritative application/project context on top of the existing AuthService, IdentityService, local persistence, and Supabase RLS boundary.

**Architecture:** AuthService owns authentication/session state. IdentityService resolves the authoritative user/person/organisation/membership/project-assignment graph. DeviceRegistrationService owns the authenticated user's device installation lifecycle, while ApplicationContext composes identity, active project assignments, and device state without accepting client-supplied tenant scope.

**Tech Stack:** TypeScript, Supabase JS, SQLite local persistence, Jest, ESLint.

## Global Constraints

- Do not modify unrelated local persistence behavior.
- Do not introduce placeholder/fake production data.
- Do not weaken existing RLS policies to make client tests pass.
- Do not add deletion for device installations; revocation remains the lifecycle operation.
- Client-supplied organisation/project identifiers are never authoritative.
- Missing active project assignments produce no project access.
- Supabase query failures remain visible through typed service errors.
- Do not merge M1.4 until the configured Supabase test-project verification gate passes.

---

### Task 1: Implement device registration lifecycle

**Files:**
- Create: `sitesync/src/identity/deviceRegistrationService.ts`
- Create: `sitesync/__tests__/deviceRegistrationService.test.ts`
- Reference: `sitesync/src/database/localPersistence.ts`
- Reference: `supabase/migrations/20260817000001_init_device_installations.sql`
- Reference: `supabase/migrations/20260817000002_m14_identity_grants.sql`

**Interfaces:**
- Consumes authenticated user identity plus the existing local device-session persistence boundary.
- Produces typed registration, retrieval, and revocation operations.

- [ ] Write failing tests for authenticated ownership, idempotent registration, ACTIVE/REVOKED lifecycle, optimistic revision mismatch, and cross-user rejection.
- [ ] Run `npx jest __tests__/deviceRegistrationService.test.ts --runInBand --no-cache` and confirm failure.
- [ ] Implement the minimal service using existing persistence and Supabase boundaries; never accept caller-supplied tenant ownership as authority and never expose delete.
- [ ] Re-run the focused suite and confirm PASS.
- [ ] Commit with `feat(m1.4): add device registration service`.

### Task 2: Implement authoritative application/project context

**Files:**
- Create: `sitesync/src/identity/projectContext.ts`
- Create: `sitesync/__tests__/projectContext.test.ts`
- Reference: `sitesync/src/identity/identityService.ts`
- Reference: `sitesync/src/identity/deviceRegistrationService.ts`

**Interfaces:**
- Consumes the resolved authoritative identity and device-registration state.
- Produces one application-facing context containing user, person, organisation, memberships, active project assignments, and device state.

- [ ] Write failing tests for context composition, no-project-access-without-assignment, authenticated device ownership, revoked-device representation, and propagation of identity errors.
- [ ] Run `npx jest __tests__/projectContext.test.ts --runInBand --no-cache` and confirm failure.
- [ ] Implement context composition without duplicating tenant/project queries or inventing scope.
- [ ] Re-run the focused suite and confirm PASS.
- [ ] Commit with `feat(m1.4): compose authoritative application context`.

### Task 3: Full client verification

**Files:**
- Test: existing M1.4 auth, identity, local-persistence tests plus the new device/context tests.

- [ ] Run `npm run lint`.
- [ ] Run `npm test -- --runInBand --no-cache`.
- [ ] Run `git diff --check`.
- [ ] Confirm no unrelated persistence changes were introduced.
- [ ] Fix only failures attributable to M1.4 and commit the verification correction.

### Task 4: Supabase security verification gate

**Files:**
- Reference: `supabase/migrations/20260817000000_m14_identity_rls.sql`
- Reference: `supabase/migrations/20260817000001_init_device_installations.sql`
- Reference: `supabase/migrations/20260817000002_m14_identity_grants.sql`
- Reference: `supabase/tests/README.md`
- Reference: `supabase/tests/m14_rls.sql`

- [ ] Verify the configured SITE-SYNC test Supabase project.
- [ ] Execute the M1.4 migrations/verification suite against that project.
- [ ] Confirm Org A cannot access Org B data.
- [ ] Confirm device installation access is limited to the authenticated user.
- [ ] Confirm insert/update are constrained to the authenticated user and deletion is not granted.
- [ ] Confirm revoked devices remain auditable and anonymous access remains denied.
- [ ] Confirm SECURITY DEFINER helpers do not recurse through RLS.
- [ ] Record the exact gate result before merge.

### Task 5: Final audit and PR readiness

**Files:**
- PR #2
- `docs/superpowers/specs/2026-08-17-m14-identity-device-context-design.md`

- [ ] Run `npm run lint`, `npm test -- --runInBand --no-cache`, `git diff --check`, and `git status`.
- [ ] Confirm PR scope is limited to M1.4 identity, device registration, project context, tests, and required RLS verification.
- [ ] Update PR #2 with final verification evidence.
- [ ] Mark PR ready only after all gates pass.
- [ ] Do not merge until the Supabase verification gate is green.
