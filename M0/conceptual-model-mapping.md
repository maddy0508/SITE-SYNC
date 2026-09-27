# M0 Conceptual Model Mapping — E/F/C/D per §7

Authority: MASTER_BLUEPRINT §7 (v0.7.2 + recorded §6.3/§6.4/§6.9 catalogue
amendments, §M0.1); §M0.2 (canonical model); §M0.6 M0-AC-2, M0-AC-5.

Four classes. No fifth kind (§7.2). Every stateful concept is exactly one of
E / F / C / D. E current representation is derived from identity + creation fact
+ immutable domain facts (AttributeChangeEvent where §7 specifies it; dedicated
lifecycle/relationship facts where the owning section specifies them) — this
distinction is not flattened (§M0.2).

Mechanism vocabulary:
- **E mechanism**: identity store + creation fact + immutable domain facts;
  current representation derived; materialisation permitted, never authoritative
  (§7.5, AC-ARCH-A3/A4).
- **F mechanism**: canonical append-only fact store; write-once; no update or
  delete path (§7.5, DM-INV-2, AC-ARCH-D4).
- **C mechanism**: authoritative current-value configuration store; admin-only
  mutation; every change emits ConfigChangeEvent capturing the resolved value
  (§7.5, AC-ARCH-H4).
- **D mechanism**: recomputable projection from E+F alone; materialisation
  optional; freshness-exposed; never authoritative (§7.7, DM-INV-3,
  AC-ARCH-E1/E3).

## E entities (§7.3)

| Type | Class | Ownership scope (§7.4) | Mechanism | Anchor |
|---|---|---|---|---|
| Company | E | Platform | E mechanism; tenancy root | §7.3, DM-INV-5 |
| Person | E | Platform | E mechanism; globally unique at Platform, visible only to member Companies | §7.3, §7.15 |
| Device | E | Platform | E mechanism; single identity; physical representation OPEN (§7.15) | §7.3, AC-ARCH-B4 |
| Worker | E | Company | E mechanism; Company-scoped membership of a Person; not a rename of CompanyMembership | §6.3 WC-INV-1/2/3, §12 leak note |
| ProjectAssignment | E | Project | E mechanism; relationship-entity rule: state independent of endpoints | §7.5, §6.1 |
| SiteAssignment | E | Site | E mechanism; relationship-entity rule | §7.5, §6.1 |
| Project | E | Company | E mechanism; transfer creates successor identity via TransferEvent | §7.4, AC-ARCH-A2a |
| Site | E | Project | E mechanism | §7.3, §6.1 |
| WorkArea | E | Site | E mechanism | §7.3, §6.2 |
| Asset | E | Site | E mechanism; never stores complete=true (PR-INV-1) | §7.3, §6.6 |
| ExternalParty | E | Company | E mechanism | §7.3, §6.1 |
| ProjectExternalParty | E | Project | E mechanism | §7.3, §6.1 |
| Requirement | E | Company/Project/Site | E mechanism; type set fixed in v1 | §7.3, AC-ARCH-I2 |
| Task | E | Site | E mechanism; distinct from asset (PR-INV-7) | §7.3, §6.6 |
| QaObservation | E | Site | E mechanism | §7.3, §6.7 |
| Blocker | E | Site | E mechanism | §7.3, §6.7 |
| WorkerQrIdentity | E | Company | E mechanism; rotation/revocation NEW per §6.3.8 | §7.3, §6.3 |
| Crew | E | Company | E mechanism; Company-scoped reusable | §7.3, §7.15 CLOSED |
| CrewMembership | E | Company | E mechanism; membership-scoped reachability | §7.3, §6.3 |
| CrewSiteAssociation | E | Site | E mechanism | §7.3, §7.15 CLOSED |
| PreStartContent | E | Site | E mechanism; single E per Site; revisions are F, no second identity per revision | §7.3, §6.4.2 |
| PreStart | E | Site | E mechanism; identity + creation fact + lifecycle/correction facts | §7.3, §6.4.3 |

## F records (§7.3) — canonical fact store, append-only

| Type | Class | Ownership scope (§7.4) | Mechanism | Anchor |
|---|---|---|---|---|
| LifecycleEvent | F | per subject entity | F mechanism | §7.3, §7.5 |
| TransferEvent | F | Platform | F mechanism; successor linkage for Project transfer | §7.4, AC-ARCH-A2a, B3 |
| AssetGeometryEvent | F | Site | F mechanism | §7.3, §6.2 |
| AssetLifecycleEvent | F | Site | F mechanism | §7.3, §6.2 |
| AssetWorkAreaAssignment | F | Site | F mechanism; relationship without independent state | §7.5 |
| AttendanceEvent | F | Site | F mechanism; types CHECK_IN/CHECK_OUT/BREAK_START/BREAK_END/CORRECTION/FORCE_CLOSE | §6.5.8, AC-ARCH-I3 |
| CorrectionEvent | F | Site | F mechanism; additive corrections | §6.5, QA-INV-12 |
| TimesheetApprovalEvent | F | Site | F mechanism | §6.5 |
| TaskTransition | F | Site | F mechanism | §6.6.4 |
| TaskAssignment | F | Site | F mechanism | §6.6.4 |
| CompletionClaim | F | Site | F mechanism; immutable (PR-INV-3) | §6.6.4 |
| CompletionClaimWithdrawal | F | Site | F mechanism | §6.6.4 |
| CompletionVerification | F | Site | F mechanism; single per claim | §6.6.3 |
| Reversal | F | Site | F mechanism | §6.6.4 |
| ReversalResolution | F | Site | F mechanism | §6.6.4 |
| Evidence | F | Site | F mechanism; immutable, attributed; storage metadata is not evidence content | §6.7 QA-INV-1/2, Amendment 1 |
| QaTransition | F | Site | F mechanism | §6.7.4 |
| BlockerTransition | F | Site | F mechanism | §6.7.4 |
| BlockerAssignment | F | Site | F mechanism | §6.7.4 |
| RequirementSatisfaction | F | per Requirement scope | F mechanism; onboarding derived from it (§7.11) | §4, §7.11 |
| DocumentRevision | F | per Requirement scope | F mechanism; RequirementSatisfaction subtype | §4, §7.3 |
| InductionCompletion | F | per Requirement scope | F mechanism; RequirementSatisfaction subtype | §4, §7.3 |
| Acknowledgement | F | per Requirement scope | F mechanism; RequirementSatisfaction subtype; pre-start acknowledgement is this with pre_start_context | §4.3, §6.4.4 |
| CommandReceipt | F | Platform | F mechanism; idempotency keyed by command identity | §7.10, AC-ARCH-G1 |
| CommandOutcome | F | per command scope | F mechanism; retained for rejected/failed/conflicted | §M0.3.7, AC-ARCH-C9 |
| Invitation | F | Company | F mechanism; sole membership creation path | §6.11 AD-INV-8 |
| CapabilityGrant | F | Company | F mechanism | §6.11.4 |
| ConfigChangeEvent | F | Company/Project/Site | F mechanism; captures resolved values (H4) | §6.11.4 |
| RetentionDestructionEvent | F | Platform | F mechanism; survives the destruction it causes | §6.11.4, AC-ARCH-H5 |
| ReportExportEvent | F | Company | F mechanism; only on successful export | §6.9.4 REP-INV-6 |
| PreStartContentRevision | F | Site | F mechanism; immutable versions | §6.4.4 |
| PreStartContentItem | F | Site | F mechanism | §6.4.4 |
| PreStartLifecycleEvent | F | Site | F mechanism | §6.4.4 |
| PreStartParticipant | F | Site | F mechanism; additive, idempotent | §6.4.3 |
| PreStartCorrection | F | Site | F mechanism; additive; does not mutate original | §6.4.3 |
| DailyLogEntry | F | Site | F mechanism; modelled as §6.7 Note evidence | §6.4.4 |
| WorkerProfileChange | F | Company | F mechanism | §7.3 (§6.3 amendment) |
| WorkerLifecycleEvent | F | Company | F mechanism | §7.3 (§6.3 amendment) |
| WorkerQrIdentityEvent | F | Company | F mechanism | §7.3 (§6.3 amendment) |
| HandoverRecord | F | Site | F mechanism; reclassified from E per §6.3 review recorded in §7.3 | §7.3 |

Removed from AC-04 legacy model and explicitly not introduced (§6.11.4):
AdminActionEvent, OverrideEvent — overrides produce domain-canonical events.
No ReportRequest/ReportRequested/ReportReady/ReportFailed F types (§6.9.4).
No CommunicationInitiated F in v1 (§6.8.4).

## C records (§7.3)

| Type | Class | Ownership scope (§7.4) | Mechanism | Anchor |
|---|---|---|---|---|
| SiteShiftBoundaryConfig | C | Site | C mechanism; precedence Site > Project > Company | §6.5, §6.11.2 |
| CompanyOnboardingConfig | C | Company | C mechanism | §4, §7.3 |
| ProjectOnboardingConfig | C | Project | C mechanism | §4, §7.3 |
| SiteOnboardingConfig | C | Site | C mechanism | §4, §7.3 |
| RoleCapability | C | Company | C mechanism; capabilities are flags | §2, §6.11 |
| CompanyBrandConfig | C | Company | C mechanism | §7.3 |
| ReportConfig | C | Company | C mechanism; cannot override scope rules | §6.9 REP-INV-8 |

## D derived read models (§7.3)

All D: recomputable projection from E+F alone; materialisation optional; freshness
state exposed (locally committed / server-confirmed / stale / unknown, AC-ARCH-E2);
never authoritative; never an input to fact creation (AC-ARCH-E3).

| Read model | Class | Derivation source | Mechanism | Anchor |
|---|---|---|---|---|
| company readiness | D | RequirementSatisfaction (Company scope) | D mechanism; derived predicate | §4, §7.11 |
| site readiness | D | RequirementSatisfaction (Site scope) | D mechanism; derived predicate | §4, §7.11 |
| current shift state | D | AttendanceEvent | D mechanism; derived, not stored | §6.5.8 |
| timesheet | D | AttendanceEvent (first-in/last-out) | D mechanism | §6.5.8 |
| timesheet approval state | D | TimesheetApprovalEvent | D mechanism | §6.5 |
| asset current geometry | D | AssetGeometryEvent | D mechanism | §6.2 |
| asset progress | D | CompletionClaim/CompletionVerification/Reversal | D mechanism; PR-INV-1/11 | §6.6 |
| task state | D | TaskTransition/TaskAssignment | D mechanism | §6.6.4 |
| WorkArea/Site/Project progress | D | asset progress aggregates | D mechanism; always computed | §6.6 PR-INV-11 |
| Site roster | D | SiteAssignment + Worker | D mechanism | §6.1, §6.8 |
| Site punch list | D | Blocker (open) | D mechanism | §6.6.4 |
| map render | D | Asset geometry/lifecycle | D mechanism | §6.2 |
| sync indicator | D | LocalCommand/QueueEntry/CommandReceipt | D mechanism; per action | §6.10.4 OS-INV-7 |
| worker site list | D | SiteAssignment | D mechanism | §6.1 |
| audit trail | D | DomainFacts ∪ CommandOutcomes | D mechanism; projection only | §7.8, AC-ARCH-D1 |
| pre-start completion | D | PreStart + Acknowledgement | D mechanism; derived predicate per §6.4.3 | §6.4 DO-INV-7 |
| Site daily state | D | §6.4/§6.5/§6.6/§6.7 facts | D mechanism; freshness-annotated per element | §6.4.3 |
| contactable Workers | D | Worker profile + Crew/Site membership | D mechanism | §6.8.4 |
| Crew member list | D | CrewMembership | D mechanism | §6.3.4, §6.8.4 |
| report outputs | D | any fact set per REP-INV-3 | D mechanism; reproducible, never authoritative | §6.9 REP-INV-1/9/10 |

§6.8 introduces no new E or F entities (§6.8.4): contact details are profile
fields on Worker; no in-app messaging store exists (COM-INV-2/9/10).
