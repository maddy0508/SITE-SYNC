# SS-PILOT-RESCOPE-001 — Existing M1 Candidate Selection Inspection

**Repository:** `maddy0508/SITE-SYNC`  
**Inspected ref:** `f90b77ab73cb7ae20b1084ad94fb5bc159afa841`  
**Inspection mode:** selection only — no implementation, schema change, migration, test change, or product change  
**Decision:** NO CANDIDATE SELECTED — HARD STOP

## 1. Pre-committed rescope costs

### Cost 1 — AMBER path

The rescope must not imply that the AMBER path was revalidated.

The original SS-PILOT-001 deliberately targeted a new RLS boundary so that Jenny would have to stop at an AMBER approval boundary. The existing M1 candidates surveyed here generally already have established authorization/RLS behaviour or are application-only fixes.

Therefore:

- AMBER remains unvalidated by the rescope unless a candidate modifies an existing RLS policy.
- Creating a new policy is excluded.
- An existing-policy modification would be acceptable only if it also satisfies the zero-new-artifact rule and the layer coverage rule.

### Cost 2 — AC-06

The offline tenant-isolation invariant from SS-PILOT-001 is no longer the pilot anchor.

The rescope may exercise existing offline/sync machinery, but that does not earn AC-06 coverage. In particular, ordinary attendance synchronization, lifecycle, or projection correctness must not be reported as evidence for the offline tenant-isolation invariant.

The following remain unearned unless separately tested:

- AC-06 offline tenant isolation
- crash/reboot persistence as a dedicated acceptance criterion
- fresh-session verification
- concurrency

## 2. Fixed selection rule

The following rule was fixed before candidate surveying:

1. **Zero new artifacts — hard exclusion.** Any candidate requiring a new domain, table, policy, contract, local model, fixture, or UI surface is excluded.
2. Prefer an existing failing/reproduced defect or documented known limitation.
3. Among eligible candidates, prefer the one touching the most existing layers without adding any.
4. Prefer an existing Android UI path.
5. Prefer a candidate fully verifiable with existing fixtures.

Additional structural rule:

> The target change must be the smallest existing-M1 change that can touch one existing artifact in each relevant implementation layer, without introducing a new artifact.

The rule is deliberately exclusionary. A feature-shaped candidate is not allowed to enter the shortlist merely because it would exercise more governance.

## 3. Surveyed candidates

| Candidate | Repository evidence | Result |
|---|---|---|
| Sync lifecycle startup idempotency | Historical fix `8ffc689...`; existing `syncLifecycle.ts` and test already contain the repair | **Excluded** — defect already repaired; application-layer only; no RLS/DB/local-model/UI change |
| Sync runtime lifecycle race | Historical fix `fd58fb1...`; current runtime contains lifecycle-generation protection | **Excluded** — defect already repaired; sync-runtime only |
| Stale sync projection guard | Historical fix `631cc9d...`; later refactor `b0930ae...` explicitly removed the guard as unnecessary | **Excluded** — historical issue is resolved/reworked; no current reproduced defect |
| Sync response binding | Historical fix `0091b91...`; current transport validates response command identity | **Excluded** — defect already repaired; transport/test scope only |
| M1.5 missing-assignment QR crash | Historical fix `2c82c1b...`; current worker QR screen handles missing assignment | **Excluded** — defect already repaired; UI-only |
| M1.5 scanner focus/permission recovery | Historical fix `b0ecca3...`; current scanner includes focus/permission handling | **Excluded** — defect already repaired; UI/native boundary only |
| M1.4 recursive identity RLS policies | Historical fix `b7bf6a1...`; current RLS contains helper functions and replacement policies | **Excluded** — the RLS defect is already repaired; no existing downstream sync/local/UI change is naturally required by the repair |
| Existing M1.7 authorization/RLS boundary | Current implementation already has relational server authorization and adversarial SQL coverage | **Excluded** — changing it without a reproduced defect would be speculative governance exercise; a new or widened boundary would violate pilot intent |
| New/extended attendance behaviour | Existing attendance domain has service, command, local persistence, sync, QA UI and SQL tests | **Excluded** — candidate becomes feature/design work unless a concrete existing defect is identified; any new contract/fixture/surface would violate rule 1 |

## 4. Important inspection finding

The repository does contain real cross-layer M1 infrastructure:

`attendanceService` → local SQLite state/event/command ledger → sync worker/transport → M1.7 server RPC → existing QA UI → existing SQL/Jest coverage.

However, the survey did **not** find a current, documented, or reproducible defect that simultaneously satisfies all of the fixed selection constraints.

The strongest existing defects are historical fixes. The strongest RLS material is already hardened. The strongest cross-layer attendance material is already implemented and tested. Selecting a candidate by inventing a new bug, intentionally weakening a policy, or designing a new behaviour would reproduce the original SS-PILOT-001 failure mode under a different name.

## 5. Pilot exercise coverage if a candidate were selected

The intended loop remains:

**Inspect → Classify → Plan → Implement → Test → Verify → Audit**

A valid repair-mode candidate would need to demonstrate that loop on existing implementation without turning into feature development.

No implementation was started during this inspection.

## 6. What this inspection does and does not prove

### Demonstrated

- Governance selection rules were applied before choosing a candidate.
- The zero-new-artifact exclusion prevented feature-shaped candidates from being admitted.
- Existing M1 has enough implementation depth for a repair-mode pilot in principle.
- Historical repair evidence exists in the repository.
- Existing RLS/security and sync infrastructure is materially implemented.

### Not demonstrated

- AMBER approval path
- AC-06 offline tenant-isolation invariant
- crash/reboot persistence as the pilot anchor
- fresh-session verification
- concurrency
- a complete Inspect → Implement → Verify → Audit pilot cycle

## 7. Governance-cost record

### Inspection #1 — original SS-PILOT-001

Outcome: HARD STOP before implementation.

Finding: the pilot requirement was feature-sized and required eight prerequisites/new-domain decisions.

Implementation performed: none.

### Inspection #2 — rescope candidate selection

Outcome: HARD STOP before implementation.

Finding: after enforcing the pre-committed zero-new-artifact rule, no existing candidate simultaneously provides the required repair evidence and sufficient cross-layer coverage. The available defects are historical/repaired, while the remaining cross-layer changes would require introducing behaviour or design not already represented by a concrete defect.

Implementation performed: none.

### Interpretation

This second HARD STOP must be recorded as a **pilot-selection/process finding**, not as a repository-readiness finding.

The repository is not being classified as "not ready." The finding is:

> The current pilot-selection mechanism can reject both a feature-sized candidate and the available existing repair candidates without producing an implementable pilot. The governance package therefore needs one additional calibration decision before implementation can begin.

No candidate was forced through the gate to make the pilot appear successful.

## 8. Required next decision

No PR-PILOT-001 through PR-PILOT-008 has been created.

No implementation should begin from this report.

The next decision is whether to change the **pilot selection rule itself** — for example, explicitly permit a repair candidate that does not touch RLS/AMBER, or explicitly define a narrow existing RLS-policy repair that is already supported by a concrete defect — before another candidate survey is run.
