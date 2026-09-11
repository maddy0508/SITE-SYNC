---
applyTo: "sitesync/**/__tests__/**/*,sitesync/**/*.test.ts,sitesync/**/*.test.tsx,sitesync/**/*.spec.ts,sitesync/**/*.spec.tsx"
---

# Testing conventions

- Test behavior and boundaries, not implementation trivia.
- Prefer a focused failing test before the implementation when adding or changing behavior.
- Include negative-path coverage for authorization, tenant isolation, ownership, lifecycle, and failure handling when those boundaries change.
- Use `npm test -- --runInBand --no-cache` for the repository Jest baseline unless a narrower command is more appropriate.
- Do not call a mocked test pass evidence of an integration or release pass.
- Record environment limitations separately from application failures.