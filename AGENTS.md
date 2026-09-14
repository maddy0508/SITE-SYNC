# SITE-SYNC Agent Operating Instructions

## Read first

Before changing SITE-SYNC, read:

1. `AGENTS.md`
2. `docs/SITE-SYNC-PRODUCT-ROADMAP.md`
3. `docs/SITE-SYNC-PROJECT-RULES.md`
4. the active Linear milestone and issue
5. the relevant design/spec/plan under `docs/superpowers/`

## Product identity

SITE-SYNC is a field-operations platform for construction and solar projects. It is not an attendance app with extras. The product connects TODAY, people, attendance, safety, documents, map/GPS, spatial progress, reporting, analytics, communications and administration.

The site/project and map are primary operating surfaces.

## Delivery model

M1 is the trust foundation and hard gate. Finish M1.7 and M1.8 and prove the complete M1 acceptance before M2 becomes active development.

Do not create endless M1.x infrastructure milestones. New foundation work belongs inside the product slice that needs it unless it is a genuine security or release blocker.

From M2 onward, use vertical slices:

`domain contract → Supabase/RLS → local persistence/projection → repository → service/actions → UI → real data → tests → physical Android verification`

## Non-negotiable rules

- Never claim completion from scaffolding, mockups, schemas, migrations or placeholder UI alone.
- Never use fabricated operational data in production-facing screens.
- Never bypass PostgreSQL RLS or server-side authorization for convenience.
- Keep identity, company membership, project assignment and permissions distinct.
- QR values are untrusted lookup hints and never grant authority.
- Audit records are append-only.
- UI state derives from repository/local-record state.
- Every domain must define offline, stale, unverified and sync-failure semantics where relevant.
- Location requires explicit permission/privacy, freshness/accuracy and battery/network behaviour.
- External communication capabilities must be verified before implementation; do not assume an API can perform an action it does not support.
- Physical Android verification is required for user-facing milestone completion.
- Keep Linear, GitHub and Supabase aligned.
- Do not silently reintroduce rejected decisions.

## Working behaviour

1. Check Linear before starting.
2. Identify the current milestone, issue, dependencies and acceptance criteria.
3. Prefer the smallest complete vertical slice over broad unfinished infrastructure.
4. Write/extend tests before implementation where the workflow changes behaviour.
5. Verify with fresh evidence before changing an issue to Done.
6. Record blockers, assumptions and unresolved decisions explicitly.
7. Update the relevant documentation when architecture or product behaviour changes.
8. If a request conflicts with the roadmap or trust model, surface the conflict before implementation.

## Product quality

SITE-SYNC should feel like a finished professional field product: modern, polished, information-dense, highly legible, operationally useful and visually coherent. Avoid sterile blue-white corporate dashboards, cheap default component styling, neon hi-vis aesthetics, decorative charts and excessive empty space.
