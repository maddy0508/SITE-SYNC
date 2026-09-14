# SITE-SYNC Copilot Instructions

Use `AGENTS.md` as the controlling project instruction set.

## Product direction

SITE-SYNC is a construction/solar field-operations platform. Build the product around:

`TODAY → PEOPLE → PRE-STARTS → MAP/GPS → Spatial Progress → Reporting/Analytics → Communications → Admin/Release`

The application must not remain an engineering/QA harness while backend infrastructure expands indefinitely.

## Current delivery gate

M1 is the trust foundation. M1.7 and M1.8 must be genuinely complete and physically verified before M2 becomes active product development.

## Implementation pattern

For product work use:

`domain model → Supabase/RLS → local persistence/projection → repository → service/actions → UI → real data → tests → Android verification`

Do not create disconnected UI mock data or screen-local operational truth.

## Data/security

- Supabase/PostgreSQL is authoritative.
- PostgreSQL RLS is mandatory for tenant isolation.
- SQLite provides local offline persistence.
- Commands must be durable and idempotent.
- QR content is untrusted.
- Authorization is server-side.
- Audit is append-only.
- Explicitly represent stale, offline, pending and unverified states.

## Product surfaces

Primary navigation: TODAY, MAP, PEOPLE, MORE.

TODAY should surface date, weather, site/project, shift, attendance, crew, supervisor, pre-start state, Take 5, SWMS, permits, inductions, hazards, warnings, restrictions, progress, blockers and outstanding actions from real data.

Worker Profile is a reusable identity object. It must not become a dead-end screen.

The map is an operational surface. Spatial work areas carry planned/completed quantities, status, crew, blockers, photos and evidence.

Reports and analytics must drill back to source operational records.

## Quality gate

Do not mark work complete because a screen renders. Completion requires the real workflow, persisted data, relevant authorization tests, failure-state handling, and physical Android verification where applicable.
