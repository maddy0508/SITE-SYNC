# M1.6 Offline Attendance and Durable Command Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement safe local check-in/check-out mutations that atomically create the attendance event, attendance state, derived M1 timesheet, and durable command-ledger record, with deterministic authorization and restart-safe offline semantics.

**Architecture:** Keep the existing SQLite schema as the persistence substrate and add a focused attendance command/service layer above it. Authorization resolves the actor and target against the trusted active project context before opening the mutation transaction; the transaction then writes the command, append-only event, state projection, and timesheet as one unit. M1.6 does not perform server synchronization or reconciliation.

**Tech Stack:** React Native + TypeScript, SQLite adapter, Jest, GitHub Actions.

**Spec:** Linear issue MMM-34 — M1.6 Offline attendance and durable command ledger.

## Global Constraints

- Local SQLite is the UI source of truth; the server remains authoritative.
- Offline validation is always provisional and must never be represented as server-verified.
- Attendance events are append-only.
- UTC ISO-8601 timestamps are required; `workDateUtc` is `YYYY-MM-DD`.
- Attendance state key is `(projectId, personId, workDateUtc)`.
- M1 timesheet policy is `M1_FIRST_IN_LAST_OUT_UTC`.
- Every attendance mutation must have a durable command-ledger record.
- Event/state/timesheet/ledger writes must commit or roll back together.
- Authorization must happen before any local mutation.
- M1.6 creates pending local commands but does not implement synchronization/reconciliation.
- Production Supabase remains untouched.

---

### Task 1: Define the attendance command contract

**Files:**
- Create: `sitesync/src/attendance/attendanceCommands.ts`
- Test: `sitesync/src/attendance/attendanceCommands.test.ts`

**Interfaces:**
- Produce typed check-in/check-out command payloads, aggregate identity, source, base revision, command ID, client timestamp and derived UTC work date.

- [ ] Write failing tests for command shape and deterministic work-date derivation.
- [ ] Write failing tests rejecting invalid timestamps, IDs, event types and revisions.
- [ ] Implement minimal immutable command builders.
- [ ] Run focused Jest tests.
- [ ] Commit.

### Task 2: Build deterministic authorization

**Files:**
- Create: `sitesync/src/attendance/attendanceAuthorization.ts`
- Test: `sitesync/src/attendance/attendanceAuthorization.test.ts`

**Interfaces:**
- Consume trusted actor identity, active project context, target assignment and role information.
- Produce a deterministic authorization result with explicit rejection codes.

- [ ] Test self-service active assignment success.
- [ ] Test unassigned actor denial.
- [ ] Test inactive target denial.
- [ ] Test target outside active project denial.
- [ ] Test supervisor/admin scan of an assigned worker.
- [ ] Test cross-organisation/company rejection.
- [ ] Implement authorization without database mutation.
- [ ] Run focused tests.
- [ ] Commit.

### Task 3: Add transactional attendance mutation service

**Files:**
- Create: `sitesync/src/attendance/attendanceService.ts`
- Modify: `sitesync/src/database/localPersistence.ts` only where repository primitives are genuinely missing.
- Test: `sitesync/src/attendance/attendanceService.test.ts`

**Interfaces:**
- `checkIn(request)` and `checkOut(request)` return the command, event, state and timesheet projections created by the transaction.
- Repository primitives must operate through the existing `withTransaction` boundary.

- [ ] Write failing atomic check-in test asserting four durable records.
- [ ] Write failing check-out test asserting event append and state transition.
- [ ] Implement command-ledger insert first so FK constraints protect the event.
- [ ] Implement event append.
- [ ] Implement state insert/update with monotonic `currentRevision`.
- [ ] Implement M1 timesheet derivation from attendance events.
- [ ] Implement durable command-ledger metadata.
- [ ] Ensure initial status is never falsely `ONLINE_VERIFIED` for offline work.
- [ ] Run focused tests.
- [ ] Commit.

### Task 4: Prove rollback and invariants

**Files:**
- Modify: `sitesync/src/attendance/attendanceService.test.ts`
- Modify: `sitesync/src/database/localPersistence.test.ts` if required for invariant coverage.

- [ ] Inject a controlled failure after each mutation stage.
- [ ] Assert zero partial event/state/timesheet/ledger writes after rollback.
- [ ] Assert append-only event protection remains intact.
- [ ] Assert duplicate command IDs cannot create a second mutation.
- [ ] Assert state revision increments exactly once per successful command.
- [ ] Run focused tests.
- [ ] Commit.

### Task 5: Add restart-safe integration coverage

**Files:**
- Create: `sitesync/src/attendance/attendanceRestart.test.ts`
- Modify: `sitesync/src/database/localPersistence.ts` only if restart/reopen support is insufficient.

- [ ] Perform offline check-in against a real test SQLite database.
- [ ] Close and reopen the database.
- [ ] Assert attendance state survives.
- [ ] Assert event history survives.
- [ ] Assert command ledger survives.
- [ ] Perform offline check-out after restart.
- [ ] Assert complete first-in/last-out timesheet.
- [ ] Run integration tests.
- [ ] Commit.

### Task 6: Wire the M1.6 test harness

**Files:**
- Create: `sitesync/src/attendance/M16QaScreen.tsx`
- Modify: `sitesync/App.tsx`
- Test: `sitesync/src/attendance/M16QaScreen.test.tsx` where UI logic is non-trivial.

- [ ] Provide explicit online/offline fixture modes.
- [ ] Expose check-in, restart simulation, check-out and rollback verification.
- [ ] Display local sync status distinctly from verified server status.
- [ ] Include deterministic authorization rejection fixtures.
- [ ] Keep the harness isolated from production data and production Supabase.
- [ ] Run TypeScript and lint.
- [ ] Commit.

### Task 7: Full verification and acceptance evidence

**Files:**
- Modify: `.github/workflows/m16-verify.yml`
- Modify: `.github/workflows/m16-android-build.yml`
- Modify: Linear MMM-34 with evidence and exact remaining gates.

- [ ] Run Jest in CI.
- [ ] Run TypeScript.
- [ ] Run ESLint.
- [ ] Build standalone Android release APK with bundled JS.
- [ ] Install on a physical Android device.
- [ ] Verify online check-in/out.
- [ ] Verify offline check-in, app restart, offline check-out.
- [ ] Verify rollback failure path.
- [ ] Verify self-service and supervisor authorization boundaries.
- [ ] Record only tests actually executed.
- [ ] Keep production untouched.

## Definition of Done

M1.6 is complete only when check-in and check-out are implemented as atomic local mutations, authorization is enforced before mutation, timesheets are derived deterministically, command history is durable across restart, rollback is proven, offline states are never presented as server-verified, automated verification is green, and the required physical-device acceptance evidence is recorded.
