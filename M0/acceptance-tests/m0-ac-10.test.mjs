// M0-AC-10 — Salvage boundary respected.
// Anchor: MASTER_BLUEPRINT §M0.6 M0-AC-10; §M0.4 (no promotion by M0); §12
// (salvage register); Skill 03 (disposition rules); INV-C strict.
// Structural contract: salvage-register.md must contain the full §12 register
// with every SR identifier; no item may carry disposition RETAIN or PROMOTED;
// every SALVAGE item must record its blueprint anchor and predating-test status;
// and the M0 commit range must not touch governed inputs or AC-04 code.
import { readArtifact, git, report } from './lib.mjs';

const SR_IDS = [
  ...Array.from({ length: 13 }, (_, i) => `SR-001.${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `SR-002.${i + 1}`),
  'SR-003.1', 'SR-004', 'SR-005', 'SR-006', 'SR-007', 'SR-008',
];
const ALLOWED = ['REFERENCE', 'FREEZE', 'SALVAGE', 'DISCARD', 'OPEN', 'PENDING', 'NEW'];

const failures = [];
const reg = readArtifact('salvage-register.md');
if (!reg) {
  failures.push('ABSENT: M0/salvage-register.md');
} else {
  for (const id of SR_IDS) {
    if (!reg.includes(id)) failures.push(`register missing ${id}`);
  }
  const rows = reg.split('\n').filter((l) => l.trim().startsWith('|') && /SR-\d/.test(l));
  if (rows.length === 0) {
    failures.push('register has no SR table rows');
  }
  for (const r of rows) {
    if (/\b(RETAIN|PROMOTED)\b/.test(r)) {
      failures.push(`promotion detected in register row: ${r.trim().slice(0, 100)}`);
    }
    const cells = r.split('|').map((c) => c.trim()).filter(Boolean);
    const dispCell = cells.find((c) => /\b(REFERENCE|FREEZE|SALVAGE|DISCARD|OPEN|PENDING|NEW|RETAIN|PROMOTED)\b/.test(c));
    if (dispCell && !ALLOWED.some((a) => dispCell.includes(a))) {
      failures.push(`unrecognised disposition in row: ${r.trim().slice(0, 100)}`);
    }
    if (/\bSALVAGE\b/.test(r) && !/§/.test(r)) {
      failures.push(`SALVAGE row lacks blueprint anchor: ${r.trim().slice(0, 100)}`);
    }
  }
  if (!/INV-C/i.test(reg)) {
    failures.push('register does not record INV-C (predating test) status');
  }
}
// No M0 commit may modify governed inputs or AC-04 implementation (§M0.4; M0
// contract "Scope — prohibited"). Range: EP-1.0 tag .. HEAD, excluding the
// EP-2.0 freeze commits (0eefbd6, 7f4fd06, 276c799), which are a separately
// authorised blueprint amendment + package cut (AMB-001 resolution, human
// decision 2026-09-27) — not M0 evidence commits.
try {
  const tag = git('rev-parse EP-1.0');
  const EP2 = new Set(['0eefbd6', '7f4fd06', '276c799'].map((s) => git(`rev-parse ${s}`)));
  const commits = git(`log --format=%H ${tag}..HEAD`).split('\n').filter(Boolean);
  const changed = new Set();
  for (const c of commits) {
    if (EP2.has(c)) continue;
    const files = git(`diff-tree --no-commit-id --name-only -r ${c}`).split('\n').filter(Boolean);
    for (const f of files) {
      if (/^(sitesync|MASTER_BLUEPRINT|KIMI|EP|EVIDENCE)\//.test(f)) changed.add(f);
    }
  }
  if (changed.size > 0) {
    failures.push(`M0 commits modify governed inputs or AC-04 code:\n${[...changed].join('\n')}`);
  }
} catch (e) {
  failures.push(`git verification failed: ${e.message}`);
}
report('M0-AC-10', failures);
