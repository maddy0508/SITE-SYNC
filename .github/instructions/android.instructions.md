---
applyTo: "sitesync/android/**/*,sitesync/android/**"
---

# Android conventions

- Preserve existing Gradle, manifest, native module, and build configuration unless the task requires a change.
- Verify native changes with an Android build and, when behavior is runtime-visible, an emulator or device test when available.
- Keep signing and production credentials out of source control.
- Distinguish debug-build success from release-readiness evidence.
- Diagnose native failures from logs and reproducible build output before changing dependencies or configuration.