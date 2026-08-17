# M1.4 Identity, Device Registration, and Project Context Design

## Goal
Establish the authoritative authenticated identity and tenant/project context used by SITE-SYNC before client identity-dependent features are implemented.

## Scope
- Resolve the authenticated Supabase user to the authoritative `user_profiles` record.
- Resolve the associated person and organisation without trusting client-supplied tenant identifiers.
- Resolve active company memberships and active project assignments.
- Register and manage the authenticated user's device installation through the existing `device_installations` server boundary.
- Expose a single authoritative application context rather than duplicating identity/tenant queries across UI code.
- Preserve tenant isolation and the device audit trail.

## Out of Scope
- Auth UI redesign.
- QR attendance.
- Sync engine implementation.
- Reporting.
- Device deletion; revocation is the lifecycle operation.
- Unrelated persistence refactors.

## Architecture

### Authentication
`AuthService` owns the Supabase authentication boundary: session retrieval/restoration, password sign-in, and sign-out. Authentication errors remain typed and are not converted into application identity data.

### Identity
`IdentityService` resolves the authoritative identity chain:

`Supabase session/user id -> user_profiles -> person + organisation -> active company memberships -> active project assignments`.

Every downstream relationship is checked against the authenticated organisation/person. Cross-tenant data is rejected rather than repaired or inferred.

### Device registration
A dedicated device-registration service owns the application lifecycle for `device_installations`. The authenticated user's identity is the source of `user_id`; callers cannot select another user's installation. Registration/update uses the existing RLS boundary. There is no delete operation; revocation remains an auditable state transition.

### Application context
The client consumes an authoritative context containing the authenticated user, organisation, person, memberships, project assignments, and current device installation state. UI/features do not independently invent organisation or project scope.

## Data Flow

1. Supabase restores/authenticates a session.
2. `AuthService` returns the authenticated session.
3. `IdentityService` resolves the authoritative identity graph from the authenticated user id.
4. Project context is derived only from active assignments.
5. Device registration resolves/creates the current user's installation and preserves its lifecycle state.
6. Feature code consumes the resulting context.

## Security Boundary
The M1.4 migrations establish RLS policies around `auth.uid()`, `user_profiles`, organisation membership, project assignments, and `device_installations`. Helper functions use `SECURITY DEFINER` with a fixed `search_path` to avoid recursive policy evaluation. No client-supplied organisation/project id is treated as authoritative.

## Error Handling
- Missing session: typed `NO_SESSION` authentication error.
- Authentication failure: typed `AUTH_FAILED` error.
- Missing authoritative profile/person/organisation: typed identity-resolution error.
- Missing active assignment: return no project access; do not invent access.
- Cross-tenant mismatch: typed `CROSS_TENANT_DATA` error.
- Device ownership or lifecycle violations: typed device-registration error.
- Supabase query failures remain visible through typed service errors.

## Testing
Unit tests must cover:
- existing-session restoration;
- missing-session rejection;
- successful sign-in and typed authentication failure;
- authoritative identity-chain resolution;
- missing profile;
- cross-tenant person data;
- absence of active project assignments;
- Supabase identity query failure;
- device registration ownership;
- device lifecycle/revocation;
- rejection of cross-user device access;
- project-context derivation from active assignments.

Verification commands:

```bash
npm run lint
npm test -- --runInBand --no-cache
```

The Supabase verification gate must additionally confirm Organisation A cannot access Organisation B data, device access is limited to the authenticated user, revoked devices remain auditable, recursive RLS evaluation does not occur, and anonymous access remains denied.

## File Boundaries
- `sitesync/src/auth/authService.ts`: authentication/session boundary.
- `sitesync/src/identity/identityService.ts`: authoritative identity and project-access resolution.
- `sitesync/src/identity/deviceRegistrationService.ts`: device installation lifecycle.
- `sitesync/src/identity/projectContext.ts`: application-facing identity/project context composition where required by existing architecture.
- `sitesync/__tests__/authService.test.ts`: authentication tests.
- `sitesync/__tests__/identityService.test.ts`: identity-resolution tests.
- Additional focused tests for device registration/context only if the existing project structure does not provide a suitable test location.

## Constraints
- Do not modify unrelated local persistence behavior.
- Do not introduce placeholder/fake production data.
- Do not weaken existing RLS policies to make client tests pass.
- Do not add deletion for device installations.
- Do not merge M1.4 until the configured Supabase test-project migration verification gate has passed.
