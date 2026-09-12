# M1.7 Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the verified M1.7 durable sync engine and server RPC boundary to the real application lifecycle while keeping SQLite authoritative until authoritative reconciliation is persisted.

**Architecture:** A single runtime composition owns the SyncWorker, device-session provider, authenticated Supabase transport, and repository boundary. Application lifecycle triggers are explicit and idempotent; UI observes persisted repository state rather than transport results. Server responses are reconciled transactionally with projection guards so older commands cannot overwrite newer local state.

**Tech Stack:** React Native 0.86, TypeScript, Jest, SQLite/op-sqlite, Supabase JS/RPC.

**Spec:** `docs/superpowers/specs/2026-09-12-m17-sync-server-design.md`

## Global Constraints
- SQLite remains the local source of truth until authoritative server reconciliation.
- `deviceInstallationId` comes only from the local registered-device session, never user input.
- Production Supabase is not used by tests or CI.
- The only server mutation boundary is `sync_attendance_command(...)`.
- Connectivity alone never creates `ONLINE_VERIFIED`.
- Server conflicts remain durable `CONFLICT` records and server state wins.
- Repository projection updates must be revision/command guarded.
- Worker execution is serialized and lifecycle-safe.

---

### Task 1: Harden repository projection guards

**Files:**
- Modify: `sitesync/src/sync/syncCommandRepository.ts`
- Test: `sitesync/__tests__/syncCommandRepository.test.ts`

- [ ] Add a failing test proving an older command cannot overwrite a newer `attendance_state` projection during success.
- [ ] Run the focused test and verify the failure is caused by the missing projection guard.
- [ ] Add the smallest SQL guard using command ordering/source revision.
- [ ] Add the analogous failure/conflict guard tests.
- [ ] Run repository tests.
- [ ] Refactor only while tests remain green.

### Task 2: Build an explicit runtime composition boundary

**Files:**
- Create: `sitesync/src/sync/syncRuntime.ts`
- Test: `sitesync/__tests__/syncRuntime.test.ts`

- [ ] Add failing tests for startup idempotency, stop behavior, manual trigger, and device-session sourcing.
- [ ] Implement a dependency-injected runtime that composes `SyncWorker`, `SupabaseSyncTransport`, and local device context.
- [ ] Ensure no runtime dependency reads a device ID from UI/user input.
- [ ] Verify runtime startup does not issue work without an authenticated user/device context.
- [ ] Run focused tests.

### Task 3: Integrate authentication and device session boundaries

**Files:**
- Modify/create only the smallest required auth/session adapter files.
- Test: corresponding auth/runtime tests.

- [ ] Add failing tests for no session, no local device session, revoked local device, and valid active device.
- [ ] Implement adapters over existing `AuthService` and `getLocalDeviceSession`.
- [ ] Ensure auth changes stop/cancel future sync attempts and never fabricate identity.
- [ ] Run all sync/auth tests.

### Task 4: Add lifecycle/network trigger adapters without adding unnecessary dependencies

**Files:**
- Create: `sitesync/src/sync/syncLifecycle.ts`
- Test: `sitesync/__tests__/syncLifecycle.test.ts`

- [ ] Add failing tests for startup, foreground/manual trigger, and network-restored trigger.
- [ ] Implement framework-agnostic trigger interfaces.
- [ ] Ensure repeated events are coalesced by `SyncWorker`'s existing serialization.
- [ ] Do not add a network library merely for this milestone.
- [ ] Run focused tests.

### Task 5: Wire the application entry point

**Files:**
- Modify: `sitesync/App.tsx`
- Test: `sitesync/__tests__/appSyncRuntime.test.tsx` or existing app test location.

- [ ] Add a failing integration test showing the runtime starts once when the application mounts.
- [ ] Compose runtime only from production dependency providers.
- [ ] Start/stop runtime with application lifecycle.
- [ ] Preserve existing QA screens and behavior.
- [ ] Run app and sync tests.

### Task 6: Verify authoritative reconciliation end-to-end

**Files:**
- Modify: existing integration tests and fixtures only as required.
- Create: `sitesync/__tests__/m17Runtime.integration.test.ts`

- [ ] Add tests for accepted check-in, accepted check-out, duplicate replay, revision conflict, retry, restart, revoked device, and stale projection protection.
- [ ] Use a deterministic fake RPC boundary for unit/integration tests; no production Supabase credentials.
- [ ] Verify persisted SQLite state is the only source used by the UI-facing repository path.
- [ ] Run the complete TypeScript/Jest/lint suite.

### Task 7: Double-check release integrity

- [ ] Inspect changed files for dead code, duplicated abstractions, unsafe casts, missing error classification, and accidental production configuration.
- [ ] Re-run all tests from a clean install in CI.
- [ ] Run Android build/lint verification.
- [ ] Review the complete diff against `main`.
- [ ] Resolve every P1/P2 issue found.
- [ ] Obtain an independent review where available.
- [ ] Merge only after all automated gates and review gates are green.
