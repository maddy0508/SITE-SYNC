// M2-AC-5 [strict] — Resume semantics. BLOCKED pending AMB-004
// (independent Site operational suspension representation; §6.1.3 requires
// it but the Site lifecycle vocabulary contains no suspended state and no
// persistence mechanism is specified). No partial PASS is permitted by the
// M2 contract, so this criterion cannot PASS until AMB-004 is resolved.
//
// This file is a HALT SENTINEL, not the criterion's acceptance test. It
// verifies (a) the AMB-004 record is present and complete in
// M2/evidence/open-items.md, and (b) no independent-suspension mechanism has
// been implemented without a resolution (the halted scope stays halted).
// A PASS here means the halt is intact — it does NOT satisfy M2-AC-5.
import { requireCore, report, SRC_DIR, M2_DIR } from './lib.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];

// (a) AMB-004 formally recorded.
const openItemsPath = join(M2_DIR, 'evidence', 'open-items.md');
if (!existsSync(openItemsPath)) {
  failures.push('ABSENT: M2/evidence/open-items.md (AMB-004 record not created)');
} else {
  const oi = readFileSync(openItemsPath, 'utf8');
  for (const needle of ['AMB-004', 'Independent Site operational suspension', 'Blocker: yes']) {
    if (!oi.includes(needle)) failures.push(`open-items.md AMB-004 record missing: "${needle}"`);
  }
}

// (b) Halt integrity: the M2 core implements no independent Site suspension
//     command, fact type, or stored suspension flag.
const absent = requireCore();
if (!absent) {
  const src = readFileSync(join(SRC_DIR, 'domain.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, '$1');
  for (const banned of ['SuspendSite', 'UnsuspendSite', 'SiteSuspension', 'siteSuspended', 'suspendSite']) {
    if (new RegExp(`\\b${banned}\\b`).test(src)) {
      failures.push(`independent-suspension artifact '${banned}' present in M2 core while AMB-004 is unresolved`);
    }
  }
  // The only suspension path in M2 must be the Project-overlay derivation.
  const m2 = await import(`${SRC_DIR}/domain.js`);
  if (typeof m2.siteOperationalStatus !== 'function') {
    failures.push('siteOperationalStatus derivation absent (overlay portion is derivable and required by M2-AC-4)');
  }
}

report('M2-AC-5 (BLOCKED pending AMB-004 — halt sentinel)', failures);
