// M2-AC-8 [strict] — Project transfer (Platform Admin only). BLOCKED pending
// AMB-003: §6.1.3 says transfer copies active assignments, but Worker is
// Company-scoped (WC-INV-2) and cross-tenant operational references are
// prohibited (AC-ARCH-B3); how a source-Company Worker's assignment becomes
// an assignment under the receiving Company is not defined. The M2 contract
// directs: raise AMB-003 and halt AC-8 rather than select a transfer model.
//
// This file is a HALT SENTINEL, not the criterion's acceptance test. It
// verifies (a) the AMB-003 record is present and complete in
// M2/evidence/open-items.md, and (b) no transfer mechanism (command,
// TransferEvent, successor linkage) exists in the M2 core. A PASS here means
// the halt is intact — it does NOT satisfy M2-AC-8.
import { requireCore, report, SRC_DIR, M2_DIR, M1_SRC_DIR } from './lib.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];

// (a) AMB-003 formally recorded.
const openItemsPath = join(M2_DIR, 'evidence', 'open-items.md');
if (!existsSync(openItemsPath)) {
  failures.push('ABSENT: M2/evidence/open-items.md (AMB-003 record not created)');
} else {
  const oi = readFileSync(openItemsPath, 'utf8');
  for (const needle of ['AMB-003', 'Transfer across Company-scoped Worker identities', 'Blocker: yes']) {
    if (!oi.includes(needle)) failures.push(`open-items.md AMB-003 record missing: "${needle}"`);
  }
}

// (b) Halt integrity: no transfer implementation while AMB-003 is unresolved.
const absent = requireCore();
if (!absent) {
  const src = readFileSync(join(SRC_DIR, 'domain.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, '$1');
  for (const banned of ['TransferProject', 'TransferEvent', 'transferProject']) {
    if (new RegExp(`\\b${banned}\\b`).test(src)) {
      failures.push(`transfer artifact '${banned}' present in M2 core while AMB-003 is unresolved`);
    }
  }
  // Runtime: no command type mentioning transfer is known to the M2 core.
  const m2 = await import(`${SRC_DIR}/domain.js`);
  const m1 = await import(`${M1_SRC()}/domain.js`);
  const s = m1.createStore();
  const r = m2.execute(s, { type: 'TransferProject', actor: { system: true }, payload: {} });
  if (r.outcome !== 'server rejected' || !/unknown command type/.test(r.reason ?? '')) {
    failures.push(`TransferProject is not an unknown command: ${JSON.stringify(r)}`);
  }
}

function M1_SRC() {
  return join(M2_DIR, '..', 'M1', 'src');
}

report('M2-AC-8 (BLOCKED pending AMB-003 — halt sentinel)', failures);
