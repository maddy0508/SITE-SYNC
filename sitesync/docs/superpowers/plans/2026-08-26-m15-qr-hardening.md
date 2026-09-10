# M1.5 QR Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden M1.5 so the QR path is reproducible, concurrency-safe, actually integrated into the application, consistently presented, and verified at the meaningful runtime boundary.

**Architecture:** Keep QR parsing and trusted validation as pure/domain boundaries. The native camera adapter only gates callback admission; the scanner owns lifecycle and invokes the pipeline only after a frame is admitted. A single result-state model drives presentation. No attendance mutation is introduced in M1.5.

**Tech Stack:** React Native, TypeScript, Jest, VisionCamera, Android Gradle, GitHub Actions, npm.

**Spec:** `sitesync/docs/superpowers/plans/2026-08-25-m1.5-qr-attendance-completion.md`

## Global Constraints

- Do not mutate attendance state, command ledger state, synchronization state, or production database schema.
- QR payloads never confer authority; trusted local context and membership/roster records remain authoritative.
- Offline validation may only produce `PROVISIONAL` when trusted cached data is sufficient.
- Keep QR generation, parsing, validation, camera lifecycle, and UI boundaries separately testable.
- Do not merge the feature branch into `main` during this hardening pass.
- Use `npm ci` in CI and keep `package.json`/`package-lock.json` synchronized.

---

### Task 1: Lock the concurrency contract

**Files:**
- Modify: `sitesync/__tests__/qrScanController.test.ts`
- Modify: `sitesync/src/qr/qrScanController.ts`
- Modify: `sitesync/src/attendance/qr/QrCameraFrameAdapter.ts`
- Modify: `sitesync/src/attendance/qr/QrCameraFrameAdapter.test.ts`

- [ ] Add failing tests proving a second frame cannot be admitted while the first scan is being processed, including a different QR value.
- [ ] Run the targeted controller/adapter tests and confirm the failure is caused by the missing processing lock.
- [ ] Add an explicit release/complete operation to the controller and adapter boundary.
- [ ] Keep the existing duplicate suppression window as secondary debounce after processing completes.
- [ ] Run the targeted tests and confirm green.

### Task 2: Integrate the real scan pipeline

**Files:**
- Modify: `sitesync/src/attendance/qr/QrScannerScreen.tsx`
- Modify: `sitesync/src/attendance/qr/QrScanResultPanel.tsx`
- Modify: `sitesync/App.tsx`
- Modify/Create: QR integration tests as required

- [ ] Add failing integration coverage proving a captured native value reaches `QrScanPipeline.process` rather than being stored as an untrusted last-capture string.
- [ ] Pass the current `ProjectContextRecord` and connectivity state into the pipeline through an explicit scanner dependency boundary.
- [ ] Convert pipeline results into the single UI result-state model.
- [ ] Keep scanner close/reset behaviour independent of attendance mutation.
- [ ] Run the focused integration tests and confirm green.

### Task 3: Consolidate result presentation

**Files:**
- Modify: `sitesync/src/attendance/qr/QrScanResultPanel.tsx`
- Modify: `sitesync/src/attendance/qr/QrScannerScreen.tsx`
- Modify/Create: result-state tests

- [ ] Define one discriminated result-state type covering valid, provisional, blocked, parse error, camera permission, unavailable, and processing states.
- [ ] Remove duplicate status rendering from the scanner screen where the panel can own it.
- [ ] Test every result-state mapping.

### Task 4: Improve QR display reliability

**Files:**
- Modify: `sitesync/src/qr/qrCodeMatrix.ts`
- Modify: `sitesync/src/attendance/qr/WorkerQrDisplay.tsx`
- Modify: `sitesync/__tests__/qrCodeMatrix.test.ts`

- [ ] Add a failing test for the required four-module quiet-zone contract.
- [ ] Implement the quiet zone without changing the encoded module matrix.
- [ ] Verify dimensions and matrix content remain correct.

### Task 5: Make dependencies reproducible

**Files:**
- Modify: `sitesync/package.json`
- Modify: `sitesync/package-lock.json`
- Modify: `.github/workflows/m15-qr-verification.yml`

- [ ] Reconcile declared native QR dependencies with the lockfile.
- [ ] Pin the versions actually used by the branch and update the completion documentation to match.
- [ ] Change CI installation to `npm ci`.
- [ ] Verify the dependency graph builds from a clean lockfile install.

### Task 6: Strengthen CI verification

**Files:**
- Modify: `.github/workflows/m15-qr-verification.yml`
- Modify/Create: deterministic QR integration tests

- [ ] Keep Android launch/scanner smoke coverage.
- [ ] Add deterministic execution of the QR adapter → controller → pipeline boundary so CI verifies more than scanner launch.
- [ ] Retain Android debug APK assembly and artifact upload.
- [ ] Do not claim physical-camera verification from a launch-only emulator test.

### Task 7: Full verification and final review

- [ ] Run full Jest suite.
- [ ] Run full TypeScript check.
- [ ] Run Android lint.
- [ ] Build debug APK.
- [ ] Build release/minified APK where supported by the existing project configuration.
- [ ] Run the M1.5 GitHub Actions workflow.
- [ ] Inspect the resulting diff and all M1.5 files line-by-line.
- [ ] Verify no attendance mutation or production migration entered the change.
- [ ] Only report M1.5 clean if every required gate has fresh evidence.
