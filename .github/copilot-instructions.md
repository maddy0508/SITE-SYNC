# SITE-SYNC agent instructions

## Operating rules

- Treat the repository and version-controlled specifications as the source of truth; do not rely on remembered project state when the repository can answer the question.
- Before consequential work, inspect the relevant code, tests, migrations, and `docs/superpowers/specs` / `docs/superpowers/plans` artifacts.
- Distinguish verified fact, inference, proposal, assumption, and unknown. Never present an inference as repository fact.
- Preserve confirmed requirements and rejected approaches. A previous decision may be superseded only by an explicit new decision recorded in the relevant specification or plan.
- Use the smallest correct change. Do not introduce unrelated refactors, placeholder production data, speculative abstractions, or dependency changes without evidence.
- Completion states are: `proposed → designed → scaffolded → implemented → locally verified → CI verified → integration verified → release verified`. Never claim a higher state without evidence.
- Every behavior change requires an explicit verification path proportional to its risk.

## SITE-SYNC architecture

- SITE-SYNC is a React Native 0.86 TypeScript application with Supabase and OP-SQLite, plus native Android/iOS projects.
- Authentication is an application boundary; downstream identity must derive from the authenticated Supabase user.
- Organisation, person, membership, project assignment, and device ownership are authoritative server-side relationships. Do not trust client-supplied tenant or project identifiers.
- Tenant isolation and RLS are security properties, not convenience features. Never weaken them to make a client test pass.
- Follow existing service boundaries and persistence patterns before introducing new ones.
- Existing `docs/superpowers/specs` and `docs/superpowers/plans` are authoritative workflow artifacts.

## Security

- Never invent credentials, secrets, signing material, production identifiers, or authorization grants.
- Never bypass RLS, disable security controls, substitute production systems for test systems, or modify authentication solely to make verification pass.
- Treat production database changes, destructive migrations, credential/signing changes, authentication/RLS changes, broad deletion, and real-user external side effects as high-risk operations requiring deliberate authorization.
- Prefer negative-path tests for authentication, authorization, tenant isolation, ownership, and lifecycle rules.

## Verification

Use the repository's actual commands and adapt scope to the changed boundary. The current package scripts include `npm run lint` and `npm test -- --runInBand --no-cache`; additional project-specific verification may be required for Supabase, Android, iOS, or release work.

Report what was actually run, what passed, what failed, what was blocked by environment limitations, and the resulting completion state.

## Communication

Return concise, structured results. For implementation work report: objective, changed files, verification evidence, unresolved issues, and completion state. Do not narrate internal reasoning or claim work was completed merely because it was designed or scaffolded.