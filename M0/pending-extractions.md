# M0 Pending Extractions — status of §6.4 / §6.8 / §6.9 / §6.11

Authority: MASTER_BLUEPRINT §M0.5 (pending extraction gate), §12 SR-008,
§6.4.8 / §6.8.8 / §6.9.8 / §6.11.8 (reconciliation status); M0 execution
contract input #4 (EVIDENCE/AC-04_BASELINE/ — PARTIAL, 4 extractions open).

## Gate rule (§M0.5)

These extractions do not block M0. They block promotion of the corresponding
legacy implementation. Since M0 promotes nothing (§M0.4), all four remain
OPEN/PENDING without affecting the M0 gate.

## Status

| Section | Domain | Blueprint status | Performed at M0? | Reason |
|---|---|---|---|---|
| §6.4 | Pre-starts | EXTRACTION REQUIRED — not performed; expected NOT PRESENT | No | M0 architecture derives from §6.4 text, not from AC-04 code; absence probe: no pre-start identifiers exist under sitesync/src or sitesync/__tests__ at EP-1.0 |
| §6.8 | Communication | EXTRACTION REQUIRED — not performed; expected NOT PRESENT or REFERENCE | No | Same basis; §6.8.4 introduces no new E/F entities |
| §6.9 | Reporting | EXTRACTION REQUIRED — not performed; expected NOT PRESENT or REFERENCE | No | Same basis; §6.9 model is D + ReportExportEvent + ReportConfig only |
| §6.11 | Administration | OPEN / PENDING — extraction not performed | No | Same basis; §6.11 introduces only F records and admin surfaces |

## Dependency determination (M0 contract, permitted scope)

The M0 architecture artifacts do not depend on these extractions: every M0
document is anchored to blueprint text (§4, §6.4, §6.8, §6.9, §6.11, §7, §8),
not to AC-04 implementation behaviour. Extractions become blocking only at the
milestone where salvage promotion of a corresponding implementation is
proposed (per §M0.5 and §8.L), and at the milestones implementing those
domains (M5 pre-starts, M9 reporting/administration per §11).

## Input #4 note

EVIDENCE/AC-04_BASELINE/ is declared in the M0 execution contract as PARTIAL
(4 extractions open). The directory is absent from the repository at EP-1.0
(evidence: `git ls-tree -r --name-only EP-1.0 | grep -c EVIDENCE` → 0). This is
consistent with the declared PARTIAL status and is recorded in
M0/evidence/open-items.md; per §M0.5 it does not block M0.
