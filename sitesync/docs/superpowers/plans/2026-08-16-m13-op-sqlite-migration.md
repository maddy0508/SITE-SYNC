# M1.3 OP-SQLite Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the M1.3 local persistence implementation's obsolete `react-native-quick-sqlite` dependency with `@op-engineering/op-sqlite@17.1.3` while preserving the locked SQLite contract and all existing verification behavior.

**Architecture:** Keep `src/domain/localPersistence.ts` unchanged as the domain contract. Update `src/database/localPersistence.ts` to use OP-SQLite's `DB`, `Transaction`, `open`, and close APIs, adapting query-result access and transaction calls only where required by the library API. Keep the existing schema, triggers, indexes, validation, optimistic locking, purge ordering, and status semantics unchanged.

**Tech Stack:** React Native 0.86.0, TypeScript, Jest, SQLite, `@op-engineering/op-sqlite@17.1.3`.

## Global Constraints

- Local SQLite remains the UI source of truth; server remains authoritative.
- Attendance events and conflicts remain append-only except documented conflict status transitions.
- Roster remains non-authoritative.
- Timestamps remain UTC ISO-8601; work dates remain `YYYY-MM-DD`.
- Schema version remains 1.
- `M1_FIRST_IN_LAST_OUT_UTC` remains locked.
- No unrelated refactor or feature work.
- `package.json` must declare `@op-engineering/op-sqlite@17.1.3`.
- `react-native-quick-sqlite` must not remain an M1.3 runtime dependency.

---

### Task 1: Migrate dependency declaration

**Files:**
- Modify: `sitesync/package.json`
- Modify: `sitesync/package-lock.json`

- [ ] Add `@op-engineering/op-sqlite`: `17.1.3` to runtime dependencies.
- [ ] Remove any `react-native-quick-sqlite` dependency declaration if present.
- [ ] Verify the lockfile resolves exactly `@op-engineering/op-sqlite@17.1.3`.
- [ ] Commit dependency changes with `feat(m1.3): migrate persistence to op-sqlite`.

### Task 2: Migrate database adapter API

**Files:**
- Modify: `sitesync/src/database/localPersistence.ts`

- [ ] Replace the Quick SQLite import with OP-SQLite's `open`, `DB`, and `Transaction` types.
- [ ] Replace `SQLiteDatabase` with OP-SQLite `DB` throughout the file.
- [ ] Replace `transactionAsync` with `transaction`.
- [ ] Replace transaction `executeSql` calls with `execute`.
- [ ] Replace `close(...)` calls with the OP-SQLite database close API.
- [ ] Adapt every `.rows.item(index)` access to OP-SQLite's array-style row access.
- [ ] Preserve all SQL text, schema definitions, triggers, indexes, validation, state transitions, optimistic locking, conflict guards, timesheet revision checks, and purge semantics.
- [ ] Preserve `closeDatabase()` restart-test semantics.
- [ ] Run TypeScript/Jest checks and correct only API migration errors.
- [ ] Commit the adapter migration separately.

### Task 3: Verify persistence contract

**Files:**
- Test: `sitesync/__tests__/localPersistence.test.ts`

- [ ] Run the complete M1.3 persistence suite.
- [ ] Confirm schema version and foreign keys.
- [ ] Confirm initialization idempotence and failure recovery.
- [ ] Confirm clean-install schema creation.
- [ ] Confirm transaction rollback and restart persistence.
- [ ] Confirm required indexes and triggers.
- [ ] Confirm stale-processing detection and retry exhaustion.
- [ ] Confirm device-session optimistic locking and irreversible revocation.
- [ ] Confirm attendance events cannot be updated or deleted.
- [ ] Confirm conflicts cannot be deleted or re-resolved.
- [ ] Confirm `source_state_revision` consistency.
- [ ] Confirm foreign-key enforcement and cross-person purge isolation.
- [ ] Confirm timestamp and work-date validation.
- [ ] Require all tests to pass before integration.

### Task 4: Final audit

- [ ] Search the M1.3 source tree for `react-native-quick-sqlite` and confirm zero runtime references.
- [ ] Confirm `@op-engineering/op-sqlite@17.1.3` is declared and locked.
- [ ] Review the final diff for accidental schema or contract changes.
- [ ] Record verification results in the implementation commit message/PR context.
