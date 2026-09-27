// M0-AC-1 — No §8 violations, no deferred fundamentals.
// Anchor: MASTER_BLUEPRINT §M0.6 M0-AC-1; §8 A–I.
// Structural contract: architecture.md must carry a §8 compliance matrix in which
// every defined AC-ARCH-* constraint has an explicit disposition — SATISFIED, or
// DEFERRED with named target milestone and named test (deferred ≠ satisfied) —
// and the undefined AC-ARCH-0.1–0.8 (§8.K) must be recorded as UNVERIFIABLE with
// an AMB-### reference, not silently treated as satisfied.
import { readArtifact, lineContaining, report } from './lib.mjs';

const DEFINED = [
  'A1', 'A2', 'A2a', 'A3', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C5a', 'C6', 'C7', 'C8', 'C9', 'C10',
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6',
  'E1', 'E2', 'E3', 'E4',
  'F1', 'F2', 'F3', 'F4',
  'G1', 'G2', 'G3', 'G4', 'G5',
  'H1', 'H2', 'H3', 'H4', 'H5',
  'I1', 'I2', 'I3', 'I4',
];

const failures = [];
const arch = readArtifact('architecture.md');
if (!arch) {
  failures.push('ABSENT: M0/architecture.md');
} else {
  if (!/§?8 compliance matrix/i.test(arch)) {
    failures.push('architecture.md lacks a §8 compliance matrix section');
  }
  for (const id of DEFINED) {
    const line = lineContaining(arch, `AC-ARCH-${id}`);
    if (!line) {
      failures.push(`AC-ARCH-${id}: no disposition line in architecture.md`);
      continue;
    }
    const satisfied = /\bSATISFIED\b/.test(line);
    const deferred = /\bDEFERRED\b/.test(line);
    if (satisfied && deferred) {
      failures.push(`AC-ARCH-${id}: line marks both SATISFIED and DEFERRED`);
    } else if (deferred) {
      if (!/target[:\s]*M\d+/i.test(line) || !/test[:\s]*\S+/i.test(line)) {
        failures.push(`AC-ARCH-${id}: DEFERRED without named target milestone and test`);
      }
    } else if (!satisfied) {
      failures.push(`AC-ARCH-${id}: no SATISFIED/DEFERRED disposition`);
    }
  }
  // §8.K declares AC-ARCH-0.1 through AC-ARCH-0.8 "verified at M0" but the blueprint
  // never enumerates them. They must be recorded as UNVERIFIABLE with an AMB reference.
  const zeroLine = lineContaining(arch, 'AC-ARCH-0.1');
  if (!zeroLine) {
    failures.push('AC-ARCH-0.1–0.8 (§8.K): no entry in compliance matrix');
  } else if (!/\bUNVERIFIABLE\b/.test(zeroLine) || !/AMB-\d{3}/.test(zeroLine)) {
    failures.push('AC-ARCH-0.1–0.8: must be marked UNVERIFIABLE with an AMB-### reference');
  }
}
const openItems = readArtifact('evidence/open-items.md');
if (!openItems) {
  failures.push('ABSENT: M0/evidence/open-items.md');
} else if (!/AMB-001/.test(openItems)) {
  failures.push('open-items.md does not record AMB-001 (AC-ARCH-0.1–0.8 undefined)');
}
report('M0-AC-1', failures);
