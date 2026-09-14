# SITE-SYNC Product Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Transition SITE-SYNC from an M1 verification-oriented application into the actual field-operations product through gated vertical slices.

**Architecture:** Preserve the M1 trust foundation. After M1.7/M1.8 close, build each product milestone end-to-end through Supabase/RLS, local persistence/projection, repository/services, UI and physical Android verification. Linear remains delivery authority; GitHub remains executable/documentation authority; Supabase remains runtime backend authority.

**Tech Stack:** React Native + TypeScript, native Android, Hermes, Supabase/PostgreSQL, PostgreSQL RLS, SQLite, existing repository/service patterns.

**Spec:** `docs/superpowers/specs/2026-09-14-site-sync-product-direction-design.md`

## Global Constraints

- M1.7 and M1.8 are the final M1 trust gate.
- Do not create speculative M1.9+ infrastructure milestones.
- Use real repository-backed state for production-facing UI.
- Preserve tenant isolation and server-side authorization.
- Treat QR values as untrusted input.
- Make offline/stale/unverified/error states explicit.
- Physical Android verification is required for user-facing milestone completion.
- Never claim completion without fresh evidence.

---

### Task 1: Close M1 trust gate

**Files:**
- Existing M1 sync/acceptance implementation and tests as identified by Linear MMM-35 and MMM-36.
- Existing M1 documentation and acceptance evidence.

**Interfaces:**
- Produces: trusted foundation consumed by all M2+ slices.

- [ ] Complete remaining M1.7 sync/reconciliation work.
- [ ] Execute physical Android acceptance for M1.7.
- [ ] Execute M1.8 adversarial validation.
- [ ] Prove cross-company isolation and duplicate-command behaviour.
- [ ] Prove crash/restart/offline/reconnect cases.
- [ ] Record fresh evidence in Linear.
- [ ] Only then activate M2 implementation.

### Task 2: Replace QA landing surface with product shell

**Files:**
- Modify: `sitesync/App.tsx`
- Create: product navigation/state files following the existing `sitesync/src` structure.
- Test: App/navigation tests under `sitesync/__tests__/`.

**Interfaces:**
- Consumes: authenticated application/project context and M1 repository state.
- Produces: TODAY/MAP/PEOPLE/MORE navigation and preserved engineering QA entry points.

- [ ] Write navigation/landing tests first.
- [ ] Ensure M1 QA screens remain reachable without being the product landing screen.
- [ ] Build persistent project/site context.
- [ ] Build loading, empty, offline, error and permission-denied states.
- [ ] Run TypeScript, lint and tests.
- [ ] Physically verify Android navigation.

### Task 3: Build persisted TODAY operational projection

**Files:**
- Existing local persistence/projection implementation associated with Linear MMM-63.
- TODAY view/state modules.
- Tests for projection loading, absence and tenant mismatch.

**Interfaces:**
- Consumes: project/site/person/attendance state.
- Produces: repository-backed TODAY operational projection.

- [ ] Write failing runtime tests for project-bound projection loading.
- [ ] Write failing test for absent data producing explicit unavailable state.
- [ ] Write failing tenant-boundary test.
- [ ] Implement minimal runtime integration.
- [ ] Remove fabricated operational values from TODAY.
- [ ] Verify persisted changes propagate without screen-local truth.
- [ ] Run automated and physical Android verification.

### Task 4: Build TODAY operational dashboard

**Files:**
- TODAY screen/state/components.
- TODAY tests.

**Interfaces:**
- Consumes: persisted operational projection.
- Produces: first real SITE-SYNC daily operating surface.

- [ ] Render date/project/site/shift.
- [ ] Render weather/warnings using explicit unavailable state until real source integration exists.
- [ ] Render attendance/crew/supervisor.
- [ ] Render pre-start/Take 5/SWMS/permit state.
- [ ] Render hazards/restrictions/blockers/actions.
- [ ] Render progress summary from persisted source records.
- [ ] Verify loading/offline/error/permission states.
- [ ] Physical Android acceptance.

### Task 5: Build PEOPLE directory

**Files:**
- New PEOPLE domain modules under the established `sitesync/src` structure.
- PEOPLE tests.

**Interfaces:**
- Consumes: trusted worker/project roster and identity records.
- Produces: reusable worker directory and navigation to Worker Profile.

- [ ] Add search and operational filters.
- [ ] Add worker cards/list rows.
- [ ] Add attendance, crew, contractor, trade and warning states.
- [ ] Reuse existing worker identity records; do not duplicate identity state.
- [ ] Test permissions and tenant isolation.
- [ ] Physical Android acceptance.

### Task 6: Build Worker Profile

**Files:**
- Worker profile domain/screen/state modules.
- Worker profile tests.

**Interfaces:**
- Consumes: PEOPLE/worker identity and operational records.
- Produces: reusable worker identity object for future domains.

- [ ] Add photograph and company banner.
- [ ] Render worker name in capitals.
- [ ] Add trade, company, project and contacts.
- [ ] Add call, external messaging and QR actions.
- [ ] Add attendance history/statistics.
- [ ] Add qualifications, licences, competencies and expiry state.
- [ ] Add inductions, SWMS assignments, permits and restrictions.
- [ ] Add chronological operational history from source records.
- [ ] Physical Android acceptance.

### Task 7: Build PRE-START workflow

**Files:**
- New pre-start domain modules.
- Pre-start persistence/repository/service modules.
- Pre-start tests.

**Interfaces:**
- Consumes: worker/project/location/weather/SWMS/permit state.
- Produces: immutable submitted/approved pre-start record.

- [ ] Define domain state machine.
- [ ] Implement hazards/controls/Take 5.
- [ ] Implement crew and supervisor confirmation.
- [ ] Implement SWMS and permit checks.
- [ ] Implement acknowledgements/signatures.
- [ ] Implement issue/action capture.
- [ ] Implement submission and supervisor approval.
- [ ] Implement immutable record/document output.
- [ ] Prove offline semantics.
- [ ] Physical Android acceptance.

### Task 8: Build MAP/GPS and spatial progress

**Files:**
- New map/spatial domain modules.
- Location permission and tracking modules.
- Spatial progress repository/service modules.
- Map tests and Android acceptance tests.

**Interfaces:**
- Consumes: project geometry, workers, crews, work areas and progress records.
- Produces: map-first operational site and spatial progress state.

- [ ] Define spatial object model.
- [ ] Implement site/project boundaries and zones.
- [ ] Implement work fronts/work areas.
- [ ] Implement permissioned worker/device location.
- [ ] Implement location freshness/accuracy states.
- [ ] Implement offline/network/battery semantics.
- [ ] Implement planned/completed quantities and progress.
- [ ] Connect blockers/photos/evidence to spatial work areas.
- [ ] Physical Android acceptance.

### Task 9: Build reporting and analytics

**Files:**
- New reporting/analytics domain modules.
- Report aggregation/query modules.
- Dashboard components and tests.

**Interfaces:**
- Consumes: attendance, workforce, safety, compliance, progress and communication source records.
- Produces: daily/weekly/monthly reports and drillable KPI dashboards.

- [ ] Define metric source-of-truth registry.
- [ ] Implement daily report.
- [ ] Implement weekly report.
- [ ] Implement monthly report.
- [ ] Implement workforce/attendance analytics.
- [ ] Implement productivity and planned-vs-actual analytics.
- [ ] Implement safety/compliance analytics.
- [ ] Implement contractor/programme/blocker analytics.
- [ ] Implement drill-down to source records.
- [ ] Implement snapshot/hash/export/share paths as required.
- [ ] Physical Android verification.

### Task 10: Integrate communications and notifications

**Files:**
- New communication/notification domain modules.
- Integration adapters for the verified external messaging capability.
- Notification tests.

**Interfaces:**
- Consumes: worker/crew/project identity and operational events.
- Produces: authorised operational notifications and supported contact/messaging actions.

- [ ] Verify actual external platform/API capabilities before coding assumptions.
- [ ] Define recipient authorisation model.
- [ ] Implement worker/crew/supervisor contact actions.
- [ ] Implement event-triggered notifications.
- [ ] Implement delivery/read state only where supported.
- [ ] Implement audit and fallback behaviour.
- [ ] Physical Android acceptance.

### Task 11: Production hardening and release

**Files:**
- Cross-domain security/configuration/build/release files.
- Production documentation and operator materials.

**Interfaces:**
- Consumes: all completed product domains.
- Produces: production-ready SITE-SYNC release candidate.

- [ ] Verify tenant isolation across every domain.
- [ ] Verify cross-domain offline/reconnect behaviour.
- [ ] Run performance/accessibility/device compatibility checks.
- [ ] Complete security review.
- [ ] Complete production Supabase gates.
- [ ] Configure signing and release build.
- [ ] Complete field acceptance.
- [ ] Publish final operational documentation.
- [ ] Record all evidence in Linear before release.
