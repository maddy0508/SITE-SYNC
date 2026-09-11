# M1.7 Sync Engine Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a restart-safe local synchronization worker that deterministically claims pending attendance commands and hands them to a controlled transport boundary without falsely marking local state as server-verified.

**Architecture:** M1.7 begins entirely above the existing SQLite command ledger. A repository-backed worker selects eligible commands in deterministic order, claims one command under a process mutex, invokes an injectable transport adapter, and persists the result through explicit command/sync status transitions. The first slice uses a controlled fake transport; production Supabase transport is deliberately deferred until the worker contract and failure semantics are proven.

**Tech Stack:** React Native + TypeScript, existing SQLite adapter, Jest, GitHub Actions.

**Spec:** Linear MMM-35 — M1.7 Sync engine and deterministic reconciliation.

## Global Constraints

- M1.6 remains the source of local attendance mutation semantics.
- SQLite remains the local UI source of truth; the server remains authoritative.
- Connectivity alone never creates `ONLINE_VERIFIED` state.
- Attendance events remain append-only.
- Command history remains durable after successful synchronization.
- Command processing is deterministic and idempotent.
- One command may have only one active local processing claim.
- Retry timing is persisted, not held only in memory.
- Production Supabase remains untouched during this foundation slice.
- No camera, QR, attendance-authorisation, reporting, or unrelated UI feature work is included.

---

### Task 1: Define sync transport contract

**Files:**
- Create: `sitesync/src/sync/syncTransport.ts`
- Test: `sitesync/__tests__/syncTransport.test.ts`

**Interfaces:**
- `SyncTransport.submit(command): Promise<SyncTransportResponse>`
- Request contains command ID, aggregate identity, base revision and exact persisted command payload.
- Response discriminates `ACCEPTED`, `DUPLICATE_ACCEPTED`, `REVISION_CONFLICT`, `AUTHORIZATION_REJECTED`, `VALIDATION_REJECTED`, `DEVICE_REVOKED`, and `SERVER_ERROR`.

- [ ] Write failing tests for exhaustive response discrimination.
- [ ] Write failing tests proving the request carries the persisted payload rather than reconstructing it from mutable UI state.
- [ ] Implement types and a no-op controlled transport fixture.
- [ ] Run focused Jest tests.
- [ ] Commit.

### Task 2: Add deterministic command selection and claim repository

**Files:**
- Create: `sitesync/src/sync/syncCommandRepository.ts`
- Test: `sitesync/__tests__/syncCommandRepository.test.ts`

**Interfaces:**
- `claimNextEligible(now): Promise<CommandLedgerRecord | null>`
- `releaseStaleClaims(now): Promise<number>`
- `markSucceeded(...)`, `markRetryableFailure(...)`, `markFailed(...)`, `markConflict(...)`.

Selection rules:
- `PENDING` is eligible immediately.
- `RETRYABLE_FAILURE` is eligible only when `next_retry_at` is null or <= now.
- Ordering is `created_at ASC, command_id ASC`.
- Per aggregate, only the earliest outstanding command is eligible.
- Claim changes `PENDING`/`RETRYABLE_FAILURE` → `PROCESSING` atomically and increments `attempt_count`.
- Claims older than the stale threshold return to `PENDING` before selection.

- [ ] Write failing tests for deterministic order.
- [ ] Test `next_retry_at` filtering.
- [ ] Test per-aggregate sequential processing.
- [ ] Test atomic claim prevents a second claim.
- [ ] Test stale processing recovery.
- [ ] Implement minimal SQL repository operations using the existing transaction boundary.
- [ ] Run focused tests.
- [ ] Commit.

### Task 3: Implement sync worker lifecycle and mutex

**Files:**
- Create: `sitesync/src/sync/syncWorker.ts`
- Test: `sitesync/__tests__/syncWorker.test.ts`

**Interfaces:**
- `SyncWorker.runOnce(now?): Promise<SyncRunResult>`
- `SyncWorker.start(): void`
- `SyncWorker.stop(): void`
- `SyncWorker.requestSync(reason): Promise<void>`

- [ ] Test concurrent `runOnce` calls collapse to one active worker.
- [ ] Test startup stale-claim recovery.
- [ ] Test one command is claimed and submitted exactly once per run.
- [ ] Test no eligible command produces an idle result.
- [ ] Implement in-process mutex plus repository claim protection.
- [ ] Implement startup and explicit trigger hooks; network callback integration remains an adapter boundary for this slice.
- [ ] Run focused tests.
- [ ] Commit.

### Task 4: Persist response classification and retry policy

**Files:**
- Modify: `sitesync/src/sync/syncCommandRepository.ts`
- Modify: `sitesync/src/sync/syncWorker.ts`
- Create: `sitesync/src/sync/syncRetryPolicy.ts`
- Test: `sitesync/__tests__/syncRetryPolicy.test.ts`
- Modify: `sitesync/__tests__/syncWorker.test.ts`

Policy:
- Timeout/transport/server-unavailable → retryable.
- Authorization/validation/device-revocation → durable failure.
- Revision conflict → conflict.
- `ACCEPTED` and `DUPLICATE_ACCEPTED` → success.
- Exponential persisted backoff with bounded delay; attempt exhaustion becomes `FAILED`.

- [ ] Write failing classification tests.
- [ ] Write failing backoff/exhaustion tests.
- [ ] Implement policy without wall-clock dependence in tests.
- [ ] Persist server response/error diagnostics.
- [ ] Run focused tests.
- [ ] Commit.

### Task 5: Controlled end-to-end synchronization tests

**Files:**
- Create: `sitesync/__tests__/syncEngine.integration.test.ts`

- [ ] Seed a real test SQLite database with an M1.6 pending check-in command.
- [ ] Submit through a controlled `ACCEPTED` transport.
- [ ] Assert command becomes `SUCCEEDED` and history remains.
- [ ] Submit the same command through `DUPLICATE_ACCEPTED` and assert no duplicate local effect.
- [ ] Simulate transport loss and verify persisted retry state.
- [ ] Restart the worker and verify the command resumes.
- [ ] Simulate a revision conflict and assert `CONFLICT` without fabricating verified state.
- [ ] Run integration tests.
- [ ] Commit.

### Task 6: Verification workflow and Linear evidence

**Files:**
- Create: `.github/workflows/m17-verify.yml`
- Modify: Linear MMM-35 with exact evidence and checked items.

- [ ] Run Jest.
- [ ] Run TypeScript.
- [ ] Run ESLint.
- [ ] Verify the M1.7 test suite uses only controlled transport fixtures.
- [ ] Verify no production Supabase credentials or writes are introduced.
- [ ] Record exact results.
- [ ] Commit.

## Definition of Done

This foundation slice is complete only when pending commands can be selected and claimed deterministically, stale claims recover after restart, concurrent workers cannot process the same command locally, controlled transport responses persist correctly, retry policy is durable and bounded, duplicate replay is idempotent, revision conflict remains visibly unverified, and automated verification is green.
