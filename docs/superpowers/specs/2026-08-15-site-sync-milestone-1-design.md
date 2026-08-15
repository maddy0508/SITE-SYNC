# SITE-SYNC Milestone 1 — Release Foundation Design

## Status

Approved design. This document is the clean-room implementation boundary for Milestone 1.

## Objective

Prove that SITE-SYNC can produce a genuine standalone native Android release APK and establish the minimum application foundation needed for the first trustworthy operational-record vertical slice.

## Scope

Milestone 1 is limited to:

1. Native React Native + TypeScript Android project.
2. Hermes-enabled release build.
3. Gradle wrapper and reproducible Android build configuration.
4. Standalone APK with the JavaScript bundle embedded in the artifact.
5. No Expo, EAS, Expo development client, PWA or WebView runtime.
6. Repository-level build and agent instructions.
7. Android build CI capable of producing the release APK.
8. Foundation configuration for Supabase connectivity, without implementing the operational database yet.

The next milestone owns the Supabase schema, seed data and RLS foundation.

## Architectural principles

### Native boundary

SITE-SYNC is a native Android application using React Native Community CLI. The Android project is first-class source code. Development-server tooling may exist for development but must never be required by the release artifact.

### Release independence

The release APK must launch after installation with Metro, localhost, Expo and EAS absent. The JavaScript bundle is embedded into the APK and Hermes is used by the release runtime.

### Trust boundary

Client code may manage local presentation and offline state, but server-side authorization and critical mutation semantics remain authoritative. Later milestones will enforce this through Supabase/PostgreSQL RLS and server command processing.

### Offline-first foundation

The application architecture must leave room for SQLite local persistence, an outbox, idempotent commands, revision checks and reconciliation. These are architectural requirements for later milestones, not features to fake in Milestone 1.

### Scope discipline

Do not implement tasks, SWMS, competencies, permits, evidence, reports, maps or assets during Milestone 1.

## Acceptance gate

Milestone 1 passes only when:

- a clean Android release build succeeds through Gradle;
- the APK installs on an Android emulator/device;
- the APK cold-launches successfully;
- the release artifact does not require Metro, localhost, Expo or a development server;
- Hermes is enabled in the release build;
- the repository contains reproducible build configuration and CI;
- build evidence identifies the exact commit and APK artifact.

## Deferred

The following are explicitly deferred to subsequent milestones:

- authentication workflow
- company/project/worker domain data
- QR identity and scanning
- attendance events/state
- SQLite implementation
- outbox and sync engine
- timesheet derivation
- Supabase RLS and command RPCs
- adversarial tenant/security testing

Those features remain part of the approved overall Milestone 1 vertical-slice contract, but their implementation begins after the release foundation is proven.
