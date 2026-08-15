# Phase 2 — Trust Boundary Verification

Status: NOT_VERIFIED

## Required execution

```text
npm run test:phase2:doctor
npm run test:phase2
```

## Static review corrections applied

- [x] Canonical integration/SQL test paths
- [x] Deterministic Project C + Worker C fixture
- [x] Deterministic Organisation B operational fixture
- [x] Deterministic Worker A operational fixture
- [x] Seed extra `END $$` removed
- [x] Command idempotency scoped to `(command_id, actor_user_id)`
- [x] Command payload fingerprint enforced
- [x] Device registration requires active company membership
- [x] Duplicate inactive-state tests consolidated
- [x] Authenticated direct-write rejection coverage added

## Runtime evidence

- [ ] Doctor passes on target machine
- [ ] Clean `supabase db reset` passes
- [ ] Preflight passes
- [ ] Authenticated integration suite passes
- [ ] Privileged append-only suite passes
- [ ] Evidence recorded

Runtime execution is intentionally NOT claimed until the target Codespace has run the doctor and full Phase 2 suite.
