# M0 Execution Contract
Version: 1.0 — LOCKED
Status: EXECUTION PERMITTED
Implementation: PROHIBITED until M0 acceptance passes

*Sections marked (you) are addressed to the agent operating under the EP.
Other sections define the M0 contract neutrally.*

## Current milestone
M0 — Product / Architecture Contract

## Authoritative inputs

| # | Input | Location | Status |
|---|---|---|---|
| 1 | Master Blueprint | MASTER_BLUEPRINT/MASTER_BLUEPRINT.md | LOCKED v1.0 |
| 2 | Kimi Operating Contract | KIMI/OPERATING_CONTRACT.md | LOCKED v1.0 |
| 3 | Skills | KIMI/SKILLS/ | LOCKED v1.0 |
| 4 | AC-04 baseline + salvage | EVIDENCE/AC-04_BASELINE/ | PARTIAL (4 extractions open) |
| 5 | M0 acceptance criteria | MASTER_BLUEPRINT §M0.6 | LOCKED v1.0.1 |

Baseline repository: maddy0508/SITE-SYNC
Baseline commit: f90b77ab73cb7ae20b1084ad94fb5bc159afa841

## Scope — permitted (you)
- Read all authoritative inputs.
- Produce all required M0 artifacts.
- Perform pending extractions that the M0 architecture depends on.
- Raise AMBIGUITY_RECORDs.
- Raise BLOCKER_RECORDs.
- Update the salvage register.

## Scope — prohibited (you)
- Any M1+ implementation.
- Any schema migration.
- Any feature code.
- Any promotion of AC-04 salvage.
- Any modification of the Master Blueprint.
- Any resolution of an ambiguity without human decision.

## Required artifacts (all must be produced)

    M0/
    ├── architecture.md                    — §M0.3.1 through §M0.3.18
    ├── conceptual-model-mapping.md        — E/F/C/D per §7
    ├── persistence-model.md               — local + server
    ├── command-sync-model.md              — commands, outcomes, idempotency, conflict rules
    ├── authorization-scope-model.md       — role × scope × membership
    ├── offline-reconciliation-model.md    — durable intent through convergence
    ├── audit-model.md                     — F ∪ CommandOutcome derivation
    ├── salvage-register.md                — full AC-04 register at M0 time
    ├── pending-extractions.md             — status of §6.4 / §6.8 / §6.9 / §6.11
    ├── acceptance-tests/                  — one test per M0-AC-1 … M0-AC-10
    └── evidence/
          ├── claims.md
          ├── acceptance-map.md
          ├── adversarial.md
          ├── open-items.md
          └── state.md

## Gate
M0-AC-1 through M0-AC-10 must PASS.
Per §M0.6, no partial pass. Any failed AC is a BLOCKER_RECORD.

## Acceptance criteria (from Blueprint §M0.6, restated for execution)
- **M0-AC-1** — No §8 violations, no deferred fundamentals. Each deferral names target milestone and test; deferred ≠ satisfied.
- **M0-AC-2** — Every E/F/C/D type has a named mechanism.
- **M0-AC-3** — Offline coverage split: state-mutating → durable intent; read-only → cache + freshness. Includes §6.3.
- **M0-AC-4** — CommandOutcome coverage with local/server distinction.
- **M0-AC-5** — Canonical F mapping; no parallel fact layer.
- **M0-AC-6** — No second source of truth.
- **M0-AC-7** — Tenancy and Site boundaries enforced structurally; testable before M1.
- **M0-AC-8** — No retroactive reinterpretation required.
- **M0-AC-9** — Declared conflict rules per entity class.
- **M0-AC-10** — Salvage boundary respected: no promotion without anchor + predating test + §8 compliance.

## Evidence requirements (you)
- Every claim in `evidence/claims.md` cites: file, line range, commit SHA, command, output, AC.
- Every AC in `acceptance-map.md` maps to a test with test SHA and impl SHA.
- `adversarial.md` records every adversarial probe and its disposition.
- `open-items.md` records unresolved items, deferred items, and pending extractions.
- `state.md` records final commit SHA, CI status, migration state, and blueprint version.

## Constraints (you)
- Do not implement before M0 passes.
- Do not promote salvage without anchor + predating test + §8 compliance.
- Do not reinterpret the blueprint to make architecture fit.
- On ambiguity: raise AMBIGUITY_RECORD and halt on the affected scope.
- On gate failure: raise BLOCKER_RECORD; do not proceed.

## Reporting format (you)
Final M0 report contains:

    MILESTONE: M0
    STATUS: PASS | BLOCKED | FAIL
    EVIDENCE BUNDLE: M0/evidence/
    ACCEPTANCE RESULT:
      M0-AC-1:  PASS | FAIL | DEFERRED (target)
      M0-AC-2:  ...
      ...
      M0-AC-10: ...
    BLUEPRINT AMBIGUITIES RAISED: (list AMB-### or none)
    SALVAGE ITEMS PROMOTED: (list SR-### or none)
    NEXT MILESTONE AUTHORISATION: YES | NO
    BLOCKERS: (list BLK-### or none)

## Transition
M1 execution contract is drafted only after M0 reports PASS.
M1 implementation begins only after M1 execution contract is approved.

## Reading order (per Operating Contract §11)
1. MASTER_BLUEPRINT/MASTER_BLUEPRINT.md
2. KIMI/OPERATING_CONTRACT.md
3. KIMI/SKILLS/* (all seven)
4. KIMI/MILESTONES/M0_EXECUTION_CONTRACT.md (this file)
5. EVIDENCE/AC-04_BASELINE/
6. REPOSITORY/ as needed