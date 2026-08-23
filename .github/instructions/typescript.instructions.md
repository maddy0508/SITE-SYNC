---
applyTo: "sitesync/**/*.ts,sitesync/**/*.tsx,sitesync/*.config.*"
---

# TypeScript conventions

- Inspect nearby code before introducing a new pattern; follow the repository's existing architecture.
- Preserve strict typing and use explicit domain types at service boundaries.
- Prefer typed errors and discriminated results over stringly typed error handling.
- Keep functions and modules focused; do not split or merge files solely for stylistic reasons.
- Avoid `any` unless the boundary genuinely requires it and the reason is documented.
- Add or update focused tests when behavior changes.
- Do not change dependency versions unless the task requires it and compatibility is verified.