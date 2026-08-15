import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Phase 2 test environment is incomplete.');
}

export const serviceClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function userClient(email) {
  const client = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { error } = await client.auth.signInWithPassword({
    email,
    password: 'password123',
  });

  assert.ifError(error);
  return client;
}

export async function expectCount(client, table, filters, expected, message) {
  let query = client.from(table).select('*', { count: 'exact', head: true });
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const { count, error } = await query;
  assert.ifError(error);
  assert.equal(count, expected, `${message}: expected ${expected}, got ${count}`);
}

export async function expectQueryCount(client, table, buildQuery, expected, message) {
  const { count, error } = await buildQuery(
    client.from(table).select('*', { count: 'exact', head: true })
  );
  assert.ifError(error);
  assert.equal(count, expected, `${message}: expected ${expected}, got ${count}`);
}

export async function expectRpcResult(client, rpcName, args, expectedStatus, expectedReason, message = rpcName) {
  const { data, error } = await client.rpc(rpcName, args);
  assert.ifError(error, `${message}: RPC failed`);
  assert.equal(data?.status, expectedStatus, `${message}: expected ${expectedStatus}, got ${data?.status}`);
  if (expectedReason !== undefined) {
    assert.equal(data?.error_reason, expectedReason, `${message}: expected ${expectedReason}, got ${data?.error_reason}`);
  }
  return data;
}
