# M1 Claims

Every claim cites file, line range, commit SHA, command, output, and the
M1-AC it supports. Implementation commit: `62241d3f0699b46a55d169fcb72392db2a2f2eb5`
(abbreviated `62241d3`). All commands run at that commit unless noted.

## C-1 — Company creation is atomic and establishes the full membership graph

Claim: CreateCompany produces Company (E), Person (E, Platform), Worker (E,
Company) and the founder company_admin CapabilityGrant in one atomic apply;
an invalid command commits no domain state and is audited as rejected.

- File: M1/src/domain.js L426–455 (handler), L231–256 (reject/accept), L97–110 (frozen records)
- SHA: 62241d3
- Command: `node M1/acceptance-tests/m1-ac-01.test.mjs`
- Output: `M1-AC-1: PASS`
- Supports: M1-AC-1

## C-2 — Person continuity across Companies holds

Claim: one human (email identity) accepting invitations to two Companies
yields exactly one Person (Platform) and two distinct Worker memberships, one
per Company.

- File: M1/src/domain.js L479–510 (AcceptInvitation), L259–273 (person resolution, activeWorkerFor)
- SHA: 62241d3
- Command: `node M1/acceptance-tests/m1-ac-02.test.mjs`
- Output: `M1-AC-2: PASS`
- Supports: M1-AC-2

## C-3 — Worker profile is derived; no stored authoritative profile exists

Claim: deriveProfile folds the immutable creation fact plus WorkerProfileChange
events; the Worker entity carries no profile fields.

- File: M1/src/domain.js L131–140 (deriveProfile), L275–293 (createWorker creation fact)
- SHA: 62241d3
- Command: `node M1/acceptance-tests/m1-ac-03.test.mjs`
- Output: `M1-AC-3: PASS`
- Supports: M1-AC-3

## C-4 — Invitation lifecycle is pending → accepted | cancelled | expired, with distinct identity from Worker

Claim: all three terminal transitions behave per §6.3.2; acceptance creates a
Worker; duplicate delivery is idempotent; re-acceptance under a new command is
rejected; duplicate pending invitations are rejected.

- File: M1/src/domain.js L462–477 (CreateInvitation), L479–510 (accept), L512–530 (cancel/expire)
- SHA: 62241d3
- Command: `node M1/acceptance-tests/m1-ac-04.test.mjs`
- Output: `M1-AC-4: PASS`
- Supports: M1-AC-4

## C-5 — Requirements are typed, scoped, versioned, and carry §4.2 attributes

Claim: the closed type set (document | induction | acknowledgement), closed
scope set (company | project | site), applies_to, requires_verification,
expiry, and revision are all enforced and carried; revision produces a
successor in the same group.

- File: M1/src/domain.js L676–709 (CreateRequirement), L711–753 (ReviseRequirement), L44–47 (closed sets)
- SHA: 62241d3
- Command: `node M1/acceptance-tests/m1-ac-05.test.mjs`
- Output: `M1-AC-5: PASS`
- Supports: M1-AC-5

## C-6 — DocumentRevision lifecycle matches §4.3 including time-driven states and renewal

Claim: missing → uploaded → under_review → verified | rejected; verified →
expiring_soon → expired (system-attributed facts via tick); renewal re-enters
at uploaded; self-declared documents skip under_review.

- File: M1/src/domain.js L760–839 (document handlers), L1045–1087 (tick)
- SHA: 62241d3
- Command: `node M1/acceptance-tests/m1-ac-06.test.mjs`
- Output: `M1-AC-6: PASS`
- Supports: M1-AC-6

## C-7 — InductionCompletion lifecycle matches §4.3

Claim: not_started → in_progress → completed → expired | superseded, with
supersession by revision and expiry by duration_from_satisfaction.

- File: M1/src/domain.js L841–870 (induction handlers), L1045–1082 (tick), L711–753 (revision supersession)
- SHA: 62241d3
- Command: `node M1/acceptance-tests/m1-ac-07.test.mjs`
- Output: `M1-AC-7: PASS`
- Supports: M1-AC-7

## C-8 — Acknowledgement lifecycle matches §4.3; presented and acknowledged are distinct auditable facts

Claim: required → presented → acknowledged → superseded | expired; the two
states are separate F records with separate command identities and §7.8 audit
fields.

- File: M1/src/domain.js L872–905 (acknowledgement handlers)
- SHA: 62241d3
- Command: `node M1/acceptance-tests/m1-ac-08.test.mjs`
- Output: `M1-AC-8: PASS`
- Supports: M1-AC-8

## C-9 — QR identity lifecycle enforces at-most-one-active with atomic rotation and replacement-free revocation

Claim: issue creates one active identity; rotation atomically retires prior
and creates successor (validated fully before mutation); revocation retires
without replacement and requires reason; offboarding retires the active QR.

- File: M1/src/domain.js L947–1017 (issue/rotate/revoke), L178–188 (activeQrIdentity), L633–674 (offboarding retire)
- SHA: 62241d3
- Command: `node M1/acceptance-tests/m1-ac-10.test.mjs`
- Output: `M1-AC-10: PASS`
- Supports: M1-AC-10

## C-10 — Tenant isolation holds at storage and application layers

Claim: every Company-owned record is tenancy-keyed; cross-tenant reads return
nothing; cross-tenant writes are rejected; a Person is visible only to
Companies of membership (§7.15).

- File: M1/src/domain.js L207–225 (bounded reads), L408–419 (tenantEntity), companyId carried on all Company-scoped entities/facts
- SHA: 62241d3
- Command: `node M1/acceptance-tests/m1-ac-12.test.mjs && node M1/evidence/adversarial-probes.mjs`
- Output: `M1-AC-12: PASS`; probes P1–P3 PASS
- Supports: M1-AC-12

## C-11 — Every M1 F record carries the §7.8 audit fields; reason where mandatory

Claim: event identity, command identity, actor, device identity, device
timestamp, server sync timestamp on every F record; reason on suspension,
offboarding, capability revocation, QR revocation (§6.3.6); CommandOutcome
audited for rejections (AC-ARCH-C9); actor/subject distinct (AC-ARCH-D3).

- File: M1/src/domain.js L87–95 (auditFields), L97–105 (appendFact), L231–256 (outcome/receipt records)
- SHA: 62241d3
- Command: `node M1/acceptance-tests/m1-ac-13.test.mjs`
- Output: `M1-AC-13: PASS`
- Supports: M1-AC-13

## C-12 — M1 introduces no out-of-scope implementation

Claim: the diff from the M1-start commit touches only M1/; the source
catalogue contains no prohibited §7 types and no M2+ Project/Site lifecycle
states; runtime entities are the in-scope set with Project pinned `draft` and
Site pinned `planned`.

- File: M1/acceptance-tests/m1-ac-14.test.mjs (entire); M1/src/domain.js L533–544 (entry states)
- SHA: 62241d3
- Command: `node M1/acceptance-tests/m1-ac-14.test.mjs` and `git diff --name-only 4739e9d..HEAD`
- Output: `M1-AC-14: PASS`; diff lists only paths under M1/
- Supports: M1-AC-14

## C-13 — INV-C strict-form provenance holds for every implemented AC

Claim: tests committed first (1d2afc5, amended b79d312), baseline FAIL/ABSENT
at those commits, implementation at 62241d3 passes, ancestry verified.

- File: M1/evidence/acceptance-map.md (full table)
- SHA: 1d2afc5, b79d312, 62241d3
- Commands: `git merge-base --is-ancestor 1d2afc5 62241d3` (exit 0);
  `git merge-base --is-ancestor b79d312 62241d3` (exit 0);
  `node M1/acceptance-tests/run-all.mjs` at b79d312 (11× FAIL-ABSENT + AC-14
  comparison-baseline PASS, exit 1) and at 62241d3 (12/12 PASS, exit 0)
- Supports: M1-AC-1..8, 10, 12, 13 (strict form); M1-AC-14 (comparative-negative)

## C-14 — F records are immutable; no deletion path exists

Claim: all records deep-frozen at creation; the module exports no deletion
function; append-only fact stream.

- File: M1/src/domain.js L79–86 (deepFreeze), L97–110 (applied at both creation points)
- SHA: 62241d3
- Command: `node M1/evidence/adversarial-probes.mjs`
- Output: probes P7, P8, P9 PASS
- Supports: M1-AC-13 (audit integrity), M1-AC-1 (atomicity), Skill 07 immutability probes
