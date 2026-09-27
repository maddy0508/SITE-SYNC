// M0-AC-6 — No second source of truth.
// Anchor: MASTER_BLUEPRINT §M0.6 M0-AC-6; §M0.2 (prohibited layers); §7 DM-INV-3;
// §6.9 REP-INV-1/10; §6.8 COM-INV-2/10; §6.11 AD-INV-2; §8 AC-ARCH-A1, A4, E3.
// Structural contract: architecture.md must explicitly close each prohibited
// second-source-of-truth channel named by §M0.2.
import { readArtifact, report } from './lib.mjs';

const failures = [];
const arch = readArtifact('architecture.md');
if (!arch) {
  failures.push('ABSENT: M0/architecture.md');
} else {
  const CHECKS = [
    ['stored domain booleans not authoritative (§M0.2, A4)', /stored (domain )?(status|boolean|flag)[s]?\b[^.\n]*not authoritative|no stored (status|boolean|flag)[^.\n]*authoritative/i],
    ['derived state never authoritative (DM-INV-3)', /derived state is never authoritative|derived[^.\n]*never authoritative/i],
    ['no parallel audit store (§M0.2, AD-INV-2)', /no parallel audit|parallel audit store[^.\n]*(prohibited|none|rejected)/i],
    ['no shadow reporting/messaging/notification/admin layer (§M0.2)', /shadow (reporting|messaging|notification|admin)/i],
    ['reports are D only (REP-INV-1/10)', /REP-INV-1|REP-INV-10/],
    ['communication creates no facts (COM-INV-2)', /COM-INV-2/],
    ['admin actions produce canonical domain F (AD-INV-2)', /AD-INV-2/],
    ['no derived state as input to facts (E3)', /AC-ARCH-E3|E3\b/],
  ];
  for (const [label, re] of CHECKS) {
    if (!re.test(arch)) failures.push(`second-source-of-truth closure missing: ${label}`);
  }
}
report('M0-AC-6', failures);
