# SITE-SYNC Product Direction Design

**Date:** 2026-09-14
**Status:** Approved product direction
**Linear project:** SITE-SYNC — Clean-Room Build

## Problem

The project has successfully invested in a trustworthy M1 foundation, but the delivery sequence risks allowing infrastructure to become the product. The application currently exposes an M1 verification-oriented surface rather than the field-operations product that the project is intended to become.

## Decision

Finish M1.7 and M1.8 as the final M1 trust gate. Then pivot to visible, end-to-end product development. Do not extend M1 with speculative infrastructure milestones.

## Product architecture

SITE-SYNC is organised around four connected operating concepts:

1. **TODAY** — what needs attention now.
2. **PROJECT / SITE** — where work is happening and how the site is progressing.
3. **PEOPLE** — who is working, what they are authorised/qualified to do and their operational history.
4. **OPERATIONS** — safety, documents, progress, reporting and communications connected to the same records.

## Primary navigation

`TODAY · MAP · PEOPLE · MORE`

TODAY is the default landing surface.

MAP is a primary operational surface, not a visual accessory.

PEOPLE exposes the reusable worker identity model.

MORE contains supporting domains such as pre-starts, documents, reports, analytics, communications and administration while allowing context-sensitive entry points from TODAY, MAP and worker profiles.

## Vertical-slice architecture

Every major product capability crosses the necessary layers:

`domain contract → Supabase/RLS → local persistence/projection → repository → service/actions → UI → real data → tests → physical Android verification`

The UI cannot invent operational truth. Repository state is the product state.

## M2 design

### Product shell

Replace the current test-first home surface with a real SITE-SYNC shell while preserving M1 QA surfaces as engineering-only access.

### TODAY

TODAY combines project context, attendance, people, safety, work and current conditions.

It must render explicit states for:

- verified/current
- pending sync
- stale
- unavailable
- permission denied
- offline
- error

No fabricated metrics.

## M3 design

Worker identity is a first-class domain object.

A worker profile contains identity, company/project context, trade, contacts, QR identity, attendance, qualifications, documents, inductions, SWMS assignments, permits, restrictions and operational history.

Every domain should reference the same worker identity rather than maintaining parallel representations.

## M4 design

Pre-start is a workflow and auditable record, not a form dump.

It automatically consumes relevant project, site, weather, crew, supervisor, work, SWMS, permit and action context. Submission, signatures and supervisor approval create an immutable operational record.

## M5 design

The map is the spatial operating system for the project.

Work areas are first-class objects. They carry production quantities, status, crews, dates, blockers and evidence. Location tracking is permissioned and privacy-aware.

## M6 design

Reporting and analytics are derived from operational records. Every metric has a source of truth and drill-down path.

Daily, weekly and monthly reports are first-class outputs. Dashboards expose trends and exceptions rather than decorative numbers.

## M7 design

Communications are event-connected and permissioned. External messaging is an integration boundary whose actual capabilities must be verified before implementation.

## M8 design

Administration, hardening and release readiness consolidate cross-domain production requirements after the product surfaces exist.

## Rejected delivery pattern

Do not use:

`M1.7 → M1.8 → M1.9 → M1.10 → ... → UI eventually`

Use:

`M1 gate → TODAY → PEOPLE → PRE-STARTS → MAP/GPS + spatial progress → REPORTING/ANALYTICS → COMMUNICATIONS → ADMIN/HARDENING`

## Acceptance philosophy

A feature is complete only when a real user can exercise the real workflow on Android, with real persisted data, correct permissions, explicit failure states and fresh acceptance evidence.
