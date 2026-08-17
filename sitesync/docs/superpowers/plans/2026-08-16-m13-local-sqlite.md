# M1.3 — App Foundation and Local SQLite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify deterministic local SQLite persistence for the RN 0.86 Android app, including the complete M1.3 schema and transaction semantics.

**Architecture:** Keep SQLite behind `src/persistence/database.ts` and `src/persistence/schema.ts`; keep domain record contracts in `src/domain/localPersistence.ts`. Use one OP-SQLite connection for the application database and an explicit awaitable initialization boundary.

**Tech Stack:** React Native 0.86.0, TypeScript, Jest, Android native build, `@op-engineering/op-sqlite` 17.1.3, SQLite.

## Global Constraints

- Use `@op-engineering/op-sqlite` 17.1.3.
- Database filename is `site_sync.db`.
- Schema version starts at `1`.
- Initialization API is `initializeDatabase(): Promise<void>`.
- Use one database connection for the application.
- Enable SQLite foreign-key enforcement.
- Timesheet policy is exactly `M1_FIRST_IN_LAST_OUT_UTC`.
- No Supabase RPC implementation, QR scanner, camera UI, attendance business command, or sync engine.
- M1.3 is not complete without real app-restart persistence evidence.

---

### Task 1: Install and verify OP-SQLite

**Files:**
- Modify: `sitesync/package.json`
- Modify: `sitesync/package-lock.json`
- Create: `sitesync/docs/superpowers/evidence/m13-sqlite-library.md`

**Interfaces:**
- Consumes: existing RN 0.86.0 package manifest.
- Produces: pinned OP-SQLite dependency and installation evidence.

- [ ] **Step 1: Add the exact dependency**

```bash
npm install @op-engineering/op-sqlite@17.1.3 --save-exact
```

- [ ] **Step 2: Verify the installed package and RN version**

```bash
npm ls react-native @op-engineering/op-sqlite --depth=0
```

Expected: `react-native@0.86.0` and `@op-engineering/op-sqlite@17.1.3` with no invalid dependency marker.

- [ ] **Step 3: Record native installation evidence**

Document that OP-SQLite supports native Android installation and that the project is a bare React Native app, so the native module is linked by the existing RN Android build rather than Expo Go.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json docs/superpowers/evidence/m13-sqlite-library.md
git commit -m "build(m1.3): add op-sqlite"
```

---

### Task 2: Define the local domain contract

**Files:**
- Create: `sitesync/src/domain/localPersistence.ts`
- Test: `sitesync/src/domain/__tests__/localPersistence.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: `DATABASE_NAME`, `DATABASE_SCHEMA_VERSION`, `M1_TIMESHEET_POLICY`, `SyncStatus`, `CommandStatus`, and record interfaces for the seven local tables.

- [ ] **Step 1: Write contract tests**

```ts
import {
  DATABASE_NAME,
  DATABASE_SCHEMA_VERSION,
  M1_TIMESHEET_POLICY,
} from '../localPersistence';

test('defines the M1.3 database contract', () => {
  expect(DATABASE_NAME).toBe('site_sync.db');
  expect(DATABASE_SCHEMA_VERSION).toBe(1);
  expect(M1_TIMESHEET_POLICY).toBe('M1_FIRST_IN_LAST_OUT_UTC');
});
```

- [ ] **Step 2: Implement the contract**

Define typed records for project context, roster, attendance events/state, timesheets, command ledger, and exceptions. Include the required sync statuses, server revisions, timestamps, retry metadata, server-result storage, and conflict fields.

- [ ] **Step 3: Run the focused test**

```bash
npm test -- --runInBand src/domain/__tests__/localPersistence.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/domain/localPersistence.ts src/domain/__tests__/localPersistence.test.ts
git commit -m "feat(m1.3): define local persistence contract"
```

---

### Task 3: Implement schema and migration version 1

**Files:**
- Create: `sitesync/src/persistence/schema.ts`
- Test: `sitesync/src/persistence/__tests__/schema.test.ts`

**Interfaces:**
- Consumes: domain contract constants.
- Produces: schema SQL/migration definitions for `DATABASE_SCHEMA_VERSION = 1`.

- [ ] **Step 1: Write schema assertions**

Assert that schema creation contains all seven required tables, primary keys, roster composite key, foreign keys, sync-status columns, revision/timestamp columns, and indexes for project/person/work-date lookups.

- [ ] **Step 2: Implement schema SQL**

Create `CREATE TABLE IF NOT EXISTS` statements for all seven tables. Use UUID/text identifiers rather than SQLite-generated integer identity for domain records. Use UTC ISO timestamps as text. Add foreign keys only where the local lifecycle makes the relationship safe and useful.

- [ ] **Step 3: Add indexes**

Create indexes covering:

```sql
CREATE INDEX IF NOT EXISTS idx_roster_project_status
  ON project_roster(project_id, assignment_status, membership_status);

CREATE INDEX IF NOT EXISTS idx_attendance_person_work_date
  ON attendance_events(project_id, person_id, work_date_utc);

CREATE INDEX IF NOT EXISTS idx_timesheet_project_person_date
  ON timesheets(project_id, person_id, work_date_utc);
```

Add equivalent indexes for command/conflict lookup paths where required by their foreign-key/operational access patterns.

- [ ] **Step 4: Run schema tests**

```bash
npm test -- --runInBand src/persistence/__tests__/schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/persistence/schema.ts src/persistence/__tests__/schema.test.ts
git commit -m "feat(m1.3): add local sqlite schema"
```

---

### Task 4: Implement the database lifecycle

**Files:**
- Create: `sitesync/src/persistence/database.ts`
- Create: `sitesync/src/persistence/index.ts`
- Test: `sitesync/src/persistence/__tests__/database.test.ts`

**Interfaces:**
- Consumes: OP-SQLite and schema definitions.
- Produces: `initializeDatabase(): Promise<void>` and `getDatabase()`.

- [ ] **Step 1: Write initialization tests**

Cover clean creation, repeated initialization, failed initialization, foreign-key enforcement, and schema version persistence.

- [ ] **Step 2: Implement one shared connection**

Use the OP-SQLite `open({ name: DATABASE_NAME })` API once and retain the connection in the persistence module. Do not create a new connection per repository/query.

- [ ] **Step 3: Implement awaitable initialization**

The initialization flow must:

```ts
await db.execute('PRAGMA foreign_keys = ON');
await db.transaction(async tx => {
  // schema metadata + schema v1 creation
});
```

The exported promise must not resolve until the transaction succeeds. A repeated call after success must not recreate or destroy the database.

- [ ] **Step 4: Implement deterministic schema-version storage**

Use a small metadata table such as:

```sql
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Store `schema_version = 1` and migrate only when the stored version is lower than the application version. Reject unsupported future versions rather than silently downgrading them.

- [ ] **Step 5: Run focused lifecycle tests**

```bash
npm test -- --runInBand src/persistence/__tests__/database.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/persistence/database.ts src/persistence/index.ts src/persistence/__tests__/database.test.ts
 git commit -m "feat(m1.3): add deterministic database initialization"
```

---

### Task 5: Verify transaction commit, rollback, and error propagation

**Files:**
- Modify: `sitesync/src/persistence/__tests__/database.test.ts`
- Create: `sitesync/src/persistence/__tests__/transaction.test.ts`

**Interfaces:**
- Consumes: initialized database handle.
- Produces: executable evidence that transaction semantics match the M1.3 gate.

- [ ] **Step 1: Test commit**

Insert two rows in one transaction and assert both are present afterward.

- [ ] **Step 2: Test rollback**

Use a transaction with two inserts followed by `throw new Error('intentional rollback')`. Assert the promise rejects and both inserted rows are absent afterward.

- [ ] **Step 3: Test error propagation**

Execute invalid SQL and assert the resulting error reaches the caller rather than being swallowed by the persistence layer.

- [ ] **Step 4: Run transaction tests**

```bash
npm test -- --runInBand src/persistence/__tests__/transaction.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/persistence/__tests__/database.test.ts src/persistence/__tests__/transaction.test.ts
git commit -m "test(m1.3): verify sqlite transaction semantics"
```

---

### Task 6: Verify persistence and lookup indexes

**Files:**
- Create: `sitesync/src/persistence/__tests__/persistence.test.ts`
- Create: `sitesync/docs/superpowers/evidence/m13-database-verification.md`

**Interfaces:**
- Consumes: initialized database and schema.
- Produces: persistence/index verification evidence.

- [ ] **Step 1: Test close/reopen persistence**

Insert a representative project-roster record, close the connection, reopen the same database file, and assert the record remains.

- [ ] **Step 2: Verify index metadata**

Query SQLite metadata:

```sql
SELECT name, tbl_name FROM sqlite_master WHERE type = 'index';
```

Assert the required indexes exist.

- [ ] **Step 3: Verify query plans**

Run `EXPLAIN QUERY PLAN` against representative roster, attendance, and timesheet lookup queries and assert the expected index names appear in the planner output.

- [ ] **Step 4: Record evidence**

Record commands, environment, schema version, test results, and the exact persistence/reopen result in `docs/superpowers/evidence/m13-database-verification.md`.

- [ ] **Step 5: Commit**

```bash
git add src/persistence/__tests__/persistence.test.ts docs/superpowers/evidence/m13-database-verification.md
git commit -m "test(m1.3): verify persistence and indexes"
```

---

### Task 7: Android native build and clean-install verification

**Files:**
- Modify: `sitesync/README.md` only if native setup instructions need documenting.
- Create: `sitesync/docs/superpowers/evidence/m13-android-verification.md`

**Interfaces:**
- Consumes: completed persistence implementation.
- Produces: native Android build evidence and clean-install persistence evidence.

- [ ] **Step 1: Install dependencies cleanly**

```bash
npm ci
```

- [ ] **Step 2: Run TypeScript/Jest verification**

```bash
npm test -- --runInBand
```

Expected: all existing and M1.3 tests PASS.

- [ ] **Step 3: Build Android release**

```bash
cd android
./gradlew assembleRelease
```

Expected: BUILD SUCCESSFUL and `android/app/build/outputs/apk/release/app-release.apk` exists.

- [ ] **Step 4: Clean-install the APK on a real Android device**

Install the release APK, launch it, execute the database initialization path, write a representative local record through the verification harness, force-stop/relaunch the app, and verify the record remains.

- [ ] **Step 5: Record native evidence**

Record the RN version, OP-SQLite version, Java/Gradle versions, APK build result, clean-install result, and restart persistence result.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/evidence/m13-android-verification.md README.md
 git commit -m "test(m1.3): verify android sqlite persistence"
```

---

### Task 8: Final M1.3 audit

**Files:**
- Modify: `sitesync/docs/superpowers/evidence/m13-database-verification.md`

**Interfaces:**
- Consumes: all prior implementation and verification evidence.
- Produces: final M1.3 acceptance record.

- [ ] **Step 1: Audit every MMM-31 tickable item**

Map each Linear checkbox to an implementation or verification artifact. Do not mark a checkbox complete without evidence.

- [ ] **Step 2: Verify scope boundary**

Search the M1.3 diff for Supabase RPC, QR/camera, attendance business command, and sync-engine implementation. None may be introduced by this issue.

- [ ] **Step 3: Run final verification**

```bash
npm test -- --runInBand
cd android && ./gradlew assembleRelease
```

Expected: PASS and BUILD SUCCESSFUL.

- [ ] **Step 4: Commit final evidence**

```bash
git add docs/superpowers/evidence/m13-database-verification.md
git commit -m "docs(m1.3): finalize local sqlite evidence"
```

- [ ] **Step 5: Update Linear only from verified evidence**

Mark only the MMM-31 checklist items that are actually demonstrated. Close MMM-31 only after the clean-install/app-restart gate is verified.
