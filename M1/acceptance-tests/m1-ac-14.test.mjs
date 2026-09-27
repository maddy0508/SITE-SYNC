// M1-AC-14 [comparative-negative] — Scope boundary: No new M2+ entity,
// behaviour, migration, API surface, operational workflow, or authoritative
// persistence is introduced by M1. The implementation diff from the M1-start
// commit contains only M1-authorised changes, and the resulting entity/schema
// catalogue contains no newly introduced out-of-scope domain types.
// Anchor: §11, M1 out-of-scope list, M0 §M0.4 (salvage boundary).
//
// Form rules (M1 contract, INV-C handling): the pre-M1 run establishes the
// comparison baseline (the M1-start commit), not a failure condition;
// precedes: N/A. The post-M1 delta is evaluated against that baseline here.
import { git, report, requireCore, REPO_ROOT, SRC_DIR } from './lib.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];

// Comparison baseline: the M1-start commit (EP-3.0, the state at M1
// authorisation). Recorded in M1/evidence/acceptance-map.md.
const baseline = git('rev-parse EP-3.0^{commit}');

// 1. Diff scope: every path changed since the M1-start commit is M1-authorised
// (everything under M1/). No governed artifact, blueprint, EP container, or
// M0 artifact touched.
// Test-defect fix (same category as the M0 m0-ac-03 split()[1] fix; pattern
// as m0-ac-10): the range diff EP-3.0..HEAD includes the authorised EP-4.0
// freeze commits (AMB-002 resolution governance), which are not M1
// implementation. They are excluded by literal SHA. The assertion is
// unchanged: only M1-authorised changes may appear in the delta.
const EP4_FREEZE = new Set(['967b3617', '1bfdd923', '0ac087ee'].map((s) => git(`rev-parse ${s}`)));
const commits = git(`log --format=%H ${baseline}..HEAD`).split('\n').filter(Boolean);
const changed = new Set();
for (const c of commits) {
  if (EP4_FREEZE.has(c)) continue;
  for (const p of git(`diff-tree --no-commit-id --name-only -r ${c}`).split('\n').filter(Boolean)) {
    changed.add(p);
  }
}
const unauthorised = [...changed].filter((p) => !p.startsWith('M1/'));
if (unauthorised.length > 0) failures.push(`diff touches paths outside M1/: ${unauthorised.join(', ')}`);

// 2. Entity/schema catalogue: M1 implementation source introduces no
// out-of-scope §7 domain types. Checked on comment-stripped source so the
// prohibition list itself (in this test file) cannot self-trigger.
const PROHIBITED = [
  // M4 crews
  'Crew', 'CrewMembership', 'CrewSiteAssociation',
  // M5/M7 tasks
  'Task', 'TaskTransition', 'TaskAssignment',
  // M8 evidence/QA/blockers
  'Evidence', 'QaObservation', 'QaTransition', 'Blocker', 'BlockerTransition', 'BlockerAssignment',
  // M7 claims
  'CompletionClaim', 'CompletionClaimWithdrawal', 'CompletionVerification', 'Reversal', 'ReversalResolution',
  // M6 attendance
  'AttendanceEvent', 'CorrectionEvent', 'TimesheetApprovalEvent',
  // M3 assets
  'Asset', 'WorkArea', 'AssetGeometryEvent', 'AssetLifecycleEvent', 'AssetWorkAreaAssignment',
  // M5 pre-starts
  'PreStart', 'PreStartContent', 'PreStartContentRevision', 'PreStartContentItem',
  'PreStartLifecycleEvent', 'PreStartParticipant', 'PreStartCorrection', 'DailyLogEntry', 'HandoverRecord',
  // M2 external parties / transfer
  'ExternalParty', 'ProjectExternalParty', 'TransferEvent',
  // M9 reporting / later config
  'ReportExportEvent', 'ReportConfig', 'ConfigChangeEvent',
  // Platform retention (later)
  'RetentionDestructionEvent',
  // C-class configuration (not in M1 scope)
  'SiteShiftBoundaryConfig', 'CompanyOnboardingConfig', 'ProjectOnboardingConfig', 'SiteOnboardingConfig',
  'RoleCapability', 'CompanyBrandConfig',
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
    // No M2+ Project/Site lifecycle transitions: M1 implements entry states
    // only (draft / planned); no transition command or state beyond entry.
    for (const st of ['mobilising', 'demobilising', 'closed', 'archived']) {
      const re = new RegExp(`\\b${st}\\b`, 'i');
      if (re.test(src)) failures.push(`prohibited Project/Site lifecycle state '${st}' in ${file.replace(REPO_ROOT + '/', '')}`);
    }
  }

  // 3. Runtime catalogue: entities actually constructible in M1 are the
  // in-scope set only, with Project/Site pinned to entry states.
  const { createStore, execute } = await import(`${SRC_DIR}/domain.js`);
  const s = createStore();
  execute(s, { type: 'CreateCompany', actor: { personRef: { email: 'scope@example.com', name: 'S' } }, payload: { companyName: 'Scope Co' } });
  const company = [...s.entities.values()].find((e) => e.type === 'Company');
  const admin = [...s.entities.values()].find((e) => e.type === 'Worker');
  execute(s, { type: 'CreateProject', actor: { workerId: admin.id }, payload: { companyId: company.id, name: 'P' } });
  execute(s, { type: 'CreateSite', actor: { workerId: admin.id }, payload: { projectId: [...s.entities.values()].find((e) => e.type === 'Project').id, name: 'S1' } });
  const ALLOWED_E = new Set(['Company', 'Person', 'Device', 'Worker', 'Project', 'Site', 'ProjectAssignment', 'SiteAssignment', 'Requirement', 'WorkerQrIdentity']);
  for (const e of s.entities.values()) {
    if (!ALLOWED_E.has(e.type)) failures.push(`runtime entity of out-of-scope type: ${e.type}`);
  }
  for (const p of [...s.entities.values()].filter((e) => e.type === 'Project')) {
    if (p.state !== 'draft') failures.push(`Project ${p.id} in non-entry state ${p.state}`);
  }
  for (const st of [...s.entities.values()].filter((e) => e.type === 'Site')) {
    if (st.state !== 'planned') failures.push(`Site ${st.id} in non-entry state ${st.state}`);
  }
}

report('M1-AC-14', failures);
