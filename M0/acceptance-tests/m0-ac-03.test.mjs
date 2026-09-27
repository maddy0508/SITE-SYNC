// M0-AC-3 — Offline capability coverage, split by mutation and read, incl. §6.3.
// Anchor: MASTER_BLUEPRINT §M0.6 M0-AC-3; §6.10.2 (offline lists); §6.3 (WC-INV);
// §8 AC-ARCH-C1, E2, F1–F4.
// Structural contract: offline-reconciliation-model.md must carry a coverage table
// in which every §6.10.2 offline-mutating action has a durable-intent path, every
// read-only capability names a cache/read model and a freshness mechanism, and
// §6.3 offline capabilities (QR sign-in/out etc.) are explicitly covered.
import { readArtifact, report } from './lib.mjs';

const failures = [];
const doc = readArtifact('offline-reconciliation-model.md');
if (!doc) {
  failures.push('ABSENT: M0/offline-reconciliation-model.md');
} else {
  if (!/state-mutating/i.test(doc) || !/read-only/i.test(doc) || !/connectivity-required/i.test(doc)) {
    failures.push('coverage is not split into state-mutating / read-only / connectivity-required');
  }
  // §6.10.2 "Must work offline (v1)" — mutating actions.
  const MUTATING = [
    ['sign-in', /sign-in|check-in/i],
    ['sign-out', /sign-out|check-out/i],
    ['break start', /break start/i],
    ['break end', /break end/i],
    ['task start', /task start/i],
    ['task pause', /task pause/i],
    ['task complete', /task complete/i],
    ['evidence capture', /evidence capture/i],
    ['blocker raise', /blocker raise/i],
    ['blocker update', /blocker update|blocker acknowledge|blocker resol/i],
    ['daily pre-start completion', /pre-start completion|pre-start.*offline/i],
    ['acknowledgement with signature', /acknowledgement.*signature|signature capture/i],
  ];
  // §6.10.2 read-only capabilities.
  const READS = [
    ['crew lookup', /crew (and contact )?lookup|crew.*cached/i],
    ['contact lookup', /contact lookup|contact.*cached/i],
    ['own readiness', /own readiness|readiness.*cached|viewing own readiness/i],
    ['assigned sites', /assigned sites|worker site list/i],
  ];
  for (const [label, re] of [...MUTATING, ...READS]) {
    if (!re.test(doc)) failures.push(`offline capability not covered: ${label}`);
  }
  // Every mutating action must be tied to durable intent (§8 C1, §6.10 OS-INV-3).
  const mutSection = doc.split(/read-only/i)[0];
  if (!/durable/i.test(mutSection)) {
    failures.push('state-mutating section does not name durable intent');
  }
  // Every read-only capability must name cache + freshness (§8 E2).
  const readSection = doc.split(/read-only/i)[1] ?? '';
  if (!/cach/i.test(readSection) || !/freshness/i.test(readSection)) {
    failures.push('read-only section does not name cache/read model and freshness');
  }
  // §6.3 offline capabilities explicitly included (M0-AC-3 "Includes §6.3").
  if (!/§6\.3/.test(doc)) failures.push('§6.3 offline capabilities not explicitly covered');
  // Connectivity-required operations must fail locally with reason (§8 F1).
  if (!/fail(s|ed)? locally with (a )?(specific )?reason|rejected locally/i.test(doc)) {
    failures.push('connectivity-required local rejection with reason not declared');
  }
}
report('M0-AC-3', failures);
