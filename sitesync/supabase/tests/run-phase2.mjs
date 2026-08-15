import { spawnSync, execSync } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const cliArgs = process.argv.slice(2);
const doctorMode = cliArgs.includes('--doctor');
const SUPABASE_COMMAND = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const SUPABASE_ARGS = ['--yes', 'supabase'];

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_DB_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

function fail(message) {
  console.error(`[phase2-runner] ${message}`);
  process.exit(1);
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
    cwd: repoRoot,
  });

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function commandVersion(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: repoRoot,
  });

  if (result.status !== 0) return null;
  return (result.stdout || '').trim();
}

function ensureSupabaseCli() {
  const version = commandVersion(SUPABASE_COMMAND, [...SUPABASE_ARGS, '--version']);
  if (!version) {
    fail('Supabase CLI is required. Ensure `npx supabase --version` works from the repository root.');
  }
  console.log(`[phase2-runner] ${version}`);
}

function ensurePsql() {
  const version = commandVersion('psql');
  if (!version) {
    fail('psql is required for the privileged append-only SQL suite. Ensure `psql --version` works.');
  }
  console.log(`[phase2-runner] ${version}`);
}

function parseSupabaseStatusEnv() {
  let raw;
  try {
    raw = execSync(`${SUPABASE_COMMAND} ${SUPABASE_ARGS.join(' ')} status -o env`, {
      encoding: 'utf8',
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    fail('Unable to run `npx supabase status -o env`. Ensure the local Supabase project is running.');
  }

  const values = new Map();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && value) values.set(key, value);
  }
  return values;
}

function pickFirst(values, aliases) {
  for (const alias of aliases) {
    if (values.has(alias)) return values.get(alias);
  }
  return undefined;
}

function discoverSupabaseEnv() {
  const statusValues = parseSupabaseStatusEnv();
  const env = {
    SUPABASE_URL: pickFirst(statusValues, ['SUPABASE_URL', 'API_URL', 'URL']),
    SUPABASE_DB_URL: pickFirst(statusValues, ['SUPABASE_DB_URL', 'DB_URL', 'DATABASE_URL', 'POSTGRES_URL']),
    SUPABASE_ANON_KEY: pickFirst(statusValues, ['SUPABASE_ANON_KEY', 'ANON_KEY']),
    SUPABASE_SERVICE_ROLE_KEY: pickFirst(statusValues, ['SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY']),
  };

  const missing = REQUIRED_ENV.filter((key) => !env[key]);
  if (missing.length > 0) {
    const availableKeys = [...statusValues.keys()].join(', ') || 'none';
    fail(`Unable to map required Phase 2 environment values. Missing: ${missing.join(', ')}. Available Supabase status keys: ${availableKeys}.`);
  }

  if (!/^https?:\/\//.test(env.SUPABASE_URL)) fail('Discovered SUPABASE_URL does not look like an HTTP URL.');
  if (!/^postgres(ql)?:\/\//.test(env.SUPABASE_DB_URL)) fail('Discovered SUPABASE_DB_URL does not look like a Postgres connection URL.');

  console.log(`[phase2-runner] environment discovery resolved: ${REQUIRED_ENV.join(', ')}`);
  return env;
}

function doctor() {
  ensureSupabaseCli();
  ensurePsql();
  discoverSupabaseEnv();
  console.log('[phase2-runner] doctor passed.');
  console.log('[phase2-runner] No database reset was performed.');
}

if (doctorMode) {
  doctor();
  process.exit(0);
}

ensureSupabaseCli();
ensurePsql();
run(SUPABASE_COMMAND, [...SUPABASE_ARGS, 'db', 'reset']);

const testEnv = {
  ...process.env,
  ...discoverSupabaseEnv(),
};

run('node', ['--test', path.join(repoRoot, 'supabase/tests/integration')], testEnv);
run('psql', [
  testEnv.SUPABASE_DB_URL,
  '-v',
  'ON_ERROR_STOP=1',
  '-f',
  path.join(repoRoot, 'supabase/tests/sql/phase2_append_only.sql'),
], testEnv);

console.log('[phase2-runner] Phase 2 suites completed.');
