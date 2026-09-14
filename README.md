# SITE-SYNC

SITE-SYNC is a native Android, offline-first field-operations platform for construction and solar projects.

It is not an attendance app with extras. The product connects people, work, safety, documents, map/GPS, spatial progress, reporting, analytics, communications and administration into one secure operational record.

## Product direction

The delivery sequence is:

`M1 Trust Foundation → M2 TODAY → M3 PEOPLE → M4 PRE-STARTS/Safety → M5 MAP/GPS + Spatial Progress → M6 Reporting/Analytics → M7 Communications/Notifications → M8 Admin/Hardening/Release`

The site/project and map are central operating surfaces.

## M1 hard gate

M1 proves the trustworthy operational-record foundation:

`Login → company/project context → worker identity → QR → offline attendance → durable command → Supabase effect → reconciliation → timesheet derivation → audit/RLS proof → Android release verification`

M1.7 and M1.8 are the final M1 gate. Do not extend M1 with speculative infrastructure milestones.

## Product development model

After M1 closes, build visible vertical slices end-to-end:

`domain → Supabase/RLS → local projection → repository → service → UI → real data → tests → physical Android verification`

Backend infrastructure exists to support a product slice; it does not become the product itself.

## Project instructions

- `AGENTS.md` — agent operating instructions.
- `.github/copilot-instructions.md` — Copilot/project execution rules.
- `docs/SITE-SYNC-PRODUCT-ROADMAP.md` — complete product roadmap and feature scope.
- `docs/SITE-SYNC-PROJECT-RULES.md` — source-of-truth, security, offline and verification rules.
- `docs/superpowers/specs/2026-09-14-site-sync-product-direction-design.md` — approved product-direction design.
- `docs/superpowers/plans/2026-09-14-site-sync-product-roadmap.md` — implementation plan.

## Platform constraints

- React Native + TypeScript.
- Native Android project.
- React Native Community CLI; no Expo/EAS unless a future decision explicitly changes this.
- Hermes.
- Supabase/PostgreSQL.
- PostgreSQL RLS.
- SQLite local persistence.
- Durable offline commands and deterministic reconciliation.
- Standalone Android verification.

## Definition of done

A feature is not complete because a schema, migration, service, mockup or placeholder screen exists. Completion requires a real end-to-end workflow, persisted data, correct permissions, relevant tests, explicit failure/offline states and physical Android acceptance with evidence recorded in Linear.
