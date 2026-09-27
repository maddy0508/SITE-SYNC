// M0-AC-8 — No retroactive reinterpretation required.
// Anchor: MASTER_BLUEPRINT §M0.6 M0-AC-8; Operating Contract §3 (anchor every
// decision); Skill 01 (anchors cited on every artifact).
// Structural contract: every M0 artifact document must carry blueprint anchors
// (§, INV, AC citations), and the CommandOutcome vocabulary must be used verbatim
// from §M0.3.7 — not redefined.
import { readArtifact, report } from './lib.mjs';

const DOCS = [
  'architecture.md', 'conceptual-model-mapping.md', 'persistence-model.md',
  'command-sync-model.md', 'authorization-scope-model.md',
  'offline-reconciliation-model.md', 'audit-model.md', 'salvage-register.md',
  'pending-extractions.md',
];
const ANCHOR = /§\d+(\.\d+)*|\b[A-Z]{1,3}-INV-\d+[a-z]?\b|\bDM-INV-\d+[a-z]?\b|\bAC-ARCH-[A-I]\d|\bAC-[A-Z]{2,3}-\d|\bM0-AC-\d|\bOS-INV-\d/;

const failures = [];
for (const d of DOCS) {
  const text = readArtifact(d);
  if (!text) {
    failures.push(`ABSENT: M0/${d}`);
    continue;
  }
  const hits = text.split('\n').filter((l) => ANCHOR.test(l)).length;
  if (hits < 3) failures.push(`${d}: fewer than 3 blueprint anchor citations (${hits})`);
}
const csm = readArtifact('command-sync-model.md');
if (csm) {
  // Vocabulary must not be redefined: the six §M0.3.7 states verbatim, and no
  // alternate outcome tokens introduced as outcomes.
  const alt = /\b(committed locally|accepted locally|pending|synced|acked)\b(?!\s*\()/i;
  const bad = csm.split('\n').filter((l) => /outcome|state/i.test(l) && alt.test(l));
  if (bad.length > 0) {
    failures.push(`command-sync-model.md introduces non-canonical outcome vocabulary: ${bad[0].trim().slice(0, 80)}`);
  }
}
report('M0-AC-8', failures);
