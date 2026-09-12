# SITE-SYNC M1.7 — Server Synchronization and Deterministic Reconciliation Design

## Status
Approved design; implementation follows the completed local M1.7 sync-engine foundation. Production Supabase is not authorized for migration by this document.

## Goal
Extend the local durable-command engine with a server-authoritative synchronization protocol that is restart-safe, idempotent, revision-controlled, tenant-isolated, device-authorized, auditable, and honest about verification state.

## Locked decisions
- M1.6 owns local attendance mutation and durable command creation.
- M1.7 owns synchronization and deterministic reconciliation.
- SQLite remains the device source of truth for unsynchronized commands.
- Connectivity never implies `ONLINE_VERIFIED`.
- Synchronization aggregate: `project_id + person_id + work_date_utc`.
- Server revision is strict and monotonic; mutation requires `base_revision == server_revision`.
- `command_id` is the unique server idempotency key.
- Server state wins conflicts; stale commands become durable local `CONFLICT` records with server payload preserved.
- No silent merge occurs in M1.7.
- Application mutation crosses one narrow PostgreSQL RPC: `sync_attendance_command(...)`.
- Client has no arbitrary direct-write path to authoritative attendance tables.

## Device authorization amendment
The sync request MUST include the registered device installation identifier:

`device_installation_id UUID`

The identifier is not trusted merely because it is supplied. The RPC derives the authenticated actor from `auth.uid()` and verifies that the supplied installation belongs to that actor and is `ACTIVE` in `public.device_installations`. A revoked, missing, or cross-user installation is rejected before authoritative attendance state is touched.

Logical RPC input:

| Field | Type | Rule |
|---|---|---|
| `command_id` | UUID | Required, unique idempotency key |
| `device_installation_id` | UUID | Required; must belong to `auth.uid()` and be ACTIVE |
| `project_id` | UUID | Required aggregate identity |
| `person_id` | UUID | Required aggregate identity |
| `work_date_utc` | DATE | Required aggregate identity |
| `base_revision` | BIGINT | Required, non-negative, must equal current revision for mutation |
| `command_type` | TEXT | `CHECK_IN` or `CHECK_OUT` |
| `payload` | JSONB | Required and schema-validated |

The request does not accept trusted organisation/company identity. Tenant and project/person authorization is derived relationally from authenticated identity, company membership, project assignment, participation, target-person assignment, and device ownership.

## Transaction contract
For an accepted command, one database transaction performs:
1. authenticate `auth.uid()`;
2. validate device ownership and ACTIVE status;
3. validate actor/target tenant, company, project and assignment authorization;
4. validate command and aggregate identity/payload;
5. check command receipt for idempotency;
6. lock the attendance-day aggregate row;
7. re-read and compare `server_revision`;
8. validate the command against authoritative state;
9. mutate aggregate;
10. append exactly one immutable event;
11. persist exactly one command receipt/result;
12. increment revision exactly once;
13. commit and return authoritative post-command state.

Any failure before commit rolls back aggregate, event, receipt and revision together. Duplicate delivery returns the original accepted result as `DUPLICATE_ACCEPTED` without a second mutation, event, or revision increment.

## Responses
- `ACCEPTED { command_id, server_revision, aggregate, result }`
- `DUPLICATE_ACCEPTED { command_id, server_revision, aggregate, result }`
- `REVISION_CONFLICT { command_id, server_revision, authoritative_aggregate, reason_code }`
- `AUTHORIZATION_REJECTED { code, message }`
- `VALIDATION_REJECTED { code, message }`
- `DEVICE_REVOKED { code, message }`
- `SERVER_ERROR { code, message, retryable }`

A conflict performs no authoritative mutation. The local command becomes `CONFLICT`, and the authoritative server payload is retained.

## Server persistence
Dedicated M1.7 tables are used because the existing schema has no authoritative attendance-day aggregate, command receipt/idempotency ledger, or immutable server attendance-event layer with the required invariants.

1. Attendance-day aggregate keyed by `(project_id, person_id, work_date_utc)` with `server_revision` and explicit authoritative state.
2. Command receipt keyed uniquely by `command_id`, retaining original authoritative result.
3. Immutable server event history with previous/new revision and actor/device evidence.

## Security
- Authenticated Supabase identity is mandatory.
- Device ID must resolve to an ACTIVE installation owned by `auth.uid()`.
- Company/project/person authorization is relational; client-supplied identifiers never elevate access.
- Cross-company, cross-project, cross-person, cross-user-device and revoked-device requests are rejected.
- RLS is enabled on every exposed M1.7 table with least-privilege policies.
- `user_metadata` is never used for authorization.
- `SECURITY DEFINER` is avoided unless required; if required it uses a fixed safe `search_path`, explicit `auth.uid()` checks, schema-qualified references, and no broader write capability than the RPC contract.
- No service-role secret is shipped to the mobile client.

## Local invariants
`PENDING -> PROCESSING -> SUCCEEDED | CONFLICT | FAILED`, with retryable server failures returning to `PENDING` with bounded backoff. Stale processing at max attempts becomes `FAILED`. Accepted server results and local projection updates are atomic. Older commands cannot overwrite newer projections. Network connectivity alone cannot create verified state.

## Acceptance matrix
- unauthenticated rejected;
- wrong company/project/person rejected;
- cross-user device rejected;
- revoked device rejected;
- malformed payload rejected;
- revision 0 -> 1 accepted;
- sequential revision accepted;
- stale/future revision conflicts without mutation;
- duplicate delivery is idempotent;
- concurrent same-revision delivery yields one winner;
- transaction rollback leaves no partial state;
- every accepted mutation has one event and one receipt;
- conflict preserves authoritative server state;
- restart/retry/max-attempt behavior remains durable;
- production Supabase remains unchanged until explicit production migration approval.

## Migration strategy
Develop and test against disposable/local PostgreSQL first. Then use an isolated SITE-SYNC Supabase test project for authenticated/RLS/integration/adversarial verification. Only after all evidence, review, and release gates pass may production migration be considered.

## Definition of done
The server transport phase is not complete until the RPC contract, schema, authorization/RLS, idempotency, strict revisions, atomic event/receipt persistence, client adapter, isolated integration tests, adversarial tests, local reconciliation, CI/release proof, and state-honesty invariants are all verified. Production remains untouched until explicit approval.
