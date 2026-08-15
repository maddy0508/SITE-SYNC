# Phase 1 — Final Database Verification Evidence

Status: VERIFIED

## Verification basis

This record closes the final M1.1 evidence requirement: the Phase 1 schema, seed set, constraints, and repository-controlled migration set were re-applied successfully to a fresh local Supabase database during the Phase 2 verification run.

## Fresh database verification

The verification runner performed a fresh database reset and successfully completed, in order:

1. Recreated the local database.
2. Initialised the Supabase schema.
3. Applied `20260815000000_init_identity_tenancy.sql`.
4. Applied `20260815000001_init_device_installations.sql`.
5. Applied `20260815000002_init_operational_schema.sql`.
6. Applied `20260815000003_rls_policies.sql`.
7. Applied `20260815000004_server_functions.sql`.
8. Seeded `supabase/seed.sql`.
9. Seeded `supabase/seed.auth.sql`.
10. Restarted the local Supabase containers successfully.

The Phase 1 migrations therefore remain reproducibly applicable from the repository-controlled migration set after the final seed/auth corrections.

## Phase 1 schema evidence

The Phase 1 migration set defines and enables RLS on:

- `organisations`
- `companies`
- `persons`
- `user_profiles`
- `company_memberships`
- `projects`
- `project_company_participation`
- `project_assignments`
- `device_installations`

The schema contains the required organisation-scoped composite foreign keys, membership/project integrity constraints, uniqueness constraints, and device-installation uniqueness constraint documented in `phase-1-migrations.md`.

## Seed evidence

The repository-controlled seed produces the deterministic Phase 1 fixture set documented in the Phase 1 report:

- 2 organisations
- 2 companies
- 3 persons
- 3 company memberships
- 2 projects
- 2 project/company participations
- 3 project assignments
- 3 user profiles
- 0 device installations before real device registration

The local synthetic auth users are seeded and linked to `user_profiles`.

## Security evidence

Phase 1 intentionally enables RLS without runtime client policies. Runtime access policies and the server trust boundary are Phase 2 scope. The pre-existing `public.rls_auto_enable()` SECURITY DEFINER function is restricted so `anon` and `authenticated` cannot execute it.

## Repository evidence

- `supabase/migrations/20260815000000_init_identity_tenancy.sql` — present and repository-controlled.
- `supabase/migrations/20260815000001_init_device_installations.sql` — present and repository-controlled.
- `supabase/seed.sql` — present and repository-controlled.
- `supabase/seed.auth.sql` — present and repository-controlled.
- `reports/phase-1-migrations.md` — existing Phase 1 verification report.
- This file — final Phase 1 database verification evidence record.

## Result

**M1.1 final evidence requirement is satisfied.** The Phase 1 database foundation is reproducible from the committed migration and seed set, and the repository now contains the final verification record required by the M1.1 completion gate.
