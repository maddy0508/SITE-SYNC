import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = fs.readFileSync(path.join(root, 'src/attendance/M17RealRuntimeQaScreen.tsx'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '..', '.github/workflows/m17-android-build.yml'), 'utf8');

const required = [
  ['real isolated authentication', /authService\.signIn\(/],
  ['real device registration', /DeviceRegistrationService/],
  ['offline durable attendance', /OFFLINE_PENDING_VERIFICATION/],
  ['repository observation', /subscribeRepositoryChanges/],
  ['real RPC sync', /requestManualSync\(\)/],
  ['conflict evidence', /REVISION_CONFLICT/],
  ['revoked-device evidence', /DEVICE_REVOKED/],
  ['authorization evidence', /AUTHORIZATION_REJECTED/],
  ['retry classification', /RETRYABLE|retryable/i],
  ['provenance artifact', /SITE-SYNC-M1\.7-QA-PROVENANCE/],
];

const forbidden = [
  ['tester-entered credentials as the required QA provisioning path', /TextInput[^\n]*(?:Test account email|Test account password)/],
  ['locally fabricated conflict as acceptance evidence', /setLocalState\(|UPDATE attendance_state SET current_revision/],
  ['local validation substituted for server validation', /Local validation rejection/],
  ['duplicate replay without explicit same-command RPC delivery', /latest=\$\{String\(row\.commandId\)/],
];

let failed = false;
for (const [label, pattern] of required) {
  if (!pattern.test(app + workflow)) {
    console.error(`M17_CAPABILITY_FAIL: missing ${label}`);
    failed = true;
  }
}
for (const [label, pattern] of forbidden) {
  if (pattern.test(app)) {
    console.error(`M17_CAPABILITY_FAIL: ${label}`);
    failed = true;
  }
}

if (!/sha256sum|shasum -a 256/.test(workflow)) {
  console.error('M17_CAPABILITY_FAIL: APK SHA-256 provenance step missing');
  failed = true;
}

if (!/test -z|grep.*production|production.*forbidden/i.test(workflow)) {
  console.error('M17_CAPABILITY_FAIL: explicit production-configuration guard missing');
  failed = true;
}

if (failed) process.exit(1);
console.log('M17_CAPABILITY_PASS: source contains the required acceptance capabilities and build safeguards.');
