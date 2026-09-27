# M0 Audit Model — F ∪ CommandOutcome derivation

Authority: MASTER_BLUEPRINT §7.8 (AuditTrail = DomainFacts ∪ CommandOutcomes),
§7 DM-INV-9, §8 AC-ARCH-D1–D6, §6.11 AD-INV-2/6, per-section audit requirements
§6.4.6, §6.5.6, §6.6.6, §6.7.6, §6.9.6, §6.10.6.

## 1. Single derivation rule (AC-ARCH-D1)

AuditTrail is a derived read model (D) computed from exactly two sources:

    AuditTrail = DomainFacts ∪ CommandOutcomes

- DomainFacts: every F record about domain entities (§7.3 F catalogue).
- CommandOutcomes: every F record about command processing, including locally
  rejected, server rejected, server failed, and server conflicted commands
  (AC-ARCH-C9).

No parallel fact layer and no parallel audit store exists: prohibited
explicitly (§M0.2; AD-INV-2 — no administrative fact layer separate from §7's
F-record union; no AdminActionEvent/OverrideEvent, §6.11.4). The §6.11.3 audit
surface is read-only over this projection, visibility bounded by scope
(AD-INV-6).

## 2. Minimum common audit fields (AC-ARCH-D2, §7.8)

Every F record carries: event identity, command identity, actor, device
identity, device timestamp, server sync timestamp, reason (where required).
Per-section additions: progress events add subject, type, payload
(§6.6.6); evidence adds type, source, location as captured or unavailable,
storage reference on upload — storage metadata is not evidence content
(§6.7.6, Amendment 1); rejections add attempted action, notification
timestamp, subsequent action (§6.6.6); exports add report type, scope, filter,
format, freshness at export, fact count (§6.9.6); pre-start corrections and
excluded participants carry mandatory reason (§6.4.6).

## 3. Actor / subject distinction (AC-ARCH-D3)

Actor ≠ subject is universal (§7.6): the acting membership and the subject
entity are recorded separately on every fact (e.g., FORCE_CLOSE: actor =
Company Admin, subject = worker, §6.3.9 CLOSED).

## 4. Immutability and retention (AC-ARCH-D4, DM-INV-2)

F records are append-only on both sides; no user path mutates or deletes them;
retention destruction is Platform-only via RetentionDestructionEvent which
survives the destruction it causes (AC-ARCH-H5, §6.11.4). Audit entries can
therefore never be rewritten by operational action.

## 5. Offline/online parity (AC-ARCH-D6, OS-INV-6)

Offline actions are audited with the same fidelity as online: the local F
record carries identical fields at local commit; the only field that differs
is server sync timestamp, populated on acceptance. LocalAuditEvent
(§6.10.4) merges into the same projection on sync; a rejected command is
preserved with reason, user notification, and subsequent action (§6.10.6).

## 6. Device attribution (AC-ARCH-D5)

Every fact carries device identity (§N of architecture.md; Device is
Platform-scoped E, AC-ARCH-B4). CommandReceipt ties server acceptance to the
same command identity (AC-ARCH-G1).

## 7. What is not in the audit trail

D records are not audit entries (§7.8). Communication handoffs produce no
audit F records in v1 (§6.8.6). Report requests produce CommandOutcomes only;
only successful exports produce ReportExportEvent (§6.9.6).
