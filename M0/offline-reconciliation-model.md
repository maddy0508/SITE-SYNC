# M0 Offline & Reconciliation Model — durable intent through convergence

Authority: MASTER_BLUEPRINT §6.10 (OS-INV-1..12), §6.10.2 (offline coverage
lists), §7.10, §8 AC-ARCH-C1–C10, E2, F1–F4, G1–G5; M0-AC-3 (coverage split,
including §6.3); KIMI/SKILLS/05 (classification discipline).

## 1. Operation classification (Skill 05 step 1)

Every operation is exactly one of: state-mutating (offline-capable),
read-only (offline-capable), connectivity-required. Classification source is
§6.10.2 plus each domain section's offline sub-list (§6.3–§6.9).

## 2. State-mutating offline coverage (M0-AC-3)

Each action below follows the durable-intent path: local validation against
documented preconditions (AC-ARCH-F1) → atomic durable local commit of
LocalCommand + local F records + QueueEntry before user confirmation
(AC-ARCH-C1/C3, OS-INV-3) → background transmission → terminal server outcome
per the six-state vocabulary (§M0.3.7).

| Offline-mutating action | Durable intent | Local preconditions (documented) | Anchor |
|---|---|---|---|
| sign-in / check-in (QR or equivalent) | durable local commit + queue | cached QR identity valid; site_ready cached; no conflicting open shift | §6.10.2, §6.5, §6.3 WC offline |
| sign-out / check-out | durable local commit + queue | open shift exists locally | §6.10.2, §6.5 |
| break start | durable local commit + queue | open shift; no open break | §6.10.2, §6.5 |
| break end | durable local commit + queue | open break | §6.10.2, §6.5 |
| task start | durable local commit + queue | task cached and assigned | §6.10.2, §6.6.3 |
| task pause | durable local commit + queue | task in progress locally | §6.10.2, §6.6.3 |
| task complete | durable local commit + queue | task accepted/in progress | §6.10.2, §6.6.3 |
| evidence capture (photo, note, signature, file) | durable local commit + queue; binary upload is transmission per §6.10 (Amendment 1) | subject cached; capture metadata incl. location as captured or unavailable | §6.10.2, §6.7 QA-INV-4/10 |
| blocker raise | durable local commit + queue | subject cached | §6.10.2, §6.7 |
| blocker update / acknowledge / resolve (assignee) | durable local commit + queue | blocker cached; assignee authority | §6.10.2, §6.7.2 |
| daily pre-start completion (participant recording) | durable local commit + queue | content cached; participant site-ready per cached readiness; server revalidates on sync | §6.10.2, §6.4.2 DO-INV-8 |
| acknowledgement with signature capture | durable local commit + queue | content cached (§6.4 DO-INV-9); idempotent per (worker, item, work date) | §6.10.2, §6.4.2 |
| attendance correction request | durable local commit + queue | subject event cached | §6.5.8 |
| pre-start presentation against cached content | durable local commit + queue | content cached; presenter capability cached | §6.4.3 |

§6.3 offline capabilities are explicitly included: QR-based sign-in/sign-out
against the cached WorkerQrIdentity, viewing own readiness, and crew/contact
lookups operate offline against cached §6.3 state (§6.10.2 "sign-in/out (QR or
equivalent)", "crew and contact lookups against cached data", "viewing own
readiness").

## 3. Read-only offline coverage (M0-AC-3)

Each read uses a named local cache / read model (recomputable projection,
M0/persistence-model.md §2.2) and exposes freshness state — locally committed /
server-confirmed / stale / unknown (AC-ARCH-E2). Stale data is never presented
as current; reads never write F records (AC-ARCH-E3, Skill 05 checklist).

| Read-only capability | Cache / read model | Freshness mechanism | Anchor |
|---|---|---|---|
| crew lookup | cached CrewMembership projection | freshness state per element | §6.10.2, §6.8.3 |
| contact lookup | cached Worker contact profile fields | freshness state; stale indicated, handoff still permitted | §6.10.2, §6.8.5 |
| viewing own readiness | cached RequirementSatisfaction projection | freshness state | §6.10.2, §4 |
| viewing assigned Sites and status | cached SiteAssignment projection (worker site list) | freshness state | §6.10.2, §6.1 |
| viewing own claims/tasks/cached states | cached task/progress projections | freshness state | §6.6.3 |
| viewing own QA submissions | cached QA/blocker projections | freshness state | §6.7.3 |
| cached pre-start content and daily state | cached PreStartContent projection | freshness-annotated per element | §6.4.3 |
| cached admin reads (profile, user list, project/site list, audit) | cached admin projections | freshness state | §6.11.2 |
| previously generated report result | cached report snapshot | freshness shown; cached only | §6.9.3 |

## 4. Connectivity-required operations (AC-ARCH-C10/F1)

Creating Company/Project/Site, inviting a worker, administrative document
verification, Platform administration, cross-Company operations, report
generation over aggregates, exports, QA verification, blocker verification /
dismissal / escalation, claim verification/rejection/reversal, cross-Site
assignment, pre-start content definition and closure, corrections, and every
administrative mutation (§6.11.3: admin actions do not enter the offline
queue). Attempted offline, each fails locally with a specific reason —
rejected locally — and no partial queue entry is created (AC-ARCH-F1;
Skill 05 checklist).

## 5. Convergence (OS-INV-5, AC-ARCH-C7)

Durable intent → queue → transmission → server outcome → reconciliation:
retire succeeded; surface rejected/failed with reason and options; resolve
conflicts by the declared per-entity-class rule (M0/command-sync-model.md §5);
divergence attributed to specific commands; converge or disclose, never
silently overwrite (§6.10.3). Prolonged offline is a supported state
(OS-INV-12); thresholds OPEN (§6.10.8: 24h visible / 72h escalated draft) —
recorded in M0/evidence/open-items.md.
