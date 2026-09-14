# SITE-SYNC M1.8 — Adversarial Validation and Release Proof Plan

## Goal
Execute M1.7/M1.8 evidence gates in the isolated test environment, produce a fresh provenance-bound Android artifact, and close M1 only when every required gate is proven.

## Phase 1 — Repository and test inventory
1. Inspect current M1.7 sync, repository, QA and Android files.
2. Map each Linear acceptance requirement to an executable test/control.
3. Identify any gate that cannot currently be executed or observed by the APK.
4. Treat every missing capability as an engineering blocker.

**Exit:** a capability matrix exists for G1–G12 with exact implementation/test locations and no assumed capabilities.

## Phase 2 — Automated verification
1. Run TypeScript checks.
2. Run ESLint.
3. Run Jest/unit/integration suites.
4. Run Android lint.
5. Build the configured release artifact.
6. Record failures without masking or converting them into warnings.

**Exit:** all applicable automated gates pass, or concrete defects are created and fixed before continuing.

## Phase 3 — Isolated Supabase proof
1. Verify target project is SITE-SYNC-M17-TEST.
2. Verify production endpoint/configuration is absent from the QA artifact.
3. Verify schema and migration state.
4. Execute authenticated acceptance cases.
5. Prove tenant/assignment/device authorization.
6. Prove protected-table write denial.
7. Prove RPC idempotency and strict revision behaviour.
8. Prove duplicate replay, concurrent same-revision commands and stale revision conflicts.
9. Prove transaction rollback and event/receipt invariants.
10. Classify current security-advisor findings and eliminate any release-relevant exposure.

**Exit:** authoritative server evidence exists for all server-dependent acceptance claims.

## Phase 4 — QA APK capability and provenance audit
1. Verify source commit and branch.
2. Verify isolated backend target.
3. Verify no production configuration.
4. Verify the APK contains the twelve-gate runner, pre-flight, reset/cleanup and evidence surfaces.
5. Verify automatic QA identity provisioning/authentication/device registration.
6. Verify repository observer instrumentation for G8.
7. Build fresh release APK.
8. Calculate SHA-256 from the actual APK.
9. Preserve source/build/checksum metadata.

**Exit:** the exact artifact is capable of executing the physical suite; no tester-time discovery is required.

## Phase 5 — Physical pre-flight
1. Install the fresh artifact.
2. Cold launch without Metro/development tooling.
3. Confirm isolated endpoint.
4. Confirm clean/restorable SQLite state.
5. Confirm automatic QA identity/context/device provisioning.
6. Confirm real RPC and repository observer availability.
7. Confirm network control and reset/cleanup capability.

**Exit:** pre-flight PASS. Any failure stops the physical suite.

## Phase 6 — Physical G1–G12
Execute each scenario using:

`Setup → Action → Observation → Evidence → Cleanup → Next prerequisite`

Do not infer a gate from another gate. Record exact command IDs, event IDs, revisions, UI states and diagnostics. A `NOT_PROVEN` result blocks completion.

## Phase 7 — Evidence reconciliation
1. Compare local evidence against authoritative Supabase state.
2. Verify command/event/receipt counts.
3. Verify revision sequence.
4. Verify tenant isolation.
5. Verify APK checksum/source provenance.
6. Verify no production writes occurred.
7. Mark each Linear gate PASS/FAIL/NOT_PROVEN.
8. Resolve every FAIL/NOT_PROVEN before closure.

## Phase 8 — M1 closure and M2 handoff
Only after evidence review:
1. Move MMM-35 to Done if its explicit completion criteria are satisfied.
2. Complete MMM-36 M1.8.
3. Update the M1 milestone evidence/status.
4. Activate M2.0 as the next implementation target.
5. Implement M2.0 product shell/navigation before M2.1 TODAY.
6. M2.1A persisted operational project projection remains the dependency for real TODAY data.

## Hard prohibitions
- No production Supabase migration during M1.7/M1.8.
- No fabricated test results.
- No manual refresh substituted for repository observation.
- No simulated server response used as authoritative proof.
- No release claim based solely on build success.
- No `NOT_PROVEN` accepted as PASS.
- No M2 product work used to conceal incomplete M1 acceptance.

## Definition of done
M1 is complete only when the evidence package demonstrates the trustworthy offline operational record end-to-end: authenticated identity/context → QR → offline attendance → durable command → authenticated isolated-server effect → deterministic reconciliation → timesheet derivation → tenant/security proof → physical Android release verification.
