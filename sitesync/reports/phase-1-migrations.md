# Phase 1 — Supabase Schema Foundation

Status: VERIFIED

## Architectural Guarantees Proven by Schema
- [x] Valid UUIDv4 format used for all deterministic seed data.
- [x] Cross-tenant relationships are structurally impossible due to composite foreign keys on `organisation_id`.
- [x] `project_assignments` structurally enforces organisation, company membership identity, and project/company participation relationships. Active/inactive state remains a domain authorization invariant enforced in Phase 2.
- [x] RLS enabled on all Phase 1 public tables. No client-facing RLS policies exist yet. Client access remains denied until Phase 2 policies are introduced.
- [x] Device installation uniqueness enforced via `UNIQUE (user_id, installation_key)`.

## Required Evidence

- [x] `supabase db reset` / Phase 1 migrations applied successfully to the fresh SITE-SYNC Supabase project.
- [x] `organisations`, `companies`, `persons`, `projects`, `project_assignments` tables exist.
- [x] `device_installations` exists with `device_name`, `app_version`, `os_version`, `last_seen_at`.
- [x] Seed data creates Organisation A (Supervisor + Worker) and Organisation B (Worker).
- [x] Mock `auth.users` are created and linked to `user_profiles`.
- [x] Supabase constraint inspection confirmed the composite tenancy and membership/project foreign keys plus uniqueness constraints.

## Verified Seed Counts

- 2 organisations
- 2 companies
- 3 persons
- 3 company memberships
- 2 projects
- 2 project/company participations
- 3 project assignments
- 3 user profiles
- 0 device installations (expected before real device registration)

## Security Notes

Supabase Security Advisor reports the expected `RLS enabled, no policy` informational findings because runtime RLS policies are intentionally deferred to Phase 2. The pre-existing `public.rls_auto_enable()` SECURITY DEFINER function was restricted so `anon` and `authenticated` cannot execute it.

## Repository Synchronization

- [x] Migration files committed to GitHub.
- [x] Seed file committed to GitHub.
- [x] Phase 1 evidence report committed to GitHub.

## Phase 2 Preparation (RLS Test Matrix)

*To be executed in Phase 2 once policies are applied:*

- [ ] Org A supervisor -> Org A project: ALLOW
- [ ] Org A worker -> Org A project: ALLOW
- [ ] Org A user -> Org B project: DENY
- [ ] Org A person -> Org B person: DENY (structurally blocked by FK)
- [ ] Org A company -> Org B project: DENY (structurally blocked by FK)
- [ ] Inactive membership -> project: DENY
- [ ] Inactive assignment -> project: DENY
- [ ] Revoked device -> authenticated action: DENY

## Next Dependency

M1.2 — RLS and hardened server command contract.
