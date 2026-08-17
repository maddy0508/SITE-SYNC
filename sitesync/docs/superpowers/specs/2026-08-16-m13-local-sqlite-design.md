# M1.3 — Local SQLite Design

## Goal

Establish durable, deterministic local SQLite persistence for the React Native 0.86 Android app. The persistence layer must be independently testable and must be initialized before any future repository access.

## Library decision

Use `@op-engineering/op-sqlite` **17.1.3**. The repository currently uses React Native 0.86.0. OP-SQLite supports Android and native React Native installation without an Expo-specific plugin. Its native API provides `open()`, asynchronous `execute()`, `executeSync()` for native-only synchronous operations, and `transaction()` with rollback on uncaught errors.

Version 17.1.3 is the current package version verified during design. Do not introduce an ORM or sync engine in M1.3; repositories and synchronization remain separate concerns.

## Architecture

```text
src/
  domain/
    localPersistence.ts
  persistence/
    database.ts
    schema.ts
```

`src/persistence/database.ts` owns exactly one application database connection and exposes:

```ts
initializeDatabase(): Promise<void>
getDatabase(): DatabaseHandle
```

`initializeDatabase()` opens `site_sync.db`, enables foreign-key enforcement, applies the schema/migration version, and resolves only after all initialization work succeeds. Repeated calls are safe and return the same initialization promise once initialization has started successfully.

`src/persistence/schema.ts` contains the versioned SQL schema and migration definitions. It has no React components and no Supabase dependency.

`src/domain/localPersistence.ts` contains TypeScript contracts for the local records and status values used by later identity/attendance workflows. It does not open the database or execute SQL.

## Local schema

The first schema version creates exactly seven operational tables:

- `project_context`
- `project_roster`
- `attendance_events`
- `attendance_state`
- `timesheets`
- `command_ledger`
- `exceptions`

The schema uses explicit primary keys, appropriate local foreign keys, UTC timestamps, server revision fields, and `sync_status` where the record participates in eventual synchronization.

The roster key is `(project_id, person_id)`. Project/person/work-date lookup paths receive explicit indexes. Roster freshness is represented by `synced_at`; a future repository layer will treat freshness as data age rather than silently treating cached data as authoritative.

Timesheets carry `policy = 'M1_FIRST_IN_LAST_OUT_UTC'` to make the derivation rule explicit without implementing attendance business commands in this issue.

## Transaction semantics

All multi-write initialization/migration work executes inside a transaction. A thrown error must roll back every write in that transaction and propagate to the caller. Verification will include a deliberately failing transaction that inserts multiple rows and proves that none remain afterward.

## Error handling

Database open, migration, SQL execution, and transaction failures are surfaced as rejected promises/errors. Initialization must never resolve after a partial schema application. A failed initialization can be retried cleanly after the underlying connection/error state is reset.

## Verification

The verification suite covers:

1. clean database creation;
2. schema version and table creation;
3. foreign-key enforcement;
4. expected indexes;
5. repeated/idempotent initialization;
6. transaction commit;
7. transaction rollback;
8. error propagation;
9. data persistence after closing and reopening the database;
10. native Android build with OP-SQLite linked.

Device/app-restart persistence is an explicit acceptance gate and will not be inferred from unit tests alone.

## Scope boundary

M1.3 does **not** implement Supabase RPCs, QR scanning, camera UI, attendance business commands, or a synchronization engine.

## Acceptance gate

M1.3 is complete only when local persistence is initialized deterministically, transaction semantics are verified, data survives a real application restart, and the complete schema is ready for subsequent identity/attendance work.
