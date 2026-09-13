# M1.7 Physical QA Hardening Design

## Goal
Make the M1.7 Android acceptance harness self-sufficient, physically testable, and honest about evidence before asking a tester to execute any gate.

## Approved design
- Account provisioning is automatic inside the isolated M1.7 Supabase project; the tester does not invent credentials.
- The generated QA identity is automatically authenticated and provisioned for the isolated project.
- The QA authentication session persists across process termination so restart durability tests do not accidentally become authentication tests.
- Every M1.7 screen has visible Back navigation and Android hardware Back follows the same navigation state machine rather than exiting the app unexpectedly.
- A pre-flight state machine checks that every physical test prerequisite is actually available before exposing the corresponding test control.
- The 12 acceptance gates are represented by executable controls and evidence. A setup action is never labelled as proof of a server-side condition.
- Duplicate replay sends the same durable command identity again and verifies authoritative idempotency.
- Conflict testing creates an actual stale-revision server conflict and verifies the authoritative server-wins response.
- Validation, cross-company authorization, revoked-device, and retryable/durable failure scenarios have explicit executable controls or are reported as unavailable; they are never inferred from local validation or connectivity state.
- Gate 8 is driven by the production repository/domain observation contract rather than direct SQLite polling.
- The final matrix distinguishes PASS, FAIL, and NOT PROVEN.

## Hard boundary
The isolated project `fuaiodkyaqfandbenuol` is the only Supabase target for M1.7 physical QA. Production remains untouched.
