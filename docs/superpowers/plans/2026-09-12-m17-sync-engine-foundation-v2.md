# M1.7 Sync Engine Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a restart-safe local synchronization worker that deterministically claims pending attendance commands and hands them to a controlled transport boundary without falsely marking local state as server-verified.

**Architecture:** SQLite remains the local source of truth. A repository-backed worker selects eligible commands deterministically, atomically claims one command, submits its persisted payload through an injectable transport contract, and persists explicit success, retry, failure, or conflict outcomes. Production Supabase is deliberately deferred.

**Tech Stack:** React Native + TypeScript, SQLite, Jest, GitHub Actions.

**Spec:** Linear MMM-35 — M1.7 Sync engine and deterministic reconciliation.

## Global Constraints

- M1.6 owns local attendance mutation semantics.
- Connectivity alone never creates `ONLINE_VERIFIED` state.
- Attendance events remain append-only.
- Command history remains durable after success.
- Processing claims are persisted and restart-safe.
- Retry timing is persisted.
- Production Supabase remains untouched for this slice.
- No QR, camera, reporting, or unrelated feature work.

## Foundation execution

- [x] Branch created from M1.6 merge lineage.
- [x] Transport contract and parser.
- [x] Deterministic command selection/claim repository.
- [x] Worker mutex and lifecycle entry points.
- [x] Retry classification and bounded backoff.
- [x] Controlled SQLite success/retry tests.
- [x] M1.7 verification workflow.
- [ ] CI verification.
- [ ] Duplicate replay integration.
- [ ] Revision conflict integration.
- [ ] Restart/resume integration.
- [ ] Final review and merge.

## Definition of Done

Pending commands are deterministically selected and claimed, stale claims recover, concurrent workers cannot process the same command locally, persisted payloads are submitted intact, response outcomes are durable, retry policy is bounded and persistent, duplicate replay is idempotent, revision conflict never fabricates verification, and automated verification is green.
