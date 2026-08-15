# SITE-SYNC Copilot Instructions

## Mission

Build SITE-SYNC as a production-grade native Android field-operations platform for construction sites. The first milestone is a trustworthy offline operational-record foundation, not a feature-complete application.

## Non-negotiable constraints

- React Native + TypeScript.
- Native Android project.
- React Native Community CLI, not Expo.
- No EAS.
- No Expo development client.
- No PWA/WebView architecture.
- Hermes enabled.
- Gradle APK builds.
- Release APK must run without Metro, localhost or a development server.
- Supabase/PostgreSQL is the backend authority.
- PostgreSQL RLS is mandatory for tenant isolation.
- SQLite is the local persistence primitive for offline operation.

## M1 scope

Implement only the first vertical slice and its foundations:

`release APK → identity/company/project context → worker QR → attendance → local persistence → outbox → Supabase command → idempotent effect → reconciliation → timesheet derivation → audit/RLS validation`

Do not implement Tasks, SWMS, Competencies, Permits, Evidence, Reports, Maps or Assets until the M1 acceptance gate passes.

## Architectural invariants

1. Identity, company membership, project assignment and permission are distinct concepts.
2. QR identifiers are untrusted lookup hints; the server independently validates all relationships and authorization.
3. Client-side checks never replace server authorization.
4. Network delivery is at-least-once; server command processing must be idempotent so the observable effect is exactly once.
5. Mutable records use explicit revisions and stale writes must be rejected rather than silently merged.
6. Domain events and audit events are distinct concepts.
7. Audit records are append-only.
8. The UI must distinguish local/pending state from server-verified state.
9. Approved/immutable operational records are never destructively overwritten.
10. RLS tests must exercise real PostgreSQL/Supabase policies, not mocked authorization.

## Build discipline

- Prefer the official React Native Community template for the pinned RN version.
- Keep the Gradle wrapper checked into the repository.
- Do not add dependencies unless they serve an explicit requirement.
- Keep domain logic out of UI components.
- Do not create generic abstractions before the first concrete use case requires them.
- Every implementation phase must have a testable acceptance condition.
- Never claim a build passes without fresh build/test evidence.

## Repository structure target

```text
src/
  core/
  domains/
  infrastructure/
  ui/
android/
docs/
.github/
```

## Verification standard

A milestone is complete only when the specified acceptance tests are actually executed and the evidence is recorded. Code inspection alone is not proof of runtime behavior.
