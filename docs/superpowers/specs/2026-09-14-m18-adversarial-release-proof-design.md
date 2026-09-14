# SITE-SYNC M1.8 — Adversarial Validation and Release Proof Design

## Status
Approved for execution following the M1.7 evidence-gated direction confirmed on 14 September 2026.

## Objective
Prove the complete M1 vertical slice on the isolated SITE-SYNC-M17-TEST environment and a fresh Android artifact before M1 is closed. M1.8 is evidence production, not a documentation exercise.

## Source of truth
- Linear: execution state and acceptance gates.
- GitHub: implementation, tests, evidence scripts and provenance.
- Isolated Supabase: authoritative integration/security state.
- Physical Android artifact: runtime acceptance instrument.
- Production Supabase: prohibited from migration or mutation during M1.7/M1.8.

## Locked architectural invariants
1. SQLite is authoritative for unsynchronized local commands.
2. Server state is authoritative after reconciliation.
3. `command_id` is the idempotency key.
4. `project_id + person_id + work_date_utc` is the attendance aggregate.
5. `base_revision` must equal the authoritative server revision for mutation.
6. Conflicts do not merge silently; server state wins and the local command remains `CONFLICT` with authoritative payload preserved.
7. `ONLINE_VERIFIED` is produced only by persisted authoritative reconciliation.
8. Device authorization is derived from authenticated identity and the registered ACTIVE installation; client-supplied tenant identity is never trusted.
9. Every accepted mutation has exactly one authoritative event and one command receipt.
10. Retryable transport failures are bounded; authorization, validation, revocation and revision conflicts are durable/non-retryable outcomes.

## Execution order

```text
M1.7 engineering prerequisites
        ↓
Static + unit verification
        ↓
Isolated Supabase integration/security proof
        ↓
QA APK capability/provenance audit
        ↓
Fresh release artifact
        ↓
Physical pre-flight
        ↓
Gates 1–12 in dependency order
        ↓
Evidence review
        ↓
M1.7 Done
        ↓
M1.8 adversarial completion / M1 closure
```

No physical tester time is spent until automated and artifact gates pass.

## M1.7 completion blockers to clear first
- MMM-57 physical acceptance harness must contain executable controls and observability for all twelve gates.
- MMM-58 repository/UI observation must prove production UI state binding without component-owned sync truth.
- Credentialed isolated-server runtime proof must exist for real RPC, duplicate replay, conflicts, authorization and revoked device.
- Retry classification and bounded exhaustion must be proven.
- Fresh artifact provenance must be bound to the tested source commit.

## Twelve-gate acceptance model

### G1 — Auth/context/device
Real isolated authentication, application identity, company/project/person context, assignment and ACTIVE device registration.

### G2 — Offline durability
Real check-in while offline; SQLite command, state and command ID persist before termination.

### G3 — Process termination
Force-stop/relaunch and automatically rediscover the exact pending command and state.

### G4 — Connectivity restoration/retry
Restore connectivity and prove retry resumes the pending command and reaches authoritative acceptance. Network status alone is insufficient.

### G5 — Authenticated RPC
Prove the real authenticated command envelope reaches the isolated Postgres RPC.

### G6 — Authoritative reconciliation
Persist authoritative status/result/revision and update local attendance/timesheet projections.

### G7 — Check-in/out/timesheet
Prove real check-in and check-out plus derived timesheet state.

### G8 — Repository/UI observation
Prove a persisted repository/domain change drives visible production UI state automatically, with no manual refresh or component-owned polling.

### G9 — Duplicate replay
Deliver the same `command_id` twice to the real RPC; prove one authoritative effect, one event, one revision increment and duplicate acceptance on replay.

### G10 — Revision conflict/server-wins
Deliver a stale `base_revision`; prove authoritative conflict, no server mutation, durable local `CONFLICT`, and preservation of server state/payload.

### G11 — Failure/security
Independently prove malformed/invalid input, cross-company or unauthorized targeting, revoked-device rejection, and retryable transport followed by bounded durable failure classification.

### G12 — Lifecycle/race
Exercise repeated sync lifecycle starts/stops, navigation, reconnect/retry, restart/resume and concurrent triggers. Prove single-worker/single-processing invariants and durable state integrity.

## Evidence contract
Every gate records:
- gate and scenario ID;
- start/end time;
- PASS, FAIL or NOT_PROVEN;
- source/build identifier;
- command/event IDs where applicable;
- local status/revision;
- server status/revision/payload where applicable;
- observed UI state for G8;
- transport classification where applicable;
- diagnostic/error code;
- cleanup/reset result.

`NOT_PROVEN` is a blocking result. Screenshots, logs, local simulations or build success cannot substitute for authoritative evidence.

## Security verification
The isolated database must prove:
- tenant isolation;
- protected-table write denial;
- anonymous RPC denial where required;
- inactive membership/assignment denial;
- revoked-device denial;
- cross-user device denial;
- no client-controlled tenant escalation;
- intentional SECURITY DEFINER functions have safe search paths and least privilege;
- QA-only provisioning/revocation functions are not suitable for production exposure.

The isolated environment's current security-advisor findings are treated as release blockers until classified and resolved or explicitly proven intentional and isolated from production. Production leaked-password protection remains a production hardening task, not a reason to mutate production during M1.7/M1.8.

## Artifact provenance
A release artifact is acceptable only when its source commit, branch, isolated backend target, configuration, build result and SHA-256 are recorded and independently matched. A successful Gradle build alone is not release proof.

## Completion criteria
M1.8/M1 closure requires:
- all required automated tests pass;
- isolated integration/security proof passes;
- fresh APK capability audit passes;
- physical acceptance covers all twelve gates;
- no gate is `NOT_PROVEN`;
- evidence is reproducible and attributable to the tested artifact/source;
- production Supabase remains unchanged by the acceptance run.
