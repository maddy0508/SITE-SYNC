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

## Execution status

- [x] Branch created from M1.6 merge commit.
- [x] Implementation plan committed.
- [x] Transport contract tests + implementation.
- [x] Deterministic command claim repository + tests.
- [x] Retry classification/backoff + tests.
- [x] Sync worker lifecycle + tests.
- [x] Controlled SQLite integration coverage.
- [x] M1.7 verification workflow.
- [ ] GitHub Actions verification.
- [ ] Fix any CI failures.
- [ ] Final duplicate/conflict/restart integration evidence.
- [ ] PR review and merge.

## Current implementation

### Task 1 — Transport contract
- [x] `sitesync/src/sync/syncTransport.ts`
- [x] Explicit response discriminants.
- [x] Persisted-payload parser.

### Task 2 — Command selection/claiming
- [x] `sitesync/src/sync/syncCommandRepository.ts`
- [x] Deterministic order.
- [x] Retry eligibility.
- [x] Per-project/person sequential processing.
- [x] Atomic claim.
- [x] Stale claim recovery.

### Task 3 — Worker
- [x] `sitesync/src/sync/syncWorker.ts`
- [x] In-process mutex.
- [x] Startup/manual triggers.
- [x] Explicit response routing.

### Task 4 — Retry policy
- [x] `sitesync/src/sync/syncRetryPolicy.ts`
- [x] Retryable/durable/conflict classification.
- [x] Bounded exponential backoff.
- [x] Attempt exhaustion.

### Task 5 — Controlled integration
- [x] Accepted response.
- [x] Durable success state.
- [x] Retry persistence.
- [ ] Duplicate replay.
- [ ] Revision conflict.
- [ ] Restart/resume.

### Task 6 — Verification
- [x] `.github/workflows/m17-verify.yml` added.
- [ ] Jest/TypeScript/ESLint execution evidence.
- [ ] No production Supabase changes.

## Definition of Done

This foundation slice is complete only when pending commands can be selected and claimed deterministically, stale claims recover after restart, concurrent workers cannot process the same command locally, controlled transport responses persist correctly, retry policy is durable and bounded, duplicate replay is idempotent, revision conflict remains visibly unverified, and automated verification is green.
