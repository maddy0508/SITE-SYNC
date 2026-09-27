// M0-AC-2 — Every E/F/C/D type has a named mechanism.
// Anchor: MASTER_BLUEPRINT §M0.6 M0-AC-2; §7.2 (four classes, no fifth); §7.3 catalogue.
// The type lists below are transcribed verbatim from §7.3 of the locked blueprint
// (v0.7.2 + recorded §6.3/§6.4/§6.9 catalogue amendments), commit db8a7d3.
// HandoverRecord is F per the §6.3 review reclassification recorded in §7.3.
// Structural contract: conceptual-model-mapping.md must contain, for every type,
// a table row naming the type, its class, and a non-empty mechanism cell.
import { readArtifact, tableRowsContaining, report } from './lib.mjs';

const E_TYPES = [
  'Company', 'Person', 'Device', 'Worker', 'ProjectAssignment', 'SiteAssignment',
  'Project', 'Site', 'WorkArea', 'Asset', 'ExternalParty', 'ProjectExternalParty',
  'Requirement', 'Task', 'QaObservation', 'Blocker', 'WorkerQrIdentity', 'Crew',
  'CrewMembership', 'CrewSiteAssociation', 'PreStartContent', 'PreStart',
];
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
const C_TYPES = [
  'SiteShiftBoundaryConfig', 'CompanyOnboardingConfig', 'ProjectOnboardingConfig',
  'SiteOnboardingConfig', 'RoleCapability', 'CompanyBrandConfig', 'ReportConfig',
];
// §7.3 D list (derived read models) — categories as named in the blueprint.
const D_MODELS = [
  'company readiness', 'site readiness', 'current shift state', 'timesheet',
  'timesheet approval state', 'asset current geometry', 'asset progress',
  'task state', 'WorkArea/Site/Project progress', 'Site roster', 'Site punch list',
  'map render', 'sync indicator', 'worker site list', 'audit trail',
  'pre-start completion', 'Site daily state', 'contactable Workers',
  'Crew member list', 'report outputs',
];

const failures = [];
const map = readArtifact('conceptual-model-mapping.md');
if (!map) {
  failures.push('ABSENT: M0/conceptual-model-mapping.md');
} else {
  const checkTyped = (types, cls) => {
    for (const t of types) {
      const rows = tableRowsContaining(map, t);
      if (rows.length === 0) {
        failures.push(`${cls} type ${t}: no table row in conceptual-model-mapping.md`);
        continue;
      }
      const ok = rows.some((r) => {
        const cells = r.split('|').map((c) => c.trim()).filter(Boolean);
        return cells.length >= 3 && cells.some((c) => c === cls) &&
          cells.every((c) => c.length > 0);
      });
      if (!ok) failures.push(`${cls} type ${t}: row lacks class cell "${cls}" or has empty mechanism cell`);
    }
  };
  checkTyped(E_TYPES, 'E');
  checkTyped(F_TYPES, 'F');
  checkTyped(C_TYPES, 'C');
  for (const d of D_MODELS) {
    const rows = tableRowsContaining(map, d);
    if (rows.length === 0 || !rows.some((r) => r.split('|').some((c) => c.trim() === 'D'))) {
      failures.push(`D model "${d}": no D-class table row with derivation mechanism`);
    }
  }
  if (!/no fifth/i.test(map)) {
    failures.push('mapping doc does not assert the four-class closure (no fifth kind, §7.2)');
  }
}
report('M0-AC-2', failures);
