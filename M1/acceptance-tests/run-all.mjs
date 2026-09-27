// M1 acceptance suite runner. Runs every m1-ac-*.test.mjs present in this
// directory and reports per-test results plus the expected-but-absent files.
// Expected-but-absent tests are reported NOT PRESENT (halted scope must be
// visible; see M1/evidence/open-items.md). Exit 0 only if every present test
// passes; exit 1 otherwise. Gate completeness (14 criteria) is assessed in
// M1/evidence/acceptance-map.md, not here.
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const present = readdirSync(HERE).filter((f) => /^m1-ac-\d+\.test\.mjs$/.test(f)).sort();

const results = [];
for (const f of present) {
  try {
    execFileSync(process.execPath, [join(HERE, f)], { stdio: 'pipe', encoding: 'utf8' });
    results.push({ file: f, status: 'PASS' });
  } catch (e) {
    results.push({ file: f, status: 'FAIL', output: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() });
  }
}

const expected = Array.from({ length: 14 }, (_, i) => `m1-ac-${String(i + 1).padStart(2, '0')}.test.mjs`);
const missing = expected.filter((f) => !present.includes(f));

for (const r of results) {
  console.log(`${r.file}: ${r.status}`);
  if (r.status === 'FAIL' && r.output) console.log(r.output.split('\n').map((l) => `    ${l}`).join('\n'));
}
for (const f of missing) console.log(`${f}: NOT PRESENT (see M1/evidence/open-items.md)`);

const failed = results.filter((r) => r.status === 'FAIL');
console.log(`---\n${results.length - failed.length}/${results.length} present tests passing; ${missing.length} expected files absent`);
process.exit(failed.length === 0 ? 0 : 1);
