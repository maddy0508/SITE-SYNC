# M0 Evidence — Adversarial Audit

Authority: KIMI/SKILLS/07 (required format and dispositions). Method: for each
invariant claimed, the probe asks how the M0 architecture could *appear*
correct while violating the blueprint. At M0 the artifacts are documents, so
"MITIGATED" means the architecture text explicitly closes the attack with a
named mechanism and the closure is structurally testable; "DEFERRED" means the
attack can only be executed against running code — target milestone named.
No EXPOSED finding may remain open without a BLOCKER_RECORD.

| # | Attack | Section | Result | Evidence | Disposition |
|---|---|---|---|---|---|
| 1 | Privileged DB role bypasses tenant isolation | §8 B1 | Architecture requires non-serving privileged roles, no bypass grant on serving role, in-transaction scope assertion on every server-side path | architecture.md §A item 3 | MITIGATED (contract); runtime probe DEFERRED → M1 (`tenancy-isolation.structural.test`) |
| 2 | Application-layer path reaches another Company's data | §8 B1/B3 | Storage-level filtering on every path incl. reporting/sync; no caller-supplied tenancy key | architecture.md §A; persistence-model.md §1.4 | MITIGATED (contract); DEFERRED runtime → M1 |
| 3 | Cross-Company reference created indirectly | §8 B3 | TransferEvent successor linkage is the only cross-tenant reference | persistence-model.md §1.1 | MITIGATED (contract) |
| 4 | Two commands produce two entities for one logical action | §8 A2, G1 | Single client-generated command identity; CommandReceipt dedupe in one transaction | command-sync-model.md §1/§4 | MITIGATED (contract); DEFERRED runtime → M10 |
| 5 | Entity identity changes across local/server (dual-keying) | §8 A2 | Single identity generated where born; identical on both sides | persistence-model.md §3 | MITIGATED (contract) |
| 6 | Successor identity reused after transfer | §8 A2a | Old identity remains unreferenced and unreused | architecture.md §B item 2 | MITIGATED (contract) |
| 7 | User path edits an F record | §8 D4 | Serving role holds INSERT/SELECT only on F tables; no update path in model | persistence-model.md §1.2 | MITIGATED (contract); DEFERRED runtime → M1 |
| 8 | F record deleted via cascade | §8 D4/H1 | No cascade may reach F; archival is a state change | architecture.md §D item 2 | MITIGATED (contract) |
| 9 | Retention destruction reachable from user action | §8 H5 | Platform-only retention role; writes RetentionDestructionEvent first; event survives | architecture.md §O | MITIGATED (contract) |
| 10 | Stored D value becomes authoritative | §8 A4/E3 | Materialisations marked non-authoritative; commands never validate against D rows | architecture.md §E rules 1–2 | MITIGATED (contract) |
| 11 | F record reads a D value as input | §8 E3 | Prohibited explicitly; validation is against F state + disclosed cached derivations | architecture.md §E rule 2 | MITIGATED (contract) |
| 12 | D value and source disagree silently | §8 E2, OS-INV-5 | Freshness state four-valued; divergence converges or discloses | architecture.md §L; command-sync-model.md §6 | MITIGATED (contract) |
| 13 | Committed action disappears after restart | §8 C1/G3 | Atomic durable local commit incl. queue entry; survives process death | offline-reconciliation-model.md §2; persistence-model.md §2.2 | MITIGATED (contract); DEFERRED runtime → M10 |
| 14 | Queued action dropped without disclosure | §8 F4 | No silent eviction; retained until confirmed or abandoned with reason | architecture.md §H item 4 | MITIGATED (contract) |
| 15 | Local rejection queued anyway | §M0.3.7 | Locally rejected is terminal, produces no QueueEntry | command-sync-model.md §2 | MITIGATED (contract); structural test m0-ac-04 |
| 16 | Duplicate delivery applies twice | §8 G1 | Receipt keyed by command identity; atomic apply+receipt | command-sync-model.md §4 | MITIGATED (contract); DEFERRED runtime → M10 |
| 17 | Server-assigned identity undermines client identity | §8 A2/C2 | Server never re-keys; client identity is the only identity | command-sync-model.md §1 | MITIGATED (contract) |
| 18 | Two entity classes silently resolve by different rules than declared | §8 C6 | Per-class table is exhaustive over §6.10.3 + domain sections; global LWW rejected | command-sync-model.md §5; test m0-ac-09 | MITIGATED (structural test) |
| 19 | Conflict resolves silently | §8 C6, OS-INV-5 | server conflicted outcome audited; resolutions recorded | command-sync-model.md §2/§6 | MITIGATED (contract) |
| 20 | Rejected command disappears from audit | §8 D1/C9 | CommandOutcome retained independent of fact production | audit-model.md §1; command-sync-model.md §2 | MITIGATED (contract) |
| 21 | Domain mutation without F record | §7 DM-INV-2/9 | All mutations are commands producing F + CommandOutcome; admin produces canonical F only | audit-model.md §1; authorization-scope-model.md §3 | MITIGATED (contract) |
| 22 | Audit entry without corresponding fact | §7.8 | Audit is a projection; entries are F records by construction | audit-model.md §1 | MITIGATED (contract) |
| 23 | Reporting layer authoritative | §6.9 REP-INV-1/10 | Reports are D; exports are F events; reports never mutate facts | architecture.md §E/§cross-cutting; test m0-ac-06 | MITIGATED (structural test) |
| 24 | Admin log separate from F | §6.11 AD-INV-2 | Prohibited; overrides are domain-canonical F | audit-model.md §1 | MITIGATED (structural test) |
| 25 | Messaging store becomes a fact | §6.8 COM-INV-2 | No in-app messaging; no CommunicationInitiated in v1 | conceptual-model-mapping.md §E note | MITIGATED (contract) |
| 26 | Shadow state updated independently of F | §M0.2 | Cross-cutting prohibition; E representation only from identity+facts | architecture.md §C/§cross-cutting | MITIGATED (structural test) |
| 27 | Stale data presented as current | §8 E2/F1 | Freshness four-valued on every D surface; stale never current | architecture.md §L; offline-reconciliation-model.md §3 | MITIGATED (contract) |
| 28 | Locally committed fact presented as server-confirmed | §8 E2 | Distinct freshness values; "confirmed" label only for server accepted | architecture.md §L; command-sync-model.md §2 | MITIGATED (contract) |
| 29 | Old/retired QR creates attendance; two active QRs; zero active QRs for active Worker | §6.3 | QR identity model is NEW (SR-008.i); rotation/revocation NEW (SR-008.j); nothing promoted at M0, so no attack surface exists yet; invariants anchor M4 design | salvage-register.md SR-008.h–l | DEFERRED → M4 (no QR implementation exists to attack) |
| 30 | Asset stores complete=true as authority | §6.6 PR-INV-1 | E mapping: Asset never stores complete; progress derived | conceptual-model-mapping.md Asset row | MITIGATED (contract) |
| 31 | Claim verified twice; claim survives reversal; CRITICAL blocker bypassed | §6.6 | Verifications single; reversal → disputed; gating rules declared | command-sync-model.md §5; architecture.md §E | MITIGATED (contract); DEFERRED runtime → M7/M8 |
| 32 | Check-out precedes check-in; overlapping shifts; readiness bypass offline; work date drift | §6.5 | Local preconditions documented (open shift, no conflicting shift); readiness violation at sync rejected+preserved; drift = explicit rejection (G5) | offline-reconciliation-model.md §2; command-sync-model.md §5/§6 | MITIGATED (contract); DEFERRED runtime → M6 |
| 33 | Archived Site receives new facts | §8 H2/§7.12 | F records for archived Sites accepted (§7.12); archival preserves facts; gating is a domain rule anchored for M2+ | architecture.md §D | MITIGATED (contract) |
| 34 | Hard delete reachable from user path | §8 H1 | No user path; retention role separate | persistence-model.md §1.2 | MITIGATED (contract) |
| 35 | RetentionDestructionEvent destroyed by its own retention | §8 H5/§6.11.4 | Event not part of any Company's retention set; survives | architecture.md §O item 2 | MITIGATED (contract) |
| 36 | §8 compliance matrix quietly drops a constraint | §8.K | Structural test enumerates all 43 identifiers; missing → FAIL | m0-ac-01.test.mjs | MITIGATED (structural test) |
| 37 | Undefined §8.K criteria silently treated as satisfied | §8.K | EP-1.0: test failed unless matrix marked them UNVERIFIABLE with AMB-001. EP-2.0 (AMB-001 RESOLVED): transformed test asserts amended §8.K identifies M0-AC-1..10 as operative and that no AC-ARCH-0.x reference remains outside the amendment record | m0-ac-01.test.mjs (fc536ef); open-items.md AMB-001 | MITIGATED — AMB-001 RESOLVED 2026-09-27; probe re-targeted and passing under EP-2.0 |
| 38 | Salvage promoted because "it works" or by name resemblance | §M0.4; Skill 03 | Register rows limited to REFERENCE/FREEZE/SALVAGE/DISCARD/OPEN/PENDING/NEW; promotion ledger empty; git check blocks code changes | salvage-register.md; m0-ac-10.test.mjs | MITIGATED (structural test) |

Unresolved: none EXPOSED. AMB-001 (probe 37) is RESOLVED (2026-09-27,
blueprint amendment at commit 0eefbd6, operative package EP-2.0); the probe
was re-targeted to the amended §8.K and passes. No new probes were required by
the M0-AC-1 re-verification: probes 1–38 remain as recorded, with probe 37's
disposition updated above.
