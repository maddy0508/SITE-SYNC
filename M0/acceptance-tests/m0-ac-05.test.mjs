// M0-AC-5 — Canonical F mapping; no parallel fact layer.
// Anchor: MASTER_BLUEPRINT §M0.6 M0-AC-5; §7.3 F catalogue; §7.8 (audit derives
// from F ∪ CommandOutcome); §6.11 AD-INV-2 (no separate admin fact layer).
// Structural contract: every §7.3 F type must be mapped in
// conceptual-model-mapping.md to the canonical F store, and audit-model.md must
// declare audit derivation from F ∪ CommandOutcome only and prohibit any
// parallel fact layer.
import { readArtifact, tableRowsContaining, report } from './lib.mjs';

const F_TYPES = [
  'LifecycleEvent', 'TransferEvent', 'AssetGeometryEvent', 'AssetLifecycleEvent',
  'AssetWorkAreaAssignment', 'AttendanceEvent', 'CorrectionEvent',
  'TimesheetApprovalEvent', 'TaskTransition', 'TaskAssignment', 'CompletionClaim',
  'CompletionClaimWithdrawal', 'CompletionVerification', 'Reversal',
  'ReversalResolution', 'Evidence', 'QaTransition', 'BlockerTransition',
  'BlockerAssignment', 'RequirementSatisfaction', 'DocumentRevision',
  'InductionCompletion', 'Acknowledgement', 'CommandReceipt', 'CommandOutcome',
  'Invitation', 'CapabilityGrant', 'ConfigChangeEvent', 'RetentionDestructionEvent',
  'ReportExportEvent', 'PreStartContentRevision', 'PreStartContentItem',
  'PreStartLifecycleEvent', 'PreStartParticipant', 'PreStartCorrection',
  'DailyLogEntry', 'WorkerProfileChange', 'WorkerLifecycleEvent',
  'WorkerQrIdentityEvent', 'HandoverRecord',
];

const failures = [];
const map = readArtifact('conceptual-model-mapping.md');
if (!map) {
  failures.push('ABSENT: M0/conceptual-model-mapping.md');
} else {
  for (const t of F_TYPES) {
    const rows = tableRowsContaining(map, t);
    if (!rows.some((r) => r.split('|').some((c) => c.trim() === 'F'))) {
      failures.push(`F type ${t}: no F-class row mapping it to the canonical fact store`);
    }
  }
}
const audit = readArtifact('audit-model.md');
if (!audit) {
  failures.push('ABSENT: M0/audit-model.md');
} else {
  if (!/F\s*∪\s*CommandOutcome/.test(audit)) {
    failures.push('audit-model.md does not declare audit derivation from F ∪ CommandOutcome');
  }
  if (!/no parallel (fact|audit|admin)/i.test(audit) && !/parallel (fact|audit) layer.*prohibited/i.test(audit)) {
    failures.push('audit-model.md does not prohibit a parallel fact/audit/admin layer (AD-INV-2)');
  }
  if (!/append-only/i.test(audit)) {
    failures.push('audit-model.md does not declare F append-only (DM-INV-2)');
  }
}
report('M0-AC-5', failures);
