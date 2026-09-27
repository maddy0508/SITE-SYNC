# M1 Adversarial Audit (Skill 07)

Executable probes: `M1/evidence/adversarial-probes.mjs`
Run at implementation commit `62241d3f0699b46a55d169fcb72392db2a2f2eb5`:

```
$ node M1/evidence/adversarial-probes.mjs
PROBE P1 PASS  cross-tenant writes via worker/project/site/requirement/QR/invitation refs all rejected (6/6)
PROBE P2 PASS  cross-tenant reads (worker/project/site/requirement/company/person) and enumeration return nothing
PROBE P3 PASS  indirect cross-tenant reference (named_workers carrying foreign id) yields no actionable path
PROBE P4 PASS  duplicate delivery applies once; replay returns recorded outcome
PROBE P5 PASS  commandId reuse with different payload replays first outcome; no second logical action materialises
PROBE P6 PASS  single stable identity per entity; identity generated where entity is born
PROBE P7 PASS  F record mutation via returned reference is prevented (deep-frozen)
PROBE P8 PASS  E genesis record mutation via reference is prevented
PROBE P9 PASS  no deletion path exported (exports: activeQrIdentity, createStore, currentCapabilities,
               deriveProfile, execute, listForCompany, readForCompany, satisfactionState, tick, workerLifecycleState)
PROBE P10 PASS no stored profile/capability/lifecycle/readiness fields on any entity (all derived)
PROBE P11 PASS no F record embeds a derived value as input (AC-ARCH-E3)
PROBE P13 PASS same-field conflict: both facts recorded, later value derived (declared rule, no silent loss)
PROBE P15 PASS every command (accepted and rejected) has exactly one audited CommandOutcome; rejection carries reason
PROBE P16 PASS every entity genesis traces to a receipted accepted command (no mutation without audit)
PROBE P17 PASS idempotency index is exactly consistent with CommandOutcome facts (an index, not a shadow store)
PROBE P19 PASS retired QR persists as record but never resolves active; exactly one active at all times
ALL PROBES PASS (exit 0)
```

| # | Attack | Section | Result | Evidence | Disposition |
|---|---|---|---|---|---|
| P1 | Cross-tenant write via every reference kind (worker, project, site, requirement, QR, invitation) | §8 B1, DM-INV-5, AD-INV-9 | All rejected `server rejected` (6/6) | probe output; domain.js tenantEntity L408–419 | MITIGATED |
| P2 | Cross-tenant read/enumeration incl. Person-without-membership and foreign Company entity | §8 B1, §7.15 | All reads return null; enumeration clean | probe output; readForCompany L207–221, listForCompany L223–225; M1-AC-12 | MITIGATED |
| P3 | Indirect cross-tenant reference: `named_workers` targeting a foreign Worker id, then acting on it | §8 B1, §4.2 | No actionable path materialises (verify against foreign worker rejected) | probe output | MITIGATED |
| P4 | Duplicate delivery of entity-creating commands (CreateCompany, AcceptInvitation, IssueQr) | §8 G1/C2, §6.10.3 | Applied once; replay marked `duplicate: true` | probe output; execute() L329–336; M1-AC-4 | MITIGATED |
| P5 | commandId reuse with a *different* payload (forged retry) | §8 C2, M0 §G | Replays first outcome; zero new facts/entities | probe output; commandOutcomes idempotency record L67 | MITIGATED |
| P6 | Dual-keying: two identities for one logical action; identity change across layers | §8 A2 | Single id per entity, generated where born; no offline-born entities in M1 (online path only) | probe output | MITIGATED |
| P7 | Edit an F record via a returned object reference | §8 D4, DM-INV-2 | Deep-frozen at creation; mutation throws/no-ops; value unchanged | probe output; deepFreeze L79–86, appendFact L97–105 | MITIGATED |
| P8 | Edit an E genesis record via reference | §8 D4 | Deep-frozen | probe output; createEntity L106–109 | MITIGATED |
| P9 | Reach hard deletion via any exported path | §8 H1/H5 | No delete/remove/destroy/purge export exists | probe output | MITIGATED |
| P10 | Stored status/flag becoming authoritative (profile, capabilities, lifecycle, readiness) | §8 A4, WC-INV-6/13 | No suspect stored field on any entity; Worker carries only immutable creation fact; Project/Site carry only immutable entry state | probe output; M1-AC-3; derivation functions L131–195 | MITIGATED |
| P11 | F record embedding a derived value as input | §8 E3 | No fact payload contains a derived value | probe output | MITIGATED |
| P12 | Offline durability: committed action lost after restart; queued action dropped silently; local rejection queued | §8 C1, G3, F1–F4 | Not executable: offline queue is halted AC-11 scope (AMB-002). No M1 mutation is declared offline-capable in this build, so there is no queue to attack. | open-items.md AMB-002 | DEFERRED — AMB-002 resolution, then M1-AC-11 |
| P13 | Same-worker same-field concurrent profile writes resolve by undeclared rule or silently | §8 C6, §6.10.3 | Declared rule executed: later timestamp wins, both recorded | probe output | MITIGATED |
| P14 | Concurrent QR rotations race (two-active or zero window) | §6.3.3 | Single-authority core serialises commands; distributed arrival ordering is a sync-layer property not simulable in the M1 domain core | M0 command-sync-model §5 governs the sync layer | DEFERRED — first milestone implementing two-sided sync execution |
| P15 | Rejected command disappears from audit | §8 D1, C9 | Every command yields exactly one CommandOutcome; rejection carries reason | probe output; M1-AC-13 | MITIGATED |
| P16 | Domain mutation without an F record | §8 D1 | Every entity genesis commandId traces to a receipted accepted command | probe output | MITIGATED |
| P17 | Shadow state: idempotency index diverging from fact stream | §8 A1, M0 "no parallel audit store" | commandOutcomes index proven exactly consistent with CommandOutcome facts | probe output | MITIGATED |
| P18 | Offline reads: stale presented as current; locally-committed presented as server-confirmed | §8 E2, F1 | Not executable: cached read models are halted AC-11 scope (AMB-002) | open-items.md AMB-002 | DEFERRED — AMB-002 resolution, then M1-AC-11 |
| P19 | Retired QR resolves as active; two active QRs; zero-active rotation window | WC-INV-7, §6.3.3 | Retired identities never resolve active; exactly one active at all times; rotation validates fully before mutating | probe output; M1-AC-10 | MITIGATED |
| P20 | Retention destruction reachable from a user path; RetentionDestructionEvent self-destroyed | §8 H5 | Retention destruction is not implemented in M1 (Platform-scope, later milestone); no destruction path exists to attack (P9) | M1 contract out-of-scope list | DEFERRED — Platform retention milestone |
| P21 | Progress/attendance adversarial set (double verification, reversal erasure, CRITICAL blocker bypass, check-out before check-in, offline gate bypass) | §6.5, §6.6, §6.7 | Entity classes not implemented in M1 (AC-14 enforces absence) | M1 contract out-of-scope list | DEFERRED — M5/M6/M7/M8 respectively |

## Interpretation notes

- **Zero-active QR after revocation.** §6.3.3's "no observable zero" clause
  scopes to the rotation atomicity window ("while QR-enabled and not
  offboarded"). Revocation is defined as "retires without replacement"
  (WC-INV-7), so a legitimately revoked active worker holds zero active QR.
  The probe verifies the rotation window, not the post-revocation state.
- **E3 boundary.** Validation guards read derived state (e.g. lifecycle) as
  *preconditions*; E3 prohibits derived values as fact *content*. No fact
  payload carries a derived value (P11). Recorded to keep the distinction
  explicit.

## Anti-pattern check (Skill 07 self-check)

- No probe is framed "does this work"; each attacks a specific invariant.
- Probes execute against the implementation; none cites "the tests pass" as
  evidence.
- Every EXPOSED finding would raise a BLOCKER_RECORD: there are none.
- Every DEFERRED probe names its target milestone or AMB-002 resolution.
