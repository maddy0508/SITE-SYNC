# M1.7 Sync Server Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement the real M1.7 server synchronization boundary as a narrow Postgres RPC, including explicit registered-device authorization, deterministic idempotency/revision control, and isolated verification while production Supabase remains untouched.

**Architecture:** SQLite remains the local source of truth until authoritative reconciliation. The server owns a dedicated attendance-day aggregate keyed by `project_id + person_id + work_date_utc`; `sync_attendance_command(...)` authenticates `auth.uid()`, validates `device_installation_id` against `device_installations`, authorizes relationally, locks the aggregate, enforces strict revision equality, mutates atomically, records an event and receipt, and returns authoritative state.

**Tech Stack:** React Native/TypeScript/Jest; SQLite; PostgreSQL/Supabase RPC/Auth/RLS; GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-12-m17-sync-server-design.md`

## Global Constraints
- `device_installation_id UUID` is mandatory at the sync boundary.
- The server must verify device ownership against `auth.uid()` and ACTIVE status; the device ID itself is never an authorization claim.
- SQLite remains the local source of truth until authoritative server reconciliation is durably applied.
- Production Supabase remains untouched throughout implementation and verification.
- One narrow RPC is the application mutation boundary: `sync_attendance_command(...)`.
- Aggregate key is `(project_id, person_id, work_date_utc)`.
- Mutation requires `base_revision == server_revision`; stale/future revisions conflict without mutation.
- `command_id` is the unique idempotency key; duplicates have no second effect or revision increment.
- Server state wins conflicts; local stale commands become durable `CONFLICT` records with server payload preserved.
- Authorization is derived from `auth.uid()` and relational tenant/membership/assignment/device data, never `user_metadata`.
- RLS is enabled on every exposed M1.7 table.
- Accepted aggregate mutation, event, receipt, and revision increment are one transaction.
- Connectivity never creates `ONLINE_VERIFIED`.

## File Map
- Create `sitesync/supabase/migrations/20260912000000_m17_sync_server.sql` — aggregate, receipt, event schema, RLS, RPC.
- Create `sitesync/supabase/tests/m17_sync_server.sql` — deterministic SQL assertions and adversarial database tests.
- Modify `sitesync/src/sync/syncTransport.ts` — add mandatory device installation identity to the request contract.
- Create `sitesync/src/sync/supabaseSyncTransport.ts` — typed RPC adapter.
- Create `sitesync/__tests__/supabaseSyncTransport.test.ts` — mocked RPC mapping/validation tests.
- Modify `sitesync/src/sync/syncWorker.ts` — supply the current local device installation ID to transport.
- Create/update CI workflow only when it can run deterministically without production credentials.

---

### Task 1 — Amend the transport contract for device identity

- [ ] Add `deviceInstallationId: string` to `SyncTransportRequest`.
- [ ] Add a failing unit test asserting the production adapter cannot construct a request without device identity.
- [ ] Update all existing controlled transport fixtures to include a device installation ID.
- [ ] Run the focused TypeScript/Jest tests.
- [ ] Commit: `feat: bind M1.7 sync requests to registered device identity`.

### Task 2 — Create the dedicated M1.7 server schema

**Create:** `sitesync/supabase/migrations/20260912000000_m17_sync_server.sql`

Create:
1. `public.sitesync_attendance_day` keyed by `(project_id, person_id, work_date_utc)` with explicit state fields and `server_revision BIGINT NOT NULL DEFAULT 0 CHECK (server_revision >= 0)`.
2. `public.sitesync_sync_command_receipt` keyed uniquely by `command_id`, storing aggregate identity, base revision, command type, actor, device, result status, result revision, and authoritative result JSONB.
3. `public.sitesync_attendance_event` with immutable revisioned audit state and unique `(aggregate, new_revision)`.

Use foreign keys to the existing project/person/organisation/company/assignment relationships where compatible. Do not alter unrelated attendance/timesheet tables.

- [ ] Add failing SQL schema assertions for aggregate uniqueness, non-negative revision, receipt command uniqueness, and event revision uniqueness.
- [ ] Implement the tables, constraints, and aggregate/command indexes.
- [ ] Add immutable-history triggers that reject UPDATE/DELETE on server events.
- [ ] Re-run schema assertions.
- [ ] Commit: `feat: add M1.7 authoritative sync schema`.

### Task 3 — Implement security predicates and RLS

The RPC authorization predicate must require:
- `auth.uid()` is non-null;
- `device_installations.id = device_installation_id`, `device_installations.user_id = auth.uid()`, and status is `ACTIVE`;
- authenticated actor resolves through `user_profiles` to the same organisation as the project/person;
- actor has an ACTIVE project assignment to the project;
- target person has an ACTIVE assignment to the project;
- the target assignment/company relationship is active and tenant-consistent.

RLS on new tables must default deny. Do not grant arbitrary client writes to the authoritative aggregate/event/receipt tables.

- [ ] Add failing authorization tests for wrong user/device, revoked device, wrong organisation, unauthorized project, and unauthorized target person.
- [ ] Implement fixed-search-path authorization helper(s) only where required.
- [ ] Enable RLS and add least-privilege policies.
- [ ] Re-run authorization tests.
- [ ] Commit: `feat: secure M1.7 sync server boundary`.

### Task 4 — Implement transactional `sync_attendance_command`

Signature:
`sync_attendance_command(command_id uuid, device_installation_id uuid, project_id uuid, person_id uuid, work_date_utc date, base_revision bigint, command_type text, payload jsonb) returns jsonb`

Return objects with `status` plus the fields defined by the spec.

Transaction order:
1. authenticate;
2. device authorization;
3. relational authorization;
4. validate input/payload consistency;
5. idempotency lookup;
6. lock aggregate with `FOR UPDATE`, creating it at revision 0 when absent;
7. re-read revision;
8. conflict on any base revision mismatch;
9. validate state transition;
10. apply state mutation and compute authoritative result;
11. increment revision exactly once;
12. insert exactly one immutable event;
13. insert exactly one command receipt;
14. return committed authoritative result.

`CHECK_IN` is valid for an absent/checked-out day; `CHECK_OUT` is valid only when the authoritative day is checked in. The authoritative payload must retain the event/assignment/person/project identity needed by the client projection. Duplicate delivery returns the stored original result without reapplying state.

- [ ] Add failing SQL tests for accepted revision 0, sequential acceptance, duplicate acceptance, stale/future conflict, invalid state transition, malformed payload, and unauthorized request.
- [ ] Implement the RPC.
- [ ] Add rollback coverage that proves aggregate, event, receipt, and revision changes commit or roll back together.
- [ ] Add concurrent same-revision coverage proving one accepted mutation and one conflict.
- [ ] Re-run all SQL tests.
- [ ] Commit: `feat: add transactional M1.7 sync RPC`.

### Task 5 — Implement the TypeScript Supabase transport adapter

**Create:** `sitesync/src/sync/supabaseSyncTransport.ts`

Define a narrow client dependency:
```ts
export interface SupabaseRpcClient {
  rpc(functionName: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
}
```

`SupabaseSyncTransport.submit()` calls only `rpc('sync_attendance_command', ...)`, passing `command.commandId`, `device_installation_id`, aggregate fields, `base_revision`, `command_type`, and payload. Validate the response discriminant and required fields before mapping. Unknown/malformed responses become retryable `SERVER_ERROR`; RPC errors map according to retryability without claiming acceptance.

- [ ] Write failing mapping tests for every response variant and malformed response.
- [ ] Implement the adapter.
- [ ] Run focused tests and full TypeScript/Jest/lint.
- [ ] Commit: `feat: add Supabase M1.7 transport adapter`.

### Task 6 — Wire the worker to the local registered device identity

Use the existing local device session lookup. The worker must obtain the authenticated user's local session and pass `deviceInstallationId` to the transport. A missing/revoked local device session must not be converted into a successful sync.

- [ ] Add failing worker tests for active device, missing device, and revoked device.
- [ ] Implement the smallest repository/session injection needed to supply the ID.
- [ ] Run the sync worker suite and full Jest/TypeScript/lint.
- [ ] Commit: `feat: wire sync worker to registered device`.

### Task 7 — Isolated SQL and integration verification

Do not wake or migrate production SITE-SYNC Supabase. If no isolated Supabase test project is currently provisioned, stop before remote deployment and report that gate explicitly rather than substituting production.

- [ ] Validate SQL migration against disposable PostgreSQL in CI.
- [ ] Verify unauthenticated, cross-company, cross-project, cross-person, cross-user-device, revoked-device, malformed payload, duplicate, stale/future revision, concurrent, rollback, and event/receipt invariants.
- [ ] If an isolated Supabase test project is available without production impact, apply the exact migration and run authenticated/RLS integration tests there.
- [ ] Capture CI run IDs and exact commit SHA.
- [ ] Commit only test harness/workflow changes, never credentials.

### Task 8 — Review and release gate

- [ ] Run exact-head Jest, TypeScript, lint, SQL validation, and Android release build where available.
- [ ] Request fresh code review focused on device authorization, RLS, idempotency, revision locking, transaction atomicity, duplicate delivery, and projection state honesty.
- [ ] Resolve all P1/P2 findings before merge.
- [ ] Update Linear `MMM-35` with verified evidence.
- [ ] Do not mark M1.7 complete until real server transport and required isolated integration evidence exist.
