---
name: release-verification
description: Determine whether a build is actually ready for release by checking code, tests, native builds, environment, signing, and blockers.
---

# Release Verification

1. Identify the intended release target and environment.
2. Verify source and dependency state.
3. Run required lint and tests.
4. Verify Android/iOS build outputs appropriate to the release target.
5. Verify environment configuration without exposing secrets.
6. Verify signing configuration and artifact provenance.
7. Check known release blockers and migration state.
8. Record evidence for every gate.

A successful debug build is not release verification. Never claim release readiness when a gate is untested or blocked.