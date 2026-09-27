// M0-AC-1 — No §8 violations, no deferred fundamentals.
// Anchor: MASTER_BLUEPRINT §M0.6 M0-AC-1; §8 A–I; §8.K (as amended at commit
// 0eefbd6, operative package EP-2.0).
// Structural contract: architecture.md must carry a §8 compliance matrix in which
// every defined AC-ARCH-* constraint has an explicit disposition — SATISFIED, or
// DEFERRED with named target milestone and named test (deferred ≠ satisfied).
// §8.K (amended): the amended blueprint must explicitly identify M0-AC-1 through
// M0-AC-10 as the operative M0 architecture acceptance criteria, and no reference
// to the superseded drafting artifact "AC-ARCH-0.1"/"AC-ARCH-0.8" may remain in
// MASTER_BLUEPRINT.md. M0/evidence/acceptance-map.md must record M0-AC-1 as PASS
// under EP-2.0.
import { readFileSync } from 'node:fs';
import { readArtifact, lineContaining, report, REPO_ROOT } from './lib.mjs';

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
}

// §8.K (amended, EP-2.0): positive assertions about the amended blueprint.
const blueprint = readFileSync(
  `${REPO_ROOT}/MASTER_BLUEPRINT/MASTER_BLUEPRINT.md`, 'utf8');
const kIdx = blueprint.indexOf('8.K — Architecture acceptance criteria');
const lIdx = blueprint.indexOf('8.L — AC-04 implications');
const eIdx = blueprint.indexOf('END OF LOCKED BLUEPRINT');
if (kIdx === -1 || lIdx === -1 || lIdx < kIdx) {
  failures.push('§8.K block not located ahead of §8.L in MASTER_BLUEPRINT.md');
} else {
  const kBlock = blueprint.slice(kIdx, lIdx);
  if (!/M0-AC-1 through M0-AC-10/.test(kBlock)) {
    failures.push('amended §8.K does not identify M0-AC-1 through M0-AC-10 as the operative criteria');
  }
  if (!/M0 Execution Contract/.test(kBlock) || !/§M0\.6/.test(kBlock)) {
    failures.push('amended §8.K does not cite the M0 Execution Contract §M0.6 as the criteria source');
  }
}
// No AC-ARCH-0.x reference may remain as an operative criterion. The amended
// §8.K records the drafting-artifact explanation inside the §8.K…§8.L block;
// any occurrence outside §8.K (in the operative body after §8.L) is a failure.
const bodyAfterK = eIdx > lIdx ? blueprint.slice(lIdx, eIdx) : blueprint.slice(lIdx);
if (/AC-ARCH-0\.1/.test(bodyAfterK) || /AC-ARCH-0\.8/.test(bodyAfterK)) {
  failures.push('AC-ARCH-0.1 / AC-ARCH-0.8 referenced outside the §8.K amendment record');
}

// Evidence currency: acceptance-map must record M0-AC-1 PASS under EP-2.0.
const accMap = readArtifact('evidence/acceptance-map.md');
if (!accMap) {
  failures.push('ABSENT: M0/evidence/acceptance-map.md');
} else {
  const ac1 = accMap.split('\n').find((l) => l.includes('M0-AC-1') && l.trim().startsWith('|'));
  if (!ac1) {
    failures.push('acceptance-map.md has no M0-AC-1 row');
  } else if (!/\|\s*PASS\s*\|/.test(ac1)) {
    failures.push('acceptance-map.md M0-AC-1 result is not PASS');
  }
  if (!/EP-2\.0/.test(accMap)) {
    failures.push('acceptance-map.md does not record EP-2.0 as the operative package');
  }
}
report('M0-AC-1', failures);
