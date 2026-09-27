// M2-AC-15 [comparative-negative] — Scope boundary: No new M3+ entity,
// behaviour, migration, API surface, operational workflow, or authoritative
// persistence is introduced by M2. The implementation diff from the M2-start
// commit contains only M2-authorised changes, and the resulting entity/schema
// catalogue contains no newly introduced out-of-scope domain types.
// Anchor: §11, M2 out-of-scope list, M0 §M0.4 (salvage boundary).
//
// Form rules (M2 contract, INV-C handling): the pre-M2 run establishes the
// comparison baseline (the M2-start commit), not a failure condition;
// precedes: N/A. The post-M2 delta is evaluated against that baseline here.
import { git, report, requireCore, REPO_ROOT, SRC_DIR } from './lib.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];

// Comparison baseline: the M2-start commit (M1's final evidence commit, the
// state at M2 authorisation). Recorded in M2/evidence/acceptance-map.md.
const baseline = git('rev-parse cfda19f^{commit}');

// 1. Diff scope: every path changed since the M2-start commit is
// M2-authorised (everything under M2/). No governed artifact, blueprint, EP
// container, or M0/M1 artifact touched.
// Post-freeze mechanical adjustment (same category as m0-ac-10 / m1-ac-14;
// pattern authorised by the M2 contract's freeze-whitelist chronology rule):
// the range diff cfda19f..HEAD includes the authorised EP-5.0 freeze commits
// (M2 contract installation + manifest + lock), which are not M2
// implementation. They are excluded by literal SHA. The assertion is
// unchanged: only M2-authorised changes may appear in the delta.
const EP5_FREEZE = new Set(['0d43b43', '1893ab3', '00c2adb'].map((s) => git(`rev-parse ${s}`)));
// Also excluded, disclosed separately beyond the contract's template: the
// M1 gate-acceptance commit f8fe895 (touches M1/evidence/state.md only) sits
// inside the range cfda19f..HEAD and is governance, not M2 implementation.
const GOVERNANCE = new Set(['f8fe895'].map((s) => git(`rev-parse ${s}`)));
const EXCLUDED = new Set([...EP5_FREEZE, ...GOVERNANCE]);
const commits = git(`log --format=%H ${baseline}..HEAD`).split('\n').filter(Boolean).filter((c) => !EXCLUDED.has(c));
const changed = new Set();
for (const c of commits) {
  for (const p of git(`diff-tree --no-commit-id --name-only -r ${c}`).split('\n').filter(Boolean)) {
    changed.add(p);
  }
}
const unauthorised = [...changed].filter((p) => !p.startsWith('M2/'));
if (unauthorised.length > 0) failures.push(`diff touches paths outside M2/: ${unauthorised.join(', ')}`);

// 2. Entity/schema catalogue: M2 implementation source introduces no
// out-of-scope §7 domain types. Checked on comment-stripped source so the
// prohibition list itself (in this test file) cannot self-trigger.
const PROHIBITED = [
  // M3 assets / map
  'Asset', 'WorkArea', 'AssetGeometryEvent', 'AssetLifecycleEvent', 'AssetWorkAreaAssignment',
  // M4 crews / communication handoffs
  'Crew', 'CrewMembership', 'CrewSiteAssociation',
  // M5 pre-starts / daily operations
  'PreStart', 'PreStartContent', 'PreStartContentRevision', 'PreStartContentItem',
  'PreStartLifecycleEvent', 'PreStartParticipant', 'PreStartCorrection', 'DailyLogEntry',
  // M6 attendance
  'AttendanceEvent', 'CorrectionEvent', 'TimesheetApprovalEvent',
  // M7 tasks / claims
  'Task', 'TaskTransition', 'TaskAssignment',
  'CompletionClaim', 'CompletionClaimWithdrawal', 'CompletionVerification', 'Reversal', 'ReversalResolution',
  // M8 evidence / QA / blockers
  'Evidence', 'QaObservation', 'QaTransition', 'Blocker', 'BlockerTransition', 'BlockerAssignment',
  // M9 reporting / later config
  'ReportExportEvent', 'ReportConfig', 'ConfigChangeEvent',
  // Platform retention (later)
  'RetentionDestructionEvent',
  // C-class configuration (not in M2 scope)
  'SiteShiftBoundaryConfig', 'CompanyOnboardingConfig', 'ProjectOnboardingConfig', 'SiteOnboardingConfig',
  'RoleCapability', 'CompanyBrandConfig',
  // Transfer is BLOCKED pending AMB-003: no transfer machinery of any kind.
  'TransferEvent',
];

function* sourceFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* sourceFiles(p);
    else if (/\.(mjs|js|ts)$/.test(name)) yield p;
  }
}

const stripComments = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:"'`])\/\/[^\n]*/g, '$1');

const absent = requireCore();
if (!absent) {
  for (const file of sourceFiles(SRC_DIR)) {
    const src = stripComments(readFileSync(file, 'utf8'));
    for (const name of PROHIBITED) {
      const re = new RegExp(`\\b${name}\\b`);
      if (re.test(src)) failures.push(`prohibited out-of-scope type '${name}' in ${file.replace(REPO_ROOT + '/', '')}`);
    }
  }

  // 3. Runtime catalogue: the M2 command surface is exactly the M2
  // vocabulary — nothing M3+, nothing for transfer.
  const m2 = await import(`${SRC_DIR}/domain.js`);
  const EXPECTED_COMMANDS = new Set([
    'ActivateProject', 'SuspendProject', 'ResumeProject', 'CompleteProject', 'ArchiveProject', 'CancelProject',
    'MobiliseSite', 'ActivateSite', 'DemobiliseSite', 'CloseSite', 'ArchiveSite',
    'ActivateAssignment', 'PauseAssignment', 'ResumeAssignment', 'RemoveAssignment',
    'CreateExternalParty', 'UpdateExternalParty', 'ArchiveExternalParty',
    'AssociateExternalParty', 'RemoveProjectExternalParty',
    'RecordHandover',
  ]);
  const actual = new Set(m2.M2_COMMAND_TYPES ?? []);
  for (const c of EXPECTED_COMMANDS) if (!actual.has(c)) failures.push(`M2 command missing from catalogue: ${c}`);
  for (const c of actual) if (!EXPECTED_COMMANDS.has(c)) failures.push(`out-of-scope command in catalogue: ${c}`);
}

report('M2-AC-15', failures);
