# M1.7 Physical QA Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the brittle M1.7 physical-test flow with a self-provisioning, restart-safe, navigable, evidence-driven acceptance harness that can only claim gates supported by real runtime evidence.

**Architecture:** Keep M1.7 isolated from production. Put account provisioning behind the existing isolated Edge Function, use a Supabase-valid synthetic email contract, persist the isolated auth session, add a navigation/back state machine at the app boundary, and make the QA screen a guided state machine whose results distinguish PASS/FAIL/NOT PROVEN. Add focused tests for the new provisioning, navigation, session and evidence semantics before changing runtime code.

**Tech Stack:** React Native 0.86, TypeScript, Supabase JS 2.x, Supabase Edge Functions, SQLite via op-sqlite, Jest, GitHub Actions, Android release APK.

**Spec:** `docs/superpowers/specs/2026-09-13-m17-qa-hardening-design.md`

## Global Constraints

- M1.7 physical QA uses only isolated Supabase project `fuaiodkyaqfandbenuol`.
- Production Supabase must not be modified, merged, or used by the QA harness.
- No service-role or Supabase secret key may be embedded in the Android application.
- No tester-entered arbitrary credentials are required for account creation.
- Android hardware Back must not exit the app while inside an M1.7 QA flow.
- A setup action is not evidence of a server-side acceptance gate.
- Evidence states are `PASS`, `FAIL`, or `NOT PROVEN`; `NOT PROVEN` cannot count toward acceptance.
- Direct SQLite read-back is diagnostic only for Gate 8; production repository/domain observation must drive the UI evidence.
- Follow TDD: failing test first, then minimal implementation, then full verification.

---

### Task 1: Establish the hardened QA contract and test seams

**Files:**
- Create: `sitesync/src/attendance/m17QaContracts.ts`
- Test: `sitesync/__tests__/m17QaContracts.test.ts`

**Interfaces:**
- Produces `QaEvidenceStatus = 'PASS' | 'FAIL' | 'NOT_PROVEN'`.
- Produces `M17GateId` for gates 1–12.
- Produces `QaEvidence` and `createQaEvidence(...)` so the UI cannot accidentally treat setup as proof.

- [ ] **Step 1: Write the failing tests**

```ts
test('NOT_PROVEN does not count toward accepted gates', () => {
  const evidence = createQaEvidence('NOT_PROVEN', 'duplicate delivery was not actually replayed');
  expect(evidence.status).toBe('NOT_PROVEN');
  expect(evidence.countsAsPass).toBe(false);
});

test('PASS evidence requires explicit authoritative proof', () => {
  const evidence = createQaEvidence('PASS', 'server receipt observed for the same command id');
  expect(evidence.countsAsPass).toBe(true);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `cd sitesync && npx jest __tests__/m17QaContracts.test.ts --runInBand`
Expected: FAIL because `m17QaContracts.ts` does not exist.

- [ ] **Step 3: Implement the minimal contract**

```ts
export type QaEvidenceStatus = 'PASS' | 'FAIL' | 'NOT_PROVEN';
export type M17GateId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type QaEvidence = { status: QaEvidenceStatus; detail: string; countsAsPass: boolean };

export function createQaEvidence(status: QaEvidenceStatus, detail: string): QaEvidence {
  return { status, detail, countsAsPass: status === 'PASS' };
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `cd sitesync && npx jest __tests__/m17QaContracts.test.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add sitesync/src/attendance/m17QaContracts.ts sitesync/__tests__/m17QaContracts.test.ts
git commit -m "test: establish explicit M1.7 QA evidence contract"
```

---

### Task 2: Replace invalid QA email generation with a valid isolated identity contract

**Files:**
- Modify: `sitesync/src/attendance/M17QaAccountProvisionScreen.tsx`
- Modify: isolated Supabase Edge Function `m17-qa-provision-account`
- Test: `sitesync/__tests__/m17QaAccountProvision.test.ts`

**Interfaces:**
- Produces `makeQaCredentials()` with an address accepted by the isolated Supabase Auth configuration.
- Provisioning remains server-side and uses the isolated project's secret key only inside the Edge Function.
- Client receives credentials/session state; it never receives the service-role key.

- [ ] **Step 1: Write the failing tests**

```ts
test('generated QA email is not an example.test address rejected by hosted Auth', () => {
  const credentials = makeQaCredentials();
  expect(credentials.email).toMatch(/^m17-qa-[a-z0-9]+@/);
  expect(credentials.email).not.toContain('@example.test');
});

test('generated credentials can be handed directly to the provisioning flow', () => {
  const credentials = makeQaCredentials();
  expect(credentials.password.length).toBeGreaterThanOrEqual(12);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `cd sitesync && npx jest __tests__/m17QaAccountProvision.test.ts --runInBand`
Expected: FAIL because the current generator emits `@example.test` and is not exported/testable.

- [ ] **Step 3: Implement the minimal generator and server contract**

Use a Supabase-valid synthetic domain configured for the isolated test project, export only the credential generator needed by the test, and make the Edge Function validate exactly the same domain. Do not loosen the endpoint to arbitrary email addresses.

- [ ] **Step 4: Verify the isolated Edge Function contract directly**

Exercise the function with one generated credential pair and confirm the response is `200`, `ok: true`, and the returned email matches the requested generated email. Query `auth.users` in the isolated project to confirm exactly one new user was created.

- [ ] **Step 5: Run focused and existing tests**

Run: `cd sitesync && npx jest __tests__/m17QaAccountProvision.test.ts __tests__/m17QaBootstrap.test.ts --runInBand`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add sitesync/src/attendance/M17QaAccountProvisionScreen.tsx sitesync/__tests__/m17QaAccountProvision.test.ts
git commit -m "fix: use a Supabase-valid isolated QA account contract"
```

---

### Task 3: Make QA authentication persistent across process termination

**Files:**
- Modify: `sitesync/src/supabase/m17SupabaseClient.ts`
- Modify: app auth bootstrap as required by the existing Supabase RN integration
- Test: `sitesync/__tests__/m17SupabaseClient.test.ts`

**Interfaces:**
- Produces an M1.7 Supabase client configured for persistent native session storage.
- Session restoration is isolated to the M1.7 client and does not change production auth configuration.

- [ ] **Step 1: Write the failing test**

```ts
test('M1.7 client enables persistent auth state', () => {
  const options = getM17AuthOptions();
  expect(options.persistSession).toBe(true);
  expect(options.autoRefreshToken).toBe(true);
  expect(options.detectSessionInUrl).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `cd sitesync && npx jest __tests__/m17SupabaseClient.test.ts --runInBand`
Expected: FAIL because the current client has `persistSession: false`.

- [ ] **Step 3: Implement persistent native storage**

Use the established React Native Supabase storage pattern already compatible with this project. Keep the URL polyfill import at the application entry point and do not introduce web-only storage.

- [ ] **Step 4: Run focused tests**

Run: `cd sitesync && npx jest __tests__/m17SupabaseClient.test.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add sitesync/src/supabase/m17SupabaseClient.ts sitesync/__tests__/m17SupabaseClient.test.ts
 git commit -m "fix: persist isolated M1.7 auth session across restart"
```

---

### Task 4: Add deterministic navigation and Android Back handling

**Files:**
- Modify: `sitesync/App.tsx`
- Create: `sitesync/src/navigation/m17QaNavigation.ts`
- Test: `sitesync/__tests__/m17QaNavigation.test.ts`

**Interfaces:**
- Produces `M17QaScreen = 'entry' | 'provision' | 'runtime'` and `previousM17QaScreen(...)`.
- App consumes the navigation helper and a single Android `BackHandler` subscription while M1.7 is active.

- [ ] **Step 1: Write failing navigation tests**

```ts
test('runtime back returns to provisioning instead of exiting', () => {
  expect(previousM17QaScreen('runtime')).toBe('provision');
});

test('provision back returns to M1.7 entry', () => {
  expect(previousM17QaScreen('provision')).toBe('entry');
});

test('entry has no in-flow previous screen', () => {
  expect(previousM17QaScreen('entry')).toBe(null);
});
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `cd sitesync && npx jest __tests__/m17QaNavigation.test.ts --runInBand`
Expected: FAIL because the navigation helper does not exist.

- [ ] **Step 3: Implement navigation helper**

Return `provision` from `runtime`, `entry` from `provision`, and `null` from `entry`.

- [ ] **Step 4: Wire visible Back controls**

Add `‹ BACK` to the provisioning screen and ensure runtime Back calls the navigation helper rather than immediately returning home.

- [ ] **Step 5: Wire Android hardware Back**

Subscribe to `BackHandler` only while the M1.7 flow is active. Consume the event when it can navigate within M1.7. Only return `false` at the M1.7 entry boundary so Android may perform its normal home/exit behavior there.

- [ ] **Step 6: Run focused tests and TypeScript**

Run: `cd sitesync && npx jest __tests__/m17QaNavigation.test.ts --runInBand && npx tsc --noEmit`
Expected: PASS with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add sitesync/App.tsx sitesync/src/navigation/m17QaNavigation.ts sitesync/__tests__/m17QaNavigation.test.ts sitesync/src/attendance/M17QaAccountProvisionScreen.tsx
git commit -m "fix: make M1.7 QA navigation safe on Android"
```

---

### Task 5: Remove manual credential entry from the critical path

**Files:**
- Modify: `sitesync/src/attendance/M17QaAccountProvisionScreen.tsx`
- Modify: `sitesync/src/attendance/M17RealRuntimeQaScreen.tsx`
- Test: `sitesync/__tests__/m17QaAccountFlow.test.tsx`

**Interfaces:**
- Provisioning screen exposes `onReady(session)` rather than requiring the tester to retype generated credentials.
- Runtime screen accepts an authenticated session and resolves identity automatically.

- [ ] **Step 1: Write failing UI-flow tests**

```tsx
test('successful account creation exposes Continue without requiring credential re-entry', async () => {
  // Assert the generated account result contains a Continue control and no required email/password fields.
});

test('runtime screen can start from the provisioned authenticated session', async () => {
  // Assert the runtime flow does not render a sign-in form when an authenticated QA session is supplied.
});
```

- [ ] **Step 2: Run focused tests and verify the new assertions fail**

Run: `cd sitesync && npx jest __tests__/m17QaAccountFlow.test.tsx --runInBand`
Expected: FAIL against the current manual-login runtime screen.

- [ ] **Step 3: Implement session handoff**

After Edge Function provisioning, sign in immediately in the provisioning screen, bootstrap the current user, and pass the authenticated state into runtime. Keep the generated credentials visible only as an audit/recovery record.

- [ ] **Step 4: Remove required manual login from runtime**

If a restored authenticated session exists, resolve identity/device/project automatically. If no session exists, present a clear recovery action back to provisioning rather than a free-form credential form.

- [ ] **Step 5: Run focused tests**

Run: `cd sitesync && npx jest __tests__/m17QaAccountFlow.test.tsx --runInBand`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add sitesync/src/attendance/M17QaAccountProvisionScreen.tsx sitesync/src/attendance/M17RealRuntimeQaScreen.tsx sitesync/__tests__/m17QaAccountFlow.test.tsx
git commit -m "fix: hand authenticated QA session directly into M1.7 runtime"
```

---

### Task 6: Replace the flat QA button pile with a dependency-aware test state machine

**Files:**
- Create: `sitesync/src/attendance/m17QaTestPlan.ts`
- Modify: `sitesync/src/attendance/M17RealRuntimeQaScreen.tsx`
- Test: `sitesync/__tests__/m17QaTestPlan.test.ts`

**Interfaces:**
- Produces ordered gate definitions with prerequisites and physical actions.
- Produces `canRunGate(gateId, state)` and `nextRequiredAction(state)`.

- [ ] **Step 1: Write failing tests**

```ts
test('sync cannot be offered before offline durable command and restart recovery', () => {
  expect(canRunGate(4, { gate2: 'PASS', gate3: 'NOT_PROVEN' })).toBe(false);
});

test('a physical force-stop checkpoint is an explicit prerequisite for restart proof', () => {
  expect(nextRequiredAction({ gate2: 'PASS', gate3: 'NOT_PROVEN' })).toMatch(/force-stop/i);
});
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `cd sitesync && npx jest __tests__/m17QaTestPlan.test.ts --runInBand`
Expected: FAIL because the state machine does not exist.

- [ ] **Step 3: Implement ordered gate definitions**

Define the 12 gates with exact prerequisites and explicit physical actions. Gate 8 must require a repository observer event after a real domain mutation. Gates 9–11 must not accept setup-only evidence.

- [ ] **Step 4: Integrate the state machine into the UI**

Hide or disable controls whose prerequisites are unmet. Show one next action at a time where the physical device must do something. Display `PASS`, `FAIL`, or `NOT PROVEN` for each gate.

- [ ] **Step 5: Run focused tests and TypeScript**

Run: `cd sitesync && npx jest __tests__/m17QaTestPlan.test.ts --runInBand && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add sitesync/src/attendance/m17QaTestPlan.ts sitesync/src/attendance/M17RealRuntimeQaScreen.tsx sitesync/__tests__/m17QaTestPlan.test.ts
git commit -m "feat: make M1.7 QA execution dependency-aware"
```

---

### Task 7: Implement real duplicate-delivery and conflict evidence controls

**Files:**
- Modify: sync repository/runtime files identified by existing M1.7 command contract
- Modify: `sitesync/src/attendance/M17RealRuntimeQaScreen.tsx`
- Test: existing sync/idempotency and reconciliation suites plus new focused tests

**Interfaces:**
- Duplicate control reuses the exact same command ID/payload and submits it twice through the authenticated RPC path.
- Conflict control creates a stale revision against an independently advanced authoritative server revision and verifies server-wins reconciliation.

- [ ] **Step 1: Write failing tests for same-command replay**

```ts
test('duplicate replay submits the identical command id twice and accepts one authoritative mutation', async () => {
  // Use the existing real sync command contract with one command identity and two delivery attempts.
  // Assert the receipt/event/aggregate mutation count remains one while the second delivery resolves idempotently.
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run the relevant existing Jest test plus the new test. Expected: FAIL because the current QA button only requests a normal sync and does not redeliver the same command.

- [ ] **Step 3: Implement exact duplicate delivery**

Add a test-only command-delivery entry point or controlled repository operation that sends the same durable command identity twice. Do not fabricate a second command.

- [ ] **Step 4: Write failing conflict proof**

```ts
test('stale revision produces authoritative conflict and server-wins local state', async () => {
  // Advance authoritative state, preserve a stale local revision, deliver the stale command, and assert conflict receipt plus server revision/state reconciliation.
});
```

- [ ] **Step 5: Implement authoritative conflict exercise**

Use the existing RPC contract to force a real revision mismatch in the isolated project, then consume the returned authoritative state and prove local state equals the server revision/state.

- [ ] **Step 6: Run sync/reconciliation tests**

Run: `cd sitesync && npx jest --runInBand`
Expected: PASS for all existing suites plus the new duplicate/conflict tests.

- [ ] **Step 7: Commit**

```bash
git add sitesync/src/attendance/M17RealRuntimeQaScreen.tsx sitesync/src/sync sitesync/__tests__
git commit -m "test: prove M1.7 duplicate delivery and server-wins conflict"
```

---

### Task 8: Add executable authorization, revocation, and transport-failure scenarios

**Files:**
- Modify: isolated M1.7 QA migration/function set only
- Modify: `sitesync/src/attendance/M17RealRuntimeQaScreen.tsx`
- Test: new M1.7 QA failure-path tests

**Interfaces:**
- QA can deliberately exercise cross-company authorization rejection, revoked-device rejection, retryable transport failure, and durable non-retryable failure without touching production.
- Each scenario produces explicit evidence rather than relying on local validation.

- [ ] **Step 1: Write failing tests for scenario classification**

```ts
test('authorization failure is distinct from local validation failure', () => {
  // Assert the QA evidence category is AUTHORIZATION_REJECTED rather than generic validation.
});

test('retryable transport failure is distinct from durable failure', () => {
  // Assert the runtime preserves the command and schedules retry only for retryable failure.
});
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run the new focused suite. Expected: FAIL because the current UI exposes neither authoritative authorization/revocation scenarios nor controlled transport classification.

- [ ] **Step 3: Implement isolated-only scenario controls**

Create narrowly scoped test fixtures/functions that use the isolated IDs and cannot target production. The revoked-device scenario must revoke the actual registered QA device, then attempt a real authenticated command and capture the authoritative rejection. The cross-company scenario must use a second isolated company/project fixture. Transport scenarios must operate through the actual sync command path.

- [ ] **Step 4: Run focused tests**

Run: `cd sitesync && npx jest --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add sitesync/supabase sitesync/src/attendance/M17RealRuntimeQaScreen.tsx sitesync/__tests__
git commit -m "test: add authoritative M1.7 failure-path exercises"
```

---

### Task 9: Make Gate 8 genuinely repository-driven

**Files:**
- Modify: `sitesync/src/attendance/M17RealRuntimeQaScreen.tsx`
- Modify/test: `sitesync/src/database/repositoryChangeBus.ts` and repository/domain services as required
- Test: repository observation suites and new UI observation test

**Interfaces:**
- UI state subscribes to the production repository/domain observation mechanism.
- Direct SQL polling remains available only as diagnostic information and cannot set Gate 8 PASS.

- [ ] **Step 1: Write failing UI observation test**

```tsx
test('repository event changes visible QA state without manual refresh', async () => {
  // Emit a real repository/domain event and assert the screen updates from the subscription alone.
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run the repository/UI observation suite. Expected: FAIL because current Gate 8 depends on `refreshLocalState()` SQL polling for visible state.

- [ ] **Step 3: Implement domain observer binding**

Subscribe once on mount, update the rendered attendance/timesheet/command state from the repository event payload, and remove the subscription on unmount. Ensure sync success/retryable/durable/conflict events all emit through the same mechanism.

- [ ] **Step 4: Run repository/UI tests**

Run: `cd sitesync && npx jest __tests__/repositoryChangeBus.test.ts <new-ui-observation-test> --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add sitesync/src/attendance/M17RealRuntimeQaScreen.tsx sitesync/src/database/repositoryChangeBus.ts sitesync/src/attendance sitesync/__tests__
git commit -m "fix: bind M1.7 QA observation to repository events"
```

---

### Task 10: Add automated pre-flight capability checks and evidence matrix

**Files:**
- Create: `sitesync/src/attendance/m17QaPreflight.ts`
- Modify: `sitesync/src/attendance/M17RealRuntimeQaScreen.tsx`
- Test: `sitesync/__tests__/m17QaPreflight.test.ts`

**Interfaces:**
- Produces `M17PreflightResult` containing isolated target, auth readiness, database readiness, navigation readiness, repository observer readiness, failure-scenario readiness, and required physical actions.
- Produces a final 12-gate matrix with no implicit passes.

- [ ] **Step 1: Write failing tests**

```ts
test('preflight blocks runtime when a required capability is unavailable', () => {
  const result = evaluateM17Preflight({ auth: true, database: true, repositoryObserver: false, failureScenarios: false });
  expect(result.ready).toBe(false);
  expect(result.blockers).toEqual(expect.arrayContaining(['repository observer']));
});
```

- [ ] **Step 2: Run focused test and verify it fails**

Run: `cd sitesync && npx jest __tests__/m17QaPreflight.test.ts --runInBand`
Expected: FAIL because the pre-flight evaluator does not exist.

- [ ] **Step 3: Implement the evaluator and final matrix**

Require all mandatory software capabilities before exposing the runtime controls. Represent physical actions as explicit pending requirements rather than pretending the app can perform them.

- [ ] **Step 4: Integrate pre-flight screen**

The first M1.7 screen after entry must show a checklist. If a capability is missing, it must say exactly what is missing and stop the flow before the tester spends time executing dependent steps.

- [ ] **Step 5: Run focused tests and TypeScript**

Run: `cd sitesync && npx jest __tests__/m17QaPreflight.test.ts --runInBand && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add sitesync/src/attendance/m17QaPreflight.ts sitesync/src/attendance/M17RealRuntimeQaScreen.tsx sitesync/__tests__/m17QaPreflight.test.ts
 git commit -m "feat: gate M1.7 physical QA with executable preflight"
```

---

### Task 11: Full verification, isolated-server proof, and physical APK gate

**Files:**
- Modify only if verification exposes a defect.
- Test: all existing tests, Android build workflow, isolated Supabase runtime.

**Interfaces:**
- Produces a fresh Android release APK whose provenance names the exact hardened commit.
- Produces fresh evidence for each M1.7 gate; no gate is promoted from NOT_PROVEN without direct evidence.

- [ ] **Step 1: Run the complete local/CI test suite**

Run: `cd sitesync && npm ci --ignore-scripts && npm test -- --runInBand && npx tsc --noEmit && npx eslint . && ./gradlew :app:assembleRelease --no-daemon --stacktrace`
Expected: all commands exit 0.

- [ ] **Step 2: Run the real isolated Supabase integration gate**

Use only the M1.7 isolated credentials/secrets and verify authentication, command creation, real RPC, receipt/event, authoritative reconciliation and revision monotonicity.

- [ ] **Step 3: Verify the built artifact itself**

Compute SHA-256 of the exact APK and inspect the provenance manifest. Confirm the provenance commit equals the hardened branch head and the project reference equals `fuaiodkyaqfandbenuol`.

- [ ] **Step 4: Perform a capability audit before handing the APK to the tester**

Confirm from source/build evidence that:
- account creation is automatic;
- generated address is accepted by isolated Auth;
- authenticated session persists;
- visible Back exists on every M1.7 screen;
- Android hardware Back is handled inside the flow;
- physical actions have explicit UI checkpoints;
- duplicate replay is a same-command delivery;
- conflict proof is authoritative;
- failure scenarios are executable;
- Gate 8 is repository-driven;
- final matrix distinguishes PASS/FAIL/NOT PROVEN.

- [ ] **Step 5: Run fresh physical smoke test on the actual APK**

Verify launch, M1.7 entry, account creation, automatic authentication, visible Back, hardware Back, forced process termination, relaunch, restored session, and return to the guided test flow before asking for the full 12-gate run.

- [ ] **Step 6: Only then publish the APK**

Do not call the APK acceptance-ready until the artifact and physical smoke test are verified from the exact build being delivered.

- [ ] **Step 7: Update Linear evidence**

Record the exact commit, workflow run, artifact SHA-256, isolated project ref, test results, and every remaining NOT_PROVEN gate. Production remains untouched.

