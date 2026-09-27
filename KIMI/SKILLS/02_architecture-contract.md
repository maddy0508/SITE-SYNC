# SKILL 02: Architecture Contract

Version: v1.0
Date: 2026-09-26

---

## Purpose

Ensure that the SITE-SYNC architecture adheres to the Architecture Contract (Part B of the Master Blueprint). The architecture contract is binding.

## Triggers

- Designing any new component
- Modifying any existing component
- Adding any new dependency
- Changing any data flow
- Changing any API contract

## Process

1. Read the Architecture Contract section relevant to the work.
2. Identify applicable architecture principles (AC-ARCH-*).
3. Identify applicable data architecture rules (AC-DATA-*).
4. Identify applicable sync architecture rules (AC-SYNC-*).
5. Identify applicable API architecture rules (AC-API-*).
6. Verify that the proposed architecture aligns with the contract.
7. If there is a conflict, STOP and report to the human approver.
8. If there is no conflict, proceed and document the alignment.

## Rules

- Fact-sourced architecture (AC-ARCH-1) is non-negotiable. All state is derived from facts.
- Offline-first (AC-ARCH-2) is non-negotiable. All daily operations work offline.
- Tenant isolation (AC-ARCH-3) is non-negotiable. No cross-tenant data access.
- Authority-scoped operations (AC-ARCH-4) are non-negotiable. Every operation carries an authority scope.
- Immutable audit trail (AC-ARCH-5) is non-negotiable. Facts are immutable and append-only.
- Evidence integrity (AC-ARCH-6) is non-negotiable. All evidence is hashed and verifiable.
- Deterministic sync (AC-ARCH-7) is non-negotiable. Same facts, same state, regardless of order.
- Local-first read models (AC-ARCH-8) are non-negotiable. Read models are computed locally from the local fact store.

## Output

For each architecture decision, produce:
- Architecture contract sections consulted.
- Principles verified.
- Conflicts found (if any).
- Alignment statement.

---

END OF SKILL 02
