// M0-AC-9 — Declared conflict rules per entity class.
// Anchor: MASTER_BLUEPRINT §M0.6 M0-AC-9; §6.10.3 (conflict table; "Last write
// wins" is not a global default); §6.4.3, §6.5.8, §6.6.3, §6.7 Amendment 2;
// §8 AC-ARCH-C6.
// Structural contract: command-sync-model.md must declare a conflict rule for
// every conflicting entity class named by the blueprint, and must explicitly
// reject a global LWW default.
import { readArtifact, report } from './lib.mjs';

const failures = [];
const doc = readArtifact('command-sync-model.md');
if (!doc) {
  failures.push('ABSENT: M0/command-sync-model.md');
} else {
  const CLASSES = [
    ['worker profile/config same-field', /same (worker|field)[^\n]*later wins|later wins[^\n]*both recorded/i],
    ['shift boundary conflict', /shift boundar/i],
    ['evidence attachment additive', /evidence[^\n]*additive|additive[^\n]*evidence/i],
    ['blocker state transition', /blocker[^\n]*transition/i],
    ['readiness-gate violation at sync', /readiness[^\n]*(gate|violation)/i],
    ['completion claims additive', /claim[s]?[^\n]*additive/i],
    ['task transitions later wins', /task transition[^\n]*later wins/i],
    ['verification single', /verification[^\n]*single|single[^\n]*verification/i],
    ['reversals additive', /reversal[s]?[^\n]*additive/i],
    ['reassignment later wins', /reassign[^\n]*later wins/i],
    ['QA/blocker server-authoritative ordering', /server-authoritative[^\n]*(current state|ordering)|declared transition ordering/i],
    ['pre-start closure first accepted wins', /closure[^\n]*first accepted|first accepted wins/i],
    ['C-record (config) rule', /C-record|ReportConfig|config[^\n]*conflict/i],
  ];
  for (const [label, re] of CLASSES) {
    if (!re.test(doc)) failures.push(`no declared conflict rule for: ${label}`);
  }
  if (!/no global[^\n]*LWW|LWW[^\n]*(not|never)[^\n]*global|["'']Last write wins["''] is not a global default/i.test(doc)) {
    failures.push('global LWW default not explicitly rejected (AC-ARCH-C6)');
  }
}
report('M0-AC-9', failures);
