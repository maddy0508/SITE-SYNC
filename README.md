# SITE-SYNC

SITE-SYNC is a native Android, offline-first field-operations platform for construction projects, initially focused on large-scale solar farm construction.

## Milestone 1

The first vertical slice proves the trustworthy operational-record foundation:

`Login → company/project context → worker identity → QR → offline attendance → outbox → Supabase command → idempotent effect → reconciliation → timesheet derivation → audit/RLS proof → standalone APK`

Milestone 1 is a hard gate. Feature domains such as tasks, SWMS, competencies, permits, evidence, reports, maps and assets do not proceed until the foundation passes its acceptance tests.

## Non-negotiable platform constraints

- React Native + TypeScript
- Native Android project
- React Native Community CLI; no Expo/EAS
- Hermes
- Gradle release APK
- Supabase/PostgreSQL
- Database-enforced RLS
- SQLite local persistence
- Offline outbox + deterministic reconciliation
- Standalone APK; no Metro/localhost/development server at runtime

See `docs/superpowers/specs/2026-08-15-site-sync-milestone-1-design.md` for the approved Milestone 1 design and `docs/BUILD.md` for build-environment requirements.
