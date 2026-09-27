# M0 Command & Sync Model — commands, outcomes, idempotency, conflict rules

Authority: MASTER_BLUEPRINT §M0.3.6–§M0.3.11; §6.10 (Offline / Sync); §7.10;
§8 AC-ARCH-C1–C10, G1–G5; §6.4.3, §6.5.8, §6.6.3, §6.7 Amendment 2 conflict
semantics.

## 1. Command identity (AC-ARCH-C2, OS-INV-4)

One stable command identity per logical action: client-generated at intent
creation, immutable, persisted across retries, restarts, and duplicate
delivery, and carried on every record the command produces — LocalCommand,
local F records, transmission envelope, CommandReceipt, CommandOutcome, server
F records. One identity across all layers (§M0.3.7). Entity identity and
command identity are distinct; both are single (AC-ARCH-A2, DM-INV-11).

## 2. CommandOutcome vocabulary (§M0.3.7, AC-ARCH-C5/C5a/C9)

The outcome vocabulary is fixed and exhaustive, with explicit local/server
distinction:

| Outcome | Boundary | Meaning | Terminal? |
|---|---|---|---|
| locally rejected | local | precondition/authority validation failed locally (AC-ARCH-F1); the command never enters the queue | yes — terminal and not queued |
| locally committed | local | durable local commit achieved (AC-ARCH-C1); queued for transmission | no — in flight |
| server accepted | server | server applied the command exactly once; CommandReceipt written | yes |
| server rejected | server | server refused with reason; preserved as an auditable record | yes |
| server failed | server | terminal transmission/application failure after bounded retries; surfaced, actionable (AC-ARCH-G2) | yes |
| server conflicted | server | resolved by the declared per-entity-class rule (§5 below); resolution audited | yes |

- "confirmed" is permitted as a UI label for server accepted only (C5a).
- A locally rejected command is terminal and not queued — it produces a local
  CommandOutcome record and no QueueEntry (§M0.3.7; Skill 05 checklist).
- CommandOutcome retention (AC-ARCH-C9): every outcome — including rejected,
  failed, and conflicted — is retained as an auditable F-class record
  independent of domain fact production, on both sides (offline/online parity,
  AC-ARCH-D6).

## 3. Sync lifecycle (§6.10.3, OS-INV-7, AC-ARCH-F3)

Per command, observable to the user per action:

```text
committed → queued → transmitting → accepted
                                  → rejected (server) → user-visible, actionable
                                  → failed (terminal) → user-visible, actionable
```

(UI labels may render "confirmed" for accepted per C5a.) Partial sync is
per-command; no all-or-nothing across the queue (§6.10.3). Connectivity loss
mid-transmission: local commit preserved, command returns to queued, no partial
server mutation (AC-ARCH-G4).

## 4. Idempotency (AC-ARCH-G1, §7.10)

Server application is idempotent via CommandReceipt keyed by command identity:
first delivery applies facts + receipt in one transaction; duplicates return
the recorded outcome without reapplication (§7.12: local without receipt →
retransmit, idempotent; duplicate F-records → one receipt). Domain-level
idempotency where the blueprint declares it: duplicate attendance command
ACCEPT (§6.5.8); duplicate pre-start acknowledgement idempotent per
(worker, content item, work date) (§6.4.2); duplicate closure idempotent
(§6.4.5).

## 5. Conflict rules — declared per entity class (AC-ARCH-C6)

"Last write wins" is not a global default (§6.10.3). No global LWW exists
anywhere in this model; every conflicting class has a declared rule:

| Entity class | Declared rule | Anchor |
|---|---|---|
| Worker profile / config, same worker, same field | later wins (by timestamp), both recorded | §6.10.3 table |
| Shift boundaries (same worker) | attempted conflicting boundary is locally rejected; user prompted | §6.10.3 table |
| Evidence attachment | additive; no conflict | §6.10.3 table |
| Blocker state transition | local transition authoritative for worker's intent; server reconciles against server-authoritative current state | §6.10.3 table, §6.7 Amendment 2 |
| QA observation transition | accepted only when valid against server-authoritative current state with actor authority; concurrent transitions preserved; where two valid transitions race, the server's declared transition ordering determines the resulting derived state; none silently discarded | §6.7 Amendment 2 |
| Readiness-gate violation discovered at sync | command rejected; user notified; preserved as rejected record | §6.10.3 table |
| Completion claims | concurrent claims additive; over-claim surfaced, never silent | §6.6.3, PR-INV-9 |
| Task transitions | later wins | §6.6.3 |
| Completion verifications | single per claim; concurrent second verification rejected | §6.6.3 |
| Reversals | additive; independently resolved (reversal_upheld / reversal_dismissed, attributed) | §6.6.3 |
| Task reassignment | later wins | §6.6.3 |
| Pre-start participant recording | additive; duplicates idempotent | §6.4.3 |
| Pre-start acknowledgement | additive; idempotent per (worker, content item, work date) | §6.4.3 |
| Pre-start closure | first accepted wins; second rejected; corrections are the mechanism | §6.4.3 |
| Pre-start content revision | does not affect open or closed pre-starts | §6.4.3 |
| C-record changes (incl. ReportConfig) | declared ordering; both audited; cannot override scope rules | §6.9.3, §6.10.3, REP-INV-8 |
| Attendance duplicate command | duplicate delivery accepted once (idempotent) | §6.5.8 |

## 6. Ordering and reconciliation (AC-ARCH-C4/C7, OS-INV-9)

Ordering is per-entity, not global: causally related commands on the same
entity apply in user-performed order; dependencies are enforced locally before
queueing. Reconciliation on reconnect: retire succeeded commands; surface
rejected/failed with reason and options (retry, correct, abandon with reason);
resolve server-side conflicts per §5; divergences are attributed to specific
commands and converge or are disclosed — never silently overwritten (§6.10.3,
OS-INV-5). Clock drift: explicit rejection, never silent reordering
(AC-ARCH-G5).

## 7. Two-sided source-of-truth (AC-ARCH-C8, DM-INV-10/10a)

Local slice is locally authoritative until reconciled (DM-INV-10a: for the
local slice, not globally). Server is authoritative for the enumerated set:
server-governed validation, uniqueness, authorization, conflict resolution,
designated transitions (DM-INV-10), and all §6.10.2 connectivity-required
operations. Neither side is a cache of the other. See
M0/offline-reconciliation-model.md for the full durable-intent → convergence
pipeline.
