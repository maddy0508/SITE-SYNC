# SITE-SYNC Pilot Repository Inspection Report

**Inspection ID:** INSPECT-001
**Date:** 2026-09-24
**Repository:** maddy0508/SITE-SYNC
**Inspected ref:** `main`
**Inspected commit:** `f90b77ab73cb7ae20b1084ad94fb5bc159afa841`
**Inspection branch:** `governance/pilot-inspection`
**Implementation status:** PAUSED — no SS-PILOT-001 implementation performed

## 1. Executive finding

SS-PILOT-001 is **not currently buildable as scoped without introducing a new report domain and associated server/local/sync contracts**.

The repository is not greenfield. It already contains a substantial M1 trust foundation:

- React Native 0.86.0 / TypeScript native Android application
- Supabase/PostgreSQL backend
- PostgreSQL RLS
- durable SQLite persistence
- identity/company/project context
- attendance domain
- M1.7 sync foundation and Supabase attendance transport
- M1.7/M1.8 verification material
- physical Android verification history

However, the existing persistence and sync implementation is specifically centred on **attendance**. No report entity/domain, report persistence model, report mutation contract, report-specific RLS policy, or generic report sync path was found on the inspected main ref.

Per pilot governance, this is a successful inspection outcome, not a failed pilot. Implementation is paused until the prerequisite requirements are defined and approved.

## 2. Platform target

The pilot target is **physical Android hardware**, not emulator-only.

Repository instructions explicitly require physical Android verification for user-facing completion. The repository also records prior physical Android verification for M1.5/M1.6.

For AC-04, an emulator-only run would not earn `DEVICE_VERIFIED`.

No new device verification was performed during inspection.

## 3. Repository state

### Product/application

The repository contains:

`sitesync/`

with:

- `App.tsx`
- React Native Android/iOS projects
- Jest configuration
- TypeScript configuration
- package-lock
- native dependencies

The package declares:

- React Native 0.86.0
- React 19.2.3
- TypeScript 5.8.x
- Jest 29.x
- `@op-engineering/op-sqlite`
- `@supabase/supabase-js`
- native camera/QR dependencies

The repository therefore has the required general application technology for the pilot.

## 4. Existing local persistence

The repository contains:

- `src/database/localPersistence.ts`
- `src/database/sqliteAdapter.ts`
- `src/domain/localPersistence.ts`

The existing local model includes durable attendance/project-roster structures and command-ledger semantics.

The repository rules state that SQLite is local persistence and that durable commands must survive process death.

This satisfies the **general persistence prerequisite**, but not the report-specific persistence requirement.

### Finding

**LOCAL_PERSISTENCE_GENERAL: PRESENT**

**REPORT_LOCAL_MODEL: ABSENT**

## 5. Existing sync infrastructure

The repository contains `src/sync/`, including:

- `syncTransport.ts`
- `supabaseSyncTransport.ts`
- sync orchestration
- M1.7 boundary documentation

The sync foundation explicitly describes an attendance command lifecycle and uses the RPC:

`sync_attendance_command`

The Supabase transport submits:

- command ID
- device installation ID
- project ID
- person ID
- work date
- base revision
- command type
- payload

The current server aggregate is an attendance-day aggregate keyed by project/person/work-date.

### Finding

**SYNC_ENGINE_FOUNDATION: PRESENT**

**REPORT_SYNC_CONTRACT: ABSENT**

The existing sync machinery cannot be assumed to be a generic report synchronisation mechanism.

## 6. Existing identity and tenant model

The repository contains:

- authentication
- person identity
- organisation/company membership
- project assignments
- project context
- device registration

The existing model keeps identity, membership, assignment and permissions distinct.

This is directly relevant to the pilot because SS-PILOT-001 requires report ownership/binding to survive offline operation.

### Finding

**IDENTITY/TENANCY FOUNDATION: PRESENT**

## 7. Existing RLS/security foundation

Supabase migrations contain:

- initial identity/tenancy schema
- identity RLS
- RLS fixes/grants
- M1.7 sync server/RPC hardening
- authorization validation
- sync security hardening

Existing tests and documentation cover cross-organisation/project/person and device-related authorization scenarios for the existing M1 domains.

The repository therefore has an existing **RLS/security foundation**.

However:

**REPORT RLS POLICY: ABSENT**

No report table/policy was identified on the inspected ref.

This is material because the pilot's AC-06 invariant cannot be proven by reusing attendance RLS assumptions.

## 8. Existing UI

The application has a real UI/application shell and existing attendance/QA surfaces.

The inspected repository contains no identified report-creation workflow corresponding to SS-PILOT-001.

Therefore:

**REPORT CREATION UI: ABSENT**

The pilot requires a new user-facing vertical slice.

## 9. Existing test infrastructure

Jest is configured and the repository contains existing tests/verification material.

Supabase-specific verification scripts also exist.

The repository's agent instructions require tests before implementation where behaviour changes and fresh evidence before completion.

### Finding

**AUTOMATED TEST FOUNDATION: PRESENT**

## 10. Existing CI

The repository contains GitHub Actions workflows for M15/M16/M17 Android and server verification.

No production deployment should be inferred from the existence of these workflows.

The inspected repository also currently reports no GitHub rulesets and the `main` branch is shown as unprotected by the GitHub repository API.

This is an **enforcement finding**, not a pilot implementation prerequisite.

## 11. Linear state

The controlling Linear project is:

**SITE-SYNC — Clean-Room Build**

Current project milestone state includes:

- M1 Trustworthy Offline Operational Record — 81%
- M2 Product Shell & TODAY — 0%
- later product milestones remain backlog

Current M1 work includes:

- MMM-35 — M1.7 Sync engine and deterministic reconciliation — In Progress
- MMM-36 — M1.8 Adversarial validation and release proof — Backlog

M1.3 local SQLite, M1.4 identity/device/project context, M1.5 QR validation, M1.6 offline attendance/durable command ledger, M1.1 schema/seed, M1.2 RLS/server command contract, and M1.0 native foundation are recorded as completed.

This confirms that the inspected repository is an **existing M1-stage implementation**, not a clean greenfield application.

## 12. Prerequisite requirements exposed by inspection

The pilot is paused pending these requirements.

### PR-PILOT-001 — Report domain contract

Define the authoritative report entity, fields, lifecycle, identifiers, tenant/company/project binding, timestamps, author identity, and status semantics.

### PR-PILOT-002 — Report database model

Define the Supabase/PostgreSQL report table(s), keys, foreign keys, indexes, constraints and migration.

### PR-PILOT-003 — Report RLS contract

Define and test the exact authenticated read/write/update/delete boundary for reports.

Must explicitly cover:

- same-company authorised worker
- same-project authorised worker
- cross-company denial
- cross-project denial
- unauthorised worker denial
- malformed/forged project binding

### PR-PILOT-004 — Report local persistence model

Define SQLite representation sufficient to survive:

1. offline creation
2. application force-kill
3. device reboot
4. application relaunch

The locally persisted record must retain the authoritative tenant/project binding.

### PR-PILOT-005 — Report offline command/sync contract

Define the report command lifecycle, idempotency key, retry semantics, reconciliation semantics and authoritative server response.

The existing attendance sync contract must not be assumed to be a generic report contract.

### PR-PILOT-006 — Offline tenant-isolation invariant

Define the invariant independently of implementation:

> An offline-capable client must never use locally persisted state or synchronisation behaviour to obtain, create, modify or submit a report outside the worker's authorised tenant/project scope.

This is the anchor requirement for the pilot.

### PR-PILOT-007 — Report UI workflow

Define the minimum real UI required to create, persist, display and synchronise one report.

### PR-PILOT-008 — Pilot test fixtures

Define isolated test identities and project/company fixtures sufficient to demonstrate both authorised and denied report paths without using production operational data.

## 13. Governance classification of inspection result

**Inspection mode:** Investigation / pre-feature inspection

**Result:** PREREQUISITES MISSING

**Severity:** HARD STOP for SS-PILOT-001 implementation as currently scoped.

Reason: the missing report domain is a material prerequisite, not a separable implementation detail.

Permitted next action:

**Define and approve the prerequisite requirement set.**

Not permitted:

- invent a report schema during implementation;
- repurpose attendance tables merely to keep the pilot moving;
- treat the existing attendance sync contract as generic;
- weaken AC-06;
- substitute emulator evidence for physical Android evidence;
- use production as a test environment.

## 14. Unexercised governance mechanisms

Because implementation has not started, this inspection does **not** validate:

- concurrency
- correction/retraction
- requirement supersession
- requirement lifecycle transitions
- cross-requirement dependency propagation
- AMBER execution
- end-to-end evidence chain
- fresh-session verification
- offline crash/reboot behaviour
- report-specific RLS
- report sync
- governance-cost measurements

These remain explicitly unvalidated.

## 15. Inspection conclusion

The inspection found a materially developed SITE-SYNC M1 foundation, including local SQLite persistence, identity/tenant foundations, RLS, attendance synchronisation and physical Android verification infrastructure.

It also found that **SS-PILOT-001 does not yet exist as an implementable vertical slice**.

The correct response under the pilot rules is therefore to pause rather than manufacture the missing prerequisites or silently redefine the pilot.

**No SS-PILOT-001 implementation has been started.**

**Next authorised step:** define the prerequisite requirement set and obtain the required approval before implementation.
