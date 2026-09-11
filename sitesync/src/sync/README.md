# M1.7 Sync Foundation

This directory owns client-side synchronization orchestration only.

The current foundation deliberately uses an injected `SyncTransport`. It does not contain Supabase calls and does not infer server verification from connectivity.

The command ledger remains durable SQLite state. A command moves through `PENDING` → `PROCESSING` → `SUCCEEDED`, `RETRYABLE_FAILURE`, `FAILED`, or `CONFLICT`. Attendance state becomes `ONLINE_VERIFIED` only after an explicit successful server response is persisted.

Production transport is a later M1.7 slice after the local worker and reconciliation semantics pass controlled verification.

CI verification is required before merge.
