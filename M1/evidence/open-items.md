# M1 Open Items

## AMB-002: RESOLVED

Resolution date: 2026-09-27
Resolved by: Maddy McKellar
Resolution: profile_complete(worker) defined in §4.4 as
            display_name non-empty AND (contact_phone non-empty
            OR contact_email non-empty).
Mechanism: Blueprint §4.4 amendment; EP-4.0 cut and tagged.
Superseded package: EP-3.0 (historical, unchanged).
Operative package: EP-4.0.

## AMB-002 — historical record (as raised): `profile_complete(worker)` was used by §4.4 but defined nowhere

**Status: RESOLVED (above) — scope resumed under EP-4.0.**

**Where.** MASTER_BLUEPRINT §4.4 (MASTER_BLUEPRINT/MASTER_BLUEPRINT.md
lines 156–163, EP-2.0 bytes, unchanged at EP-3.0):

```
company_ready(worker) :=
    profile_complete(worker)
    AND ∀ requirement R where R.scope = company AND applies(R, worker):
            satisfied(worker, R)
```

**The defect.** `profile_complete(worker)` is a gate conjunct for company
readiness (and therefore site readiness), but no authoritative input defines
which profile fields constitute completeness:

- §4.4 is the only occurrence of the term in the blueprint (verified by
  `grep -n "profile_complete" MASTER_BLUEPRINT/MASTER_BLUEPRINT.md` — single
  hit at line 158).
- §6.3.2 lists Worker profile fields (display name, contact phone, contact
  email, photo, capabilities, role label, management contact reference) but
  marks none as required, and §6.3.2/§6.3.9 make `management_contact` a
  granted capability — requiring it for readiness would contradict WC-INV-8
  (capabilities are flags, not required attributes).
- M0 architecture documents, KIMI/OPERATING_CONTRACT.md, and the M1
  Execution Contract (which lists `profile_complete(worker)` (D) as in-scope,
  line 78) do not define it either.

**Why it is not decidable by the executor.** Materially different readings
produce different gate outcomes for the same worker (e.g. is a worker with
display name and contact email but no photo company-ready?). Any choice
invents domain semantics; per the M1 contract ("Do not reinterpret the
blueprint"; "On ambiguity: raise AMBIGUITY_RECORD and halt the affected
scope") the predicate cannot be implemented by choosing.

**Same class as AMB-001** (§8.K referenced undefined AC-ARCH-0.x criteria):
a locked section references an undefined term.

**Affected scope (halted at EP-3.0 phase; resumed and completed under EP-4.0).**

- **M1-AC-9** — readiness derivation: `company_ready` per §4.4 embeds
  `profile_complete`; computing it required the undefined predicate. No test
  was authored at the EP-3.0 phase; after EP-4.0 supplied the definition,
  `m1-ac-09.test.mjs` was authored test-first (commit `b93b6ff`) with a FAIL
  baseline, implemented at `1af43d6`, PASS, ancestry verified.
- **M1-AC-11** — its "applicable readiness" cached-read and freshness
  clauses depended on the halted derivation. Resumed under EP-4.0 with the
  offline durable-intent path for AcknowledgeRequirement (§6.10.2's only
  M1-relevant offline-mutating classification) implemented alongside:
  `m1-ac-11.test.mjs` at `b93b6ff`, FAIL baseline, PASS at `1af43d6`.

**Unaffected.** M1-AC-1..8, 10, 12, 13, 14 — none of them reference
`profile_complete` or readiness.

**Proposed resolution options for the human (non-binding).**

1. Blueprint amendment defining `profile_complete` minimally (e.g. display
   name + at least one contact channel), then EP cut, then AC-9/AC-11 tests
   authored test-first.
2. Blueprint amendment removing the conjunct (company_ready purely
   requirement-derived), same flow.
3. Defer the definition to the company via configuration — not recommended:
   readiness gating (INV-1/INV-2) should not be tenant-variable without a
   blueprint decision saying so.

## Noted interpretation — assignment removal during offboarding

The M1 contract's lifecycle boundary forbids "assignment removal
beyond assigned/active states" as a standalone operation. The
offboarding cascade in §6.3.3 mandates that all assignments and
memberships be ended on offboarding. If the boundary were read to
forbid offboarding assignment-ending, in-scope behaviour 3
(offboarding) would be impossible whenever assignments exist.

Reading: M1 implements assignment-ending only as part of the
offboarding cascade. No standalone assignment-removal operation
exists in M1.

Reason this is not an AMB: the alternative reading is
self-contradictory within the M1 contract, so only one valid
reading exists.

Flagged for future reviewers in case M2 changes the boundary.

## Offboarding preconditions against unimplemented artifact classes

Per M1 contract behaviour 3: OffboardWorker (M1/src/domain.js lines 633–674)
explicitly checks the artifact classes M1 implements (assignments, QR
identity) and documents, in code, that open shifts (M6), pending Tasks
(M5/M7), and pending CompletionClaims (M7) do not exist in this build and
become additional enforcement obligations in their milestones. The
implementation distinguishes "no applicable open artifacts exist" from
"later classes ignored".

## Deferred adversarial probes

See adversarial.md: distributed QR rotation race (P14), archive/retention
destruction (P20), progress/attendance probes (P21) — each DEFERRED to a
named milestone. P12 (offline durability) and P18 (offline reads/freshness)
were executed after AMB-002 resolution and are MITIGATED.

## Salvage

Zero salvage items promoted in M1 (default per M1 contract). No salvage
code paths are referenced by M1/src or M1/acceptance-tests.

## BLK records

None raised.

## Current open items

None. AMB-002 is resolved; all other records are dispositions or deferred
probes with named target milestones.

## DEFERRED — AC-11 physical durable engine

§6.10 durable-intent semantics for the acknowledgement offline
mutation are implemented and tested (atomic commit, queue entry,
CommandReceipt, restart-boundary probe P12, sync-time rejection
preservation). The physical durable storage engine is a §8.J
application-shell decision, currently deferred.

Resolved by: <milestone>. Recommended: M10 — Offline / Sync /
Recovery (§11), which is the natural home for hardening physical
durability across the sync surface.

P12 tests the restart boundary at the domain level. Distinction
recorded explicitly: P12 **simulates** the restart boundary — it
verifies that the durable local fact and queue entry persist intact
in the store and are transmitted exactly once afterward, but it does
not serialise/rehydrate the store and does not physically restart the
process. Physical persistence durability (surviving an actual process
or device restart) is a property of the future storage adapter and is
not claimed by P12 or by M1.

This deferral does not weaken AC-11's semantic requirements; it
records that the physical persistence adapter is a future §8.J
decision.
