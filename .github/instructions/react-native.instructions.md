---
applyTo: "sitesync/**/*.tsx,sitesync/App.tsx"
---

# React Native conventions

- Preserve existing navigation, state, service, and persistence boundaries before adding abstractions.
- Treat native behavior as behavior: visual or platform-specific changes require device/emulator verification when available.
- Keep UI components focused on presentation and user interaction; keep authoritative identity, tenant, and persistence decisions in their service boundaries.
- Account for loading, empty, error, offline, permission, and lifecycle states where they are relevant to the feature.
- Avoid placeholder data in production paths.
- Do not describe a screenshot/mockup as proof that a running UI works.