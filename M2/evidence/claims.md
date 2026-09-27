# M2 Claims

Every claim cites: file, line range, commit SHA, command, output, and the
M2-AC it supports. Line ranges refer to the file at the cited commit
(`891fa7a` for `M2/src/domain.js`).

Suite command (all behavioural claims):
`node M2/acceptance-tests/run-all.mjs` at E2 HEAD → `15/15 present tests
passing; 0 expected files absent`, exit 0 (three of the fifteen are halt
sentinels; see acceptance-map.md).
Probe command: `node M2/evidence/adversarial-probes.mjs` at `b33ff78` →
`ALL PROBES PASS (exit 0)`.

## Lifecycle

1. **Project lifecycle** draft→active→suspended→active→completed→archived
   and draft→cancelled, each transition emitting one ProjectLifecycleEvent;
   invalid transitions rejected with state unchanged.
   `M2/src/domain.js` L171–186 (derivation), L416–424 (transition table),
   L426–447 (handler). Commit `891fa7a`. Evidence: `m2-ac-01.test.mjs` PASS
   (event stream exactly `['activated','suspended','resumed','completed','archived']`;
   zero-site second project rejects activation; archived/cancelled terminal).
   Supports M2-AC-1.

2. **PS-INV-2 enforced at activation**: a Project with zero Sites cannot
   activate (`'activation requires at least one Site (PS-INV-2)'`).
   `M2/src/domain.js` L435–439. Commit `891fa7a`. Evidence: m2-ac-01 PASS
   (rejection + state unchanged). Supports M2-AC-1.

3. **Site lifecycle** planned→mobilising→active→demobilising→closed→archived,
   one SiteLifecycleEvent per transition; invalid transitions rejected.
   `M2/src/domain.js` L189–204, L449–460. Commit `891fa7a`. Evidence:
   m2-ac-02 PASS (stream `['mobilising','activated','demobilising','closed','archived']`).
   Supports M2-AC-2.

4. **Closure cascade**: CloseSite marks the closed Site's non-removed
   SiteAssignments `removed` with the fixed reason `"site closure"`; records
   are state-changed via LifecycleEvent facts, never deleted; the parent
   ProjectAssignment is untouched (noted interpretation #1,
   open-items.md).
   `M2/src/domain.js` L461–476. Commit `891fa7a`. Evidence: m2-ac-02 PASS
   (exactly one removal fact, reason exact, entity retained, parent
   assignment still `assigned`); probe Q11. Supports M2-AC-2, M2-AC-3.

## Suspension

5. **Project suspension overlay is D-class**: `siteOperationalStatus`
   derives `{projectSuspended, operational}` from the Project lifecycle
   stream alone; suspension emits no SiteLifecycleEvent and alters no Site
   state; resume clears it; overlay stable under unrelated fact growth.
   `M2/src/domain.js` L258–264. Commit `891fa7a`. Evidence: m2-ac-04 PASS;
   probe Q13 (Site genesis byte-identical across suspend/resume).
   Supports M2-AC-4.

6. **No independent Site suspension mechanism exists** (AMB-004 halt).
   Verified by sentinel `m2-ac-05.test.mjs` (comment-stripped source scan:
   no SuspendSite/UnsuspendSite/SiteSuspension/siteSuspended/suspendSite;
   overlay derivation present) and AMB-004 record in open-items.md.
   Commit `b33ff78`. Supports M2-AC-5 halt integrity (criterion BLOCKED).

## External parties

7. **ExternalParty** is a Company-scoped E record; company_admin
   create/update/archive; partyType vocabulary `epc_client|subcontractor`
   (§6.1.2); archive terminal; update is an immutable LifecycleEvent fact
   with derived profile (genesis unchanged); cross-tenant access rejected.
   `M2/src/domain.js` L222–241, L506–539. Commit `891fa7a`. Evidence:
   m2-ac-06 PASS; probes Q1, Q3, Q11. Supports M2-AC-6.

8. **ProjectExternalParty** follows §7.5: creation fact `associated`,
   removal fact `removed`, state derived; no independent lifecycle
   vocabulary; removed is not reactivated; re-association is a new
   identity; duplicate active association rejected (noted interpretation
   #3); archived parties cannot be newly associated; tenancy bounded.
   `M2/src/domain.js` L244–253, L541–577. Commit `891fa7a`. Evidence:
   m2-ac-07 PASS (LifecycleEvent verb set exactly `{associated, removed}`);
   probe Q2. Supports M2-AC-7.

9. **No transfer machinery exists** (AMB-003 halt): `TransferProject` is an
   unknown command; no TransferEvent type; sentinel `m2-ac-08.test.mjs` +
   probe Q12. Commit `b33ff78`. Supports M2-AC-8 halt integrity (criterion
   BLOCKED).

## Handover

10. **HandoverRecord is an immutable F** carrying freeze timestamp
    (`snapshot.frozenAt === record.serverTimestamp`) and the M2 freeze
    scope: current lifecycle state, non-removed assignments with state at
    freeze, latest-revision Requirement set with scope — entity plus
    containment descendants; Company-scope excluded. Subsequent
    lifecycle/assignment/Requirement changes leave the frozen record
    byte-identical (`active` stays `active`); a later handover is a new
    point-in-time record.
    `M2/src/domain.js` L322–372 (snapshots), L579–607 (handler).
    Commit `891fa7a`. Evidence: m2-ac-09 PASS (incl. strict-mode mutation
    attempt throws); probe Q14. Supports M2-AC-9.

## Readiness and assignments

11. **Per-Site readiness** within one Project: a worker assigned only to
    Site A is `site_ready` at A and not at B; M2-aware derivation treats a
    `paused` assignment as conferring no readiness (M1's derivation cannot
    see `paused`; M1 source untouched).
    `M2/src/domain.js` L271–319. Commit `891fa7a`. Evidence: m2-ac-10
    PASS. Supports M2-AC-10.

12. **Requirement default-apply is live**: a project-scope Requirement
    gates readiness at every contained Site; no opt-out mechanism exists
    (AMB-005 halt). `M2/src/domain.js` L305–319 (scope predicate).
    Commit `891fa7a` (derivation), `b33ff78` (record). Evidence: sentinel
    m2-ac-11 PASS (failing requirement surfaced at both sites; source scan
    clean). Supports M2-AC-11 halt integrity (criterion BLOCKED).

13. **Assignment states** assigned→active→paused→removed on both
    ProjectAssignment and SiteAssignment; `assigned→paused` rejected;
    removal reason mandatory (§6.3.6), pause/resume carry no reason;
    `removed` terminal; re-assignment is a new identity; facts ride the
    catalogued generic LifecycleEvent with entityType attribution (no
    bespoke AssignmentEvent).
    `M2/src/domain.js` L207–219, L478–502. Commit `891fa7a`. Evidence:
    m2-ac-12 PASS (stream `['activated','paused','resumed','removed']`).
    Supports M2-AC-12.

## Permissions and audit

14. **Permissions are role × scope × membership**: plain workers rejected
    on every M2 surface (13/13 in test) with state unmoved; supervisor
    admitted to assignment transitions only; company_admin admitted to all;
    cross-tenant admin rejected 5/5; suspended actor rejected.
    `M2/src/domain.js` L33–62 (auth table), L649–697 (actor resolution,
    capability check). Commit `891fa7a`. Evidence: m2-ac-13 PASS.
    Supports M2-AC-13.

15. **§7.8 audit fields** on every M2 F record (ProjectLifecycleEvent,
    SiteLifecycleEvent, LifecycleEvent, HandoverRecord) and M2 E genesis:
    id, commandId, actor, deviceId, deviceTimestamp, serverTimestamp;
    commandId attributable to an accepted command; reason present exactly
    where mandated (suspension §6.11.6, removal §6.3.6, closure cascade
    fixed "site closure") and absent where not.
    `M2/src/domain.js` L88–114 (auditFields/appendFact/createEntity),
    L426–502 (reason placement). Commit `891fa7a`. Evidence: m2-ac-03 and
    m2-ac-14 PASS; probe Q8. Supports M2-AC-3, M2-AC-14.

## Scope and substrate

16. **Scope boundary**: the post-M2 delta (`cfda19f..HEAD`, excluding the
    EP-5.0 freeze commits and M1 gate commit by literal SHA — see
    acceptance-map chronology) touches only `M2/`; comment-stripped M2
    source contains no M3+ type and no transfer vocabulary; the runtime
    command catalogue is exactly the 21 M2 commands.
    `M2/acceptance-tests/m2-ac-15.test.mjs`. Commits `6134b22`
    (substantive), `ed59903` (whitelist). Evidence: m2-ac-15 PASS.
    Supports M2-AC-15.

17. **M1 unmodified, M1 substrate reused**: M2 command execution shares the
    store, id sequence, outcome map, and outcome vocabulary with M1;
    non-M2 command types delegate to M1's execute; idempotent replay is
    exact (duplicate delivery and commandId reuse return the recorded
    outcome; no reapplication); the offline-capable set is unchanged and no
    M2 command enters it. `M2/src/domain.js` L120–152 (reject/accept),
    L649–697 (execute). Commit `891fa7a`. Evidence: probes Q5, Q6, Q9;
    M1 behavioural regression 13/13 PASS (m1-ac-14 diff-scope disclosure in
    acceptance-map.md). Supports M2-AC-13/14/15 substrate claims.
