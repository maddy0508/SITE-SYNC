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
- Reference: `sitesync/supabase/migrations/20260815000001_init_device_installations.sql`
- Reference: `sitesync/supabase/migrations/20260817000002_m14_identity_grants.sql`

**Interfaces:**
- Consumes authenticated user identity plus the existing local device-session persistence boundary.
- Produces typed registration, retrieval, and revocation operations.

- [x] Write failing tests for authenticated ownership, idempotent registration, ACTIVE/REVOKED lifecycle, optimistic revision mismatch, and cross-user rejection.
- [x] Run the focused device-registration suite and confirm failure before implementation.
- [x] Implement the minimal service using existing persistence and Supabase boundaries; never accept caller-supplied tenant ownership as authority and never expose delete.
- [x] Re-run the focused suite and confirm PASS.
- [x] Commit implementation with `feat(m1.4): add device registration service`.

### Task 2: Implement authoritative application/project context

**Files:**
- Create: `sitesync/src/identity/projectContext.ts`
- Create: `sitesync/__tests__/projectContext.test.ts`
- Reference: `sitesync/src/identity/identityService.ts`
- Reference: `sitesync/src/identity/deviceRegistrationService.ts`

**Interfaces:**
- Consumes the resolved authoritative identity and device-registration state.
- Produces one application-facing context containing user, person, organisation, memberships, active project assignments, and device state.

- [x] Write failing tests for context composition, no-project-access-without-assignment, authenticated device ownership, revoked-device representation, and propagation of identity errors.
- [x] Run the focused project-context suite and confirm failure before implementation.
- [x] Implement context composition without duplicating tenant/project queries or inventing scope.
- [x] Re-run the focused suite and confirm PASS.
- [x] Commit implementation with `feat(m1.4): compose authoritative application context`.

### Task 3: Full client verification

**Files:**
- Test: existing M1.4 auth, identity, local-persistence tests plus the new device/context tests.

- [x] Run `npm run lint`.
- [x] Run `npm test -- --runInBand --no-cache`.
- [x] Run `git diff --check`.
- [x] Confirm no unrelated persistence changes were introduced.
- [x] Fix only failures attributable to M1.4 and commit verification corrections where required.

**Result:** PASS — 5 Jest suites, 37 tests; ESLint PASS; `git diff --check` PASS.

### Task 4: Supabase security verification gate

**Files:**
- Reference: `sitesync/supabase/migrations/20260817000000_m14_identity_rls.sql`
- Reference: `sitesync/supabase/migrations/20260815000001_init_device_installations.sql`
- Reference: `sitesync/supabase/migrations/20260817000002_m14_identity_grants.sql`
- Reference: `sitesync/supabase/tests/README.md`

- [x] Verify the configured SITE-SYNC test Supabase project.
- [x] Verify the deployed M1.4 RLS/grant state against that project.
- [x] Confirm Org A cannot access Org B data.
- [x] Confirm device installation access is limited to the authenticated user.
- [x] Confirm insert/update are constrained to the authenticated user and deletion is not granted.
- [x] Confirm revoked devices remain readable for audit.
- [x] Confirm anonymous access remains denied.
- [x] Confirm SECURITY DEFINER helpers use a fixed `search_path` and the tested RLS paths do not recurse.
- [x] Record the exact gate result before merge.

**Result:** PASS. Tenant isolation, device ownership, cross-user update blocking, revoked-device audit visibility, anonymous denial, and no-delete privilege were verified directly against the configured SITE-SYNC Supabase project. The three intentional SECURITY DEFINER helpers use `search_path = public`. Supabase Security Advisor still reports the intentional authenticated execution of those helpers as warnings, plus the pre-existing leaked-password-protection warning; neither is an M1.4 functional gate failure.

### Task 5: Final audit and PR readiness

**Files:**
- PR #2
- `docs/superpowers/specs/2026-08-17-m14-identity-device-context-design.md`

- [x] Run `npm run lint`, `npm test -- --runInBand --no-cache`, `git diff --check`, and repository-state verification.
- [x] Confirm PR scope is limited to M1.4 identity, device registration, project context, tests, and required RLS verification.
- [x] Update PR #2 with final verification evidence.
- [x] Mark PR ready only after all gates pass.
- [x] Do not merge until the final review/approval gate is satisfied.

**Current PR state:** PR #2 is open, mergeable, and marked ready for review. It is **not merged**. Final review/approval remains the merge gate.
