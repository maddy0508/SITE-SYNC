import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceClient } from './helpers.mjs';

const COMMAND_IDS = [
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
];

test('Phase 2 database preflight is clean', async () => {
  for (const commandId of COMMAND_IDS) {
    const { count, error } = await serviceClient
      .from('processed_commands')
      .select('command_id', { count: 'exact', head: true })
      .eq('command_id', commandId);

    assert.ifError(error);
    assert.equal(
      count,
      0,
      `Stale Phase 2 test database. Command ${commandId} already exists. Run supabase db reset.`
    );
  }
});
