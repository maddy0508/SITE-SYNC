# SITE-SYNC Project Rules

## Source of truth

| Concern | Authority |
|---|---|
| Current work, milestones, issues, acceptance evidence | Linear |
| Executable code, specs, plans, agent instructions | GitHub |
| Runtime backend/schema/RLS | Supabase |

If two sources disagree, do not guess. Identify the discrepancy and reconcile it explicitly.

## Scope control

The project is intentionally product-led after M1.

Do not introduce:

- M1.9/M1.10/etc. infrastructure milestones without a genuine release/security reason.
- broad backend work that has no current product slice.
- placeholder UI presented as completed functionality.
- duplicated domain state owned by individual screens.

## Vertical slices

A vertical slice must cross the necessary layers:

1. domain contract
2. backend/Supabase/RLS
3. local persistence/projection
4. repository
5. service/action
6. UI
7. real data
8. automated tests
9. physical Android verification

Not every slice needs new database tables or every layer, but every layer it does need must be completed before claiming the slice is done.

## Trust model

- Supabase/PostgreSQL is server authority.
- RLS is mandatory for tenant isolation.
- SQLite is local persistence.
- Durable commands must survive process death.
- Server effects must be idempotent.
- Identity, membership, assignment and permissions are separate.
- QR is untrusted input.
- Critical authorization is server-side.
- Audit is append-only.

## Offline model

Every domain must define:

- what can be read offline
- what can be written offline
- provisional/unverified state
- stale data state
- sync state
- retry behaviour
- conflict/reconciliation behaviour
- what is prohibited while offline

## Product UI

Primary navigation:

`TODAY · MAP · PEOPLE · MORE`

TODAY is the default operational landing surface.

Use real data. Do not invent counts, percentages, worker totals, progress or status values to make a screen look complete.

## Visual direction

Modern, editorial, polished field-operations product.

Prefer strong hierarchy, restrained warmth, clear status systems and useful information density.

Avoid sterile blue-white corporate UI, generic template layouts, neon hi-vis styling, excessive blank space and decorative analytics without operational meaning.

## Verification

Before marking an issue Done:

- run the relevant automated tests;
- run TypeScript/lint/build checks where applicable;
- physically verify user-facing Android behaviour;
- verify tenant/permission boundaries for sensitive flows;
- attach or link evidence in Linear;
- update docs if behaviour/architecture changed.

Never claim a gate passes without fresh evidence.

## Decision discipline

Record:

- assumptions
- constraints
- rejected approaches
- unresolved questions
- dependencies
- known defects
- acceptance evidence

Do not silently reintroduce a rejected approach.
