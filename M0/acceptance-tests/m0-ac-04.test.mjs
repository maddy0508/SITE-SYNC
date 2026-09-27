// M0-AC-4 — CommandOutcome coverage with local/server distinction.
// Anchor: MASTER_BLUEPRINT §M0.6 M0-AC-4; §M0.3.7 (six-state vocabulary);
// §7.3 CommandOutcome F; §8 AC-ARCH-C5, C5a, C9.
// Structural contract: command-sync-model.md must use the exact six-state
// vocabulary, declare one stable command identity across all layers, and declare
// locally rejected terminal and not queued.
import { readArtifact, report } from './lib.mjs';

const failures = [];
const doc = readArtifact('command-sync-model.md');
if (!doc) {
  failures.push('ABSENT: M0/command-sync-model.md');
} else {
  const STATES = [
    'locally rejected', 'locally committed', 'server accepted',
    'server rejected', 'server failed', 'server conflicted',
  ];
  for (const s of STATES) {
    if (!doc.toLowerCase().includes(s)) failures.push(`missing CommandOutcome state: "${s}"`);
  }
  if (!/stable command identity/i.test(doc) || !/client-generated/i.test(doc)) {
    failures.push('stable, client-generated command identity across layers not declared (§M0.3.7, C2)');
  }
  const lr = doc.split('\n').filter((l) => /locally rejected/i.test(l));
  if (!lr.some((l) => /terminal/i.test(l) && /not queued|never queued|not.*queue/i.test(l))) {
    failures.push('"locally rejected is terminal and not queued" not declared (§M0.3.7)');
  }
  if (!/C9|retained as auditable|retention/i.test(doc)) {
    failures.push('CommandOutcome retention (AC-ARCH-C9) not declared');
  }
}
report('M0-AC-4', failures);
