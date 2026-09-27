// M0 acceptance test runner — executes m0-ac-01 … m0-ac-10 and reports the gate.
// Exit code 0 only if every test passes. Per §M0.6: no partial pass.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
let failed = 0;
for (let i = 1; i <= 10; i++) {
  const f = join(HERE, `m0-ac-${String(i).padStart(2, '0')}.test.mjs`);
  try {
    const out = execFileSync(process.execPath, [f], { encoding: 'utf8' });
    process.stdout.write(out);
  } catch (e) {
    failed++;
    process.stdout.write(e.stdout ?? '');
    process.stderr.write(e.stderr ?? '');
  }
}
console.log(failed === 0 ? 'M0 GATE: 10/10 PASS' : `M0 GATE: ${10 - failed}/10 PASS, ${failed} FAIL`);
process.exit(failed === 0 ? 0 : 1);
