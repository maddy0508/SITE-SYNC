import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = fs.readFileSync(path.join(root, 'src/attendance/M17RealRuntimeQaScreen.tsx'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '..', '.github/workflows/m17-android-build.yml'), 'utf8');

const required = [
  ['real isolated authenticated session', /authService\.restoreSession\(\)/],
  ['real device registration', /DeviceRegistrationService/],
  ['offline durable attendance', /OFFLINE_PENDING_VERIFICATION/],
  ['repository observation', /subscribeRepositoryChanges/],
  ['real RPC sync', /requestManualSync\(\)/],
  ['same-command duplicate replay', /DUPLICATE_ACCEPTED/],
  ['server-side conflict evidence', /REVISION_CONFLICT/],
  ['revoked-device evidence', /DEVICE_REVOKED/],
  ['server authorization evidence', /AUTHORIZATION_REJECTED/],
  ['server validation evidence', /VALIDATION_REJECTED/],
  ['retry classification', /RETRYABLE|retryable/i],
  ['provenance artifact', /SITE-SYNC-M1\.7-QA-PROVENANCE/],
];

const forbidden = [
  ['tester-entered credentials as the required QA provisioning path', /TextInput|signIn\(email/],
  ['locally fabricated conflict as acceptance evidence', /UPDATE attendance_state SET current_revision|setLocalState\(/],
  ['local validation substituted for server validation', /Local validation rejection|future work-date mutation/],
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

const productionGuard = /pjosqguzbsteaoptaifw|SITE-SYNC\.supabase\.co/.test(workflow)
  && /Reject production configuration/.test(workflow)
  && /grep -R/.test(workflow);
if (!productionGuard) {
  console.error('M17_CAPABILITY_FAIL: explicit production-configuration guard missing');
  failed = true;
}

if (failed) process.exit(1);
console.log('M17_CAPABILITY_PASS: source contains the required acceptance capabilities and build safeguards.');
