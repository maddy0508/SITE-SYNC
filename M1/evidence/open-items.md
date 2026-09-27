# M1 Open Items

## AMB-002 — `profile_complete(worker)` is used by §4.4 but defined nowhere

**Status: OPEN — halts M1-AC-9 and M1-AC-11.**

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

**Affected scope (halted).**

- **M1-AC-9** — readiness derivation: `company_ready` per §4.4 embeds
  `profile_complete`; computing it requires the undefined predicate. No test
  authored; no derivation implemented.
- **M1-AC-11** — its "applicable readiness" cached-read and freshness
  clauses depend on the halted derivation, and the criterion is atomic (M1
  contract: no partial pass). Consequently the offline durable-intent path
  for AcknowledgeRequirement (§6.10.2's only M1-relevant offline-mutating
  classification) is also deferred: declaring it offline-capable without its
  acceptance test would violate INV-C. The implemented domain core therefore
  executes all M1 commands on the online path only.

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

## Noted interpretation (not an ambiguity) — offboarding ends assignments

The M1 contract's lifecycle boundary ("no ... assignment removal beyond
`assigned` / `active` states") could be read to forbid ending assignments at
all in M1. That reading contradicts the contract's own in-scope behaviour 3
(Worker lifecycle including `offboarded`) combined with §6.3.3 ("Offboarded
Worker: all assignments and memberships ended"). The consistent reading is:
the boundary forbids standalone assignment-removal lifecycle operations;
the offboarding cascade that §6.3.3 mandates is required. M1 implements
assignment-ending only inside OffboardWorker (as attributed LifecycleEvent
`removed` facts), and exports no standalone removal command. Recorded for
human review; flagged here rather than silently assumed.

## Offboarding preconditions against unimplemented artifact classes

Per M1 contract behaviour 3: OffboardWorker (M1/src/domain.js lines 633–674)
explicitly checks the artifact classes M1 implements (assignments, QR
identity) and documents, in code, that open shifts (M6), pending Tasks
(M5/M7), and pending CompletionClaims (M7) do not exist in this build and
become additional enforcement obligations in their milestones. The
implementation distinguishes "no applicable open artifacts exist" from
"later classes ignored".

## Deferred adversarial probes

See adversarial.md: offline durability (P12), offline reads/freshness (P18),
distributed QR rotation race (P14), archive/retention destruction (P20),
progress/attendance probes (P21) — each DEFERRED to a named milestone or to
AMB-002 resolution.

## Salvage

Zero salvage items promoted in M1 (default per M1 contract). No salvage
code paths are referenced by M1/src or M1/acceptance-tests.

## BLK records

None raised. (AMB-002 blocks the gate but is an ambiguity record, not a
blocker record; the milestone status reflects it.)
