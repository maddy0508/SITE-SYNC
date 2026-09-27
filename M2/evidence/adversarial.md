# M2 Adversarial Audit (Skill 07)

Executable probes: `M2/evidence/adversarial-probes.mjs`
Run at implementation commit `891fa7a` (I1):

```
$ node M2/evidence/adversarial-probes.mjs
PROBE Q1 PASS  cross-tenant M2 writes rejected (6/6: true); storage reads bounded (true)
PROBE Q2 PASS  re-association and re-assignment create new identities; removed records persist unreactivated (§7.5)
PROBE Q3 PASS  E genesis / HandoverRecord / LifecycleEvent / snapshot-nested arrays all deep-frozen (mutation attempts threw: 4/4)
PROBE Q4 PASS  M2 entities store no status (true); lifecycle/overlay/assignment state recompute from facts (draft→active→suspended; project genesis untouched: true)
PROBE Q5 PASS  offline-capable set unchanged (AcknowledgeRequirement); M2 command offline attempt locally rejected, nothing queued (true)
PROBE Q6 PASS  duplicate delivery and commandId reuse replay the recorded outcome; one suspension event; no reapplication
PROBE Q7 PASS  same-field updates: both facts recorded, later value derived; competing lifecycle intent rejected with audited outcome
PROBE Q8 PASS  one CommandOutcome per command (true); receipts exactly on accepts (true); M2 genesis records trace to receipted commands (true)
PROBE Q9 PASS  commandOutcomes index exactly mirrors CommandOutcome facts for M2 + M1 commands (both directions)
PROBE Q10 PASS M2 exports exactly the derivations + execute (10 exports); no cache/offline-read surface introduced
PROBE Q11 PASS archive terminal (EP update/double-archive/site reopen rejected); closure cascade recorded; zero entities deleted
PROBE Q12 PASS no transfer command/fact/vocabulary exists while AMB-003 is unresolved (provenance mechanism unimplementable by design)
PROBE Q13 PASS overlay derives from the Project stream alone: no Site facts (true), Site genesis byte-identical (true), resume clears it
PROBE Q14 PASS frozen record byte-identical after lifecycle/assignment/requirement change (true); later handover is a new point-in-time record (true)
ALL PROBES PASS (exit 0)
```

| # | Area (contract minimum) | Attack | Result | Disposition |
|---|---|---|---|---|
| Q1 | tenancy | Tenant B admin drives every M2 write surface against tenant A entities; storage-layer reads across the boundary | Rejected 6/6 with cross-tenant/not-found; reads return null | No vulnerability. DM-INV-5 holds on all M2 surfaces. |
| Q2 | identity | Re-associate a removed ProjectExternalParty; re-assign after removal; compare identities | New identities both times; removed records persist in `removed` | No vulnerability. §7.5 relationship-entity rule holds; single stable identity per entity (AC-ARCH-A2a). |
| Q3 | immutability | Mutate returned references: ExternalParty genesis, HandoverRecord snapshot, LifecycleEvent, nested snapshot arrays | All mutation attempts throw (strict mode); values intact | No vulnerability. DM-INV-2 / AC-ARCH-D4 deep-freeze at creation. |
| Q4 | derived-vs-authoritative | Look for stored status fields on M2 entities; verify derivations move with facts while genesis stays fixed | M2 entities carry no state attribute; lifecycle/overlay/assignment recompute; Project genesis `draft` untouched across transitions | No vulnerability. DM-INV-3: no stored status is authoritative for a derived value. (M1's Project/Site genesis `state` is the entry-state creation attribute, folded forward by facts — inherited M1 pattern.) |
| Q5 | offline durability | Attempt an M2 command through the offline path; inspect the offline-capable set and M2 exports | `locally rejected`, never queued; set still `{AcknowledgeRequirement}`; M2 exports no offline entry point | No vulnerability. §6.10.2 classification respected; no durable-intent path for structural commands. |
| Q6 | idempotency | Duplicate delivery of SuspendProject; commandId reuse with a different payload (ResumeProject) | Both replay the first recorded outcome (`duplicate: true`); exactly one suspension fact; state unchanged by replay | No vulnerability. AC-ARCH-C2/G1, §6.10.3. |
| Q7 | conflict semantics | Two updates to the same ExternalParty field; a competing lifecycle command from a wrong state | Both update facts recorded, later value derived (declared rule); competing command rejected with an audited CommandOutcome | No vulnerability. No silent loss; per-entity conflict rule is declared (append-only facts, fold order = fact order). |
| Q8 | audit | Count CommandOutcome/CommandReceipt facts per command; trace M2 genesis records to receipts | Exactly one outcome per command; receipts exactly on accepts; every M2 genesis traces to a receipted accepted command | No vulnerability. §7.8 / AC-ARCH-D2/D3/D5. |
| Q9 | second source of truth | Compare the `commandOutcomes` index against CommandOutcome facts in both directions | Exact correspondence | No vulnerability. The index is a derived lookup, not a shadow store (M1 P17 analogue, now covering M2 commands). |
| Q10 | offline reads | Enumerate M2 exports for cache/snapshot-read surfaces | Exports are exactly the derivations + execute + command catalogue; none | No vulnerability. M2 adds no offline-read surface; M1's freshness model (M1 P18) is unaffected. |
| Q11 | archive/retention | Update/double-archive an archived ExternalParty; reopen an archived Site; count entities before/after | All rejected; zero entities deleted; closure cascade recorded as facts | No vulnerability. Terminal states are terminal; retention is append-only (destruction is Platform scope, later). |
| Q12 | transfer provenance | Issue TransferProject; scan fact vocabulary and command catalogue for transfer machinery | Unknown command rejection; no transfer artifact exists | Halt intact (AMB-003). Provenance mechanism deliberately unimplemented; sentinel `m2-ac-08` keeps this under test. |
| Q13 | suspension overlay derivation | Suspend a Project; inspect Site facts, Site genesis bytes, underlying state; resume | No SiteLifecycleEvent; Site genesis byte-identical; underlying state intact; overlay clears on resume | No vulnerability. Overlay is D-class derivation from the Project stream alone (M2-AC-4). Independent Site suspension remains halted (AMB-004). |
| Q14 | handover snapshot immutability | Mutate lifecycle, assignments, and Requirements after a handover; compare the frozen record; take a second handover | Frozen record byte-identical (`active` stays `active`); second handover is a new point-in-time record | No vulnerability. M2-AC-9's named case holds. |

## Notes

- Probes Q5/Q10/Q12 are negative-surface probes: they verify that halted or
  out-of-scope machinery does **not** exist. They complement the halt
  sentinels (`m2-ac-05/08/11`), which continuously verify the same halts in
  the acceptance suite.
- No salvage was consulted or promoted for any M2 behavior (zero
  promotions, per the M2 contract).
- M1 inheritance: Q5/Q9/Q10 exercise shared plumbing (queue, outcomes,
  cache absence) that M1 established; M2 re-verifies them because M2
  commands now flow through the same store.
