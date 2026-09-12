import { SupabaseSyncTransport, type SupabaseRpcClient } from '../src/sync/supabaseSyncTransport';
import type { SyncTransportRequest } from '../src/sync/syncTransport';

const request = {
  command: { commandId: 'cmd-1' } as never,
  aggregate: { projectId: 'project-1', personId: 'person-1', workDateUtc: '2026-09-12' },
  payload: { commandId: 'cmd-1', commandType: 'CHECK_IN', baseRevision: 0, workDateUtc: '2026-09-12' } as never,
  deviceInstallationId: 'device-1',
} satisfies SyncTransportRequest;

describe('SupabaseSyncTransport', () => {
  test.each([
    ['ACCEPTED', { status: 'ACCEPTED', command_id: 'cmd-1', server_revision: 1, result: { state: 'CHECKED_IN' } }, 'ACCEPTED'],
    ['DUPLICATE_ACCEPTED', { status: 'DUPLICATE_ACCEPTED', command_id: 'cmd-1', server_revision: 1, result: { state: 'CHECKED_IN' } }, 'DUPLICATE_ACCEPTED'],
    ['REVISION_CONFLICT', { status: 'REVISION_CONFLICT', command_id: 'cmd-1', server_revision: 2, authoritative_aggregate: { state: 'CHECKED_OUT' }, reason_code: 'BASE_REVISION_MISMATCH' }, 'REVISION_CONFLICT'],
    ['AUTHORIZATION_REJECTED', { status: 'AUTHORIZATION_REJECTED', code: 'NOT_AUTHORIZED', message: 'no' }, 'AUTHORIZATION_REJECTED'],
    ['VALIDATION_REJECTED', { status: 'VALIDATION_REJECTED', code: 'INVALID', message: 'bad' }, 'VALIDATION_REJECTED'],
    ['DEVICE_REVOKED', { status: 'DEVICE_REVOKED', code: 'DEVICE_REVOKED', message: 'revoked' }, 'DEVICE_REVOKED'],
  ])('%s maps to the discriminated transport response', async (_name, data, kind) => {
    const rpc: SupabaseRpcClient = { rpc: jest.fn().mockResolvedValue({ data, error: null }) };
    const transport = new SupabaseSyncTransport(rpc);
    const result = await transport.submit(request);
    expect(result.kind).toBe(kind);
    expect(rpc.rpc).toHaveBeenCalledWith('sync_attendance_command', expect.objectContaining({
      command_id: 'cmd-1',
      device_installation_id: 'device-1',
      project_id: 'project-1',
      person_id: 'person-1',
      work_date_utc: '2026-09-12',
      base_revision: 0,
      command_type: 'CHECK_IN',
    }));
  });

  test('maps RPC errors to retryable server errors without claiming success', async () => {
    const rpc: SupabaseRpcClient = { rpc: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST500', message: 'temporary' } }) };
    const result = await new SupabaseSyncTransport(rpc).submit(request);
    expect(result).toEqual({ kind: 'SERVER_ERROR', code: 'PGRST500', message: 'temporary', retryable: true });
  });

  test.each([
    null,
    {},
    { status: 'ACCEPTED' },
    { status: 'ACCEPTED', command_id: 'cmd-other', server_revision: 1, result: {} },
    { status: 'DUPLICATE_ACCEPTED', command_id: 'cmd-other', server_revision: 1, result: {} },
    { status: 'REVISION_CONFLICT', server_revision: 1 },
    { status: 'REVISION_CONFLICT', command_id: 'cmd-other', server_revision: 1, reason_code: 'BASE_REVISION_MISMATCH' },
    { status: 'UNKNOWN' },
  ])('rejects malformed RPC response: %p', async data => {
    const rpc: SupabaseRpcClient = { rpc: jest.fn().mockResolvedValue({ data, error: null }) };
    const result = await new SupabaseSyncTransport(rpc).submit(request);
    expect(result.kind).toBe('SERVER_ERROR');
    expect((result as { retryable: boolean }).retryable).toBe(true);
  });
});
