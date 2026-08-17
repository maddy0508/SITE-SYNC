import { DeviceRegistrationService } from '../src/identity/deviceRegistrationService';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const INSTALLATION_ID = '33333333-3333-4333-8333-333333333333';
const INSTALLATION_KEY = 'device-key-a';
const NOW = '2026-08-17T10:00:00.000Z';

function createMockClient() {
  const state = new Map<string, any>();
  const from = jest.fn(() => {
    const builder: any = {
      select: jest.fn(() => builder),
      eq: jest.fn((column: string, value: string) => {
        builder.filters ??= {};
        builder.filters[column] = value;
        return builder;
      }),
      maybeSingle: jest.fn(async () => {
        const rows = [...state.values()].filter((row) =>
          Object.entries(builder.filters ?? {}).every(([key, value]) => row[key] === value),
        );
        return { data: rows[0] ?? null, error: null };
      }),
      single: jest.fn(async () => {
        const rows = [...state.values()].filter((row) =>
          Object.entries(builder.filters ?? {}).every(([key, value]) => row[key] === value),
        );
        return { data: rows[0] ?? null, error: null };
      }),
      insert: jest.fn((payload: any) => {
        const row = {
          id: INSTALLATION_ID,
          created_at: '2026-08-17T10:00:00.000+00:00',
          ...payload,
          last_seen_at: payload.last_seen_at ?? '2026-08-17T10:00:00.000+00:00',
          revoked_at: null,
        };
        state.set(row.id, row);
        builder.inserted = row;
        return builder;
      }),
      update: jest.fn((payload: any) => {
        for (const row of state.values()) {
          if (Object.entries(builder.filters ?? {}).every(([key, value]) => row[key] === value)) {
            Object.assign(row, payload);
          }
        }
        return builder;
      }),
      then: (resolve: (value: any) => unknown) => builder.maybeSingle().then(resolve),
    };
    return builder;
  });

  return { from, state };
}

function createLocalPersistence() {
  let session: any = null;
  return {
    insertLocalDeviceSession: jest.fn(async (record: any) => { session = { ...record, revision: 1 }; }),
    updateLocalDeviceSession: jest.fn(async (userId: string, expectedRevision: number, updates: any) => {
      if (!session || session.userId !== userId) throw new Error('not found');
      if (session.revision !== expectedRevision) throw new Error(`Revision mismatch: expected ${expectedRevision}, got ${session.revision}`);
      session = { ...session, ...updates, revision: expectedRevision + 1 };
    }),
    getLocalDeviceSession: jest.fn(async (userId: string) => session?.userId === userId ? session : null),
  };
}

describe('DeviceRegistrationService', () => {
  it('registers a device for the authenticated user without accepting caller ownership', async () => {
    const client = createMockClient();
    const local = createLocalPersistence();
    const service = new DeviceRegistrationService(client as never, local);

    const result = await service.register(USER_A, {
      installationKey: INSTALLATION_KEY,
      deviceName: 'Worker phone',
      appVersion: '1.0.0',
      osVersion: 'Android 16',
      now: NOW,
    });

    expect(result.userId).toBe(USER_A);
    expect(result.status).toBe('ACTIVE');
    expect(result.createdAt).toBe(NOW);
    expect(client.state.get(INSTALLATION_ID).user_id).toBe(USER_A);
    expect(local.insertLocalDeviceSession).toHaveBeenCalledWith(expect.objectContaining({
      userId: USER_A,
      deviceInstallationId: INSTALLATION_ID,
      installationKey: INSTALLATION_KEY,
      status: 'ACTIVE',
    }));
  });

  it('is idempotent for the same authenticated user and installation key', async () => {
    const client = createMockClient();
    const local = createLocalPersistence();
    const service = new DeviceRegistrationService(client as never, local);

    const first = await service.register(USER_A, { installationKey: INSTALLATION_KEY, now: NOW });
    const second = await service.register(USER_A, { installationKey: INSTALLATION_KEY, now: '2026-08-17T10:01:00.000Z' });

    expect(second.id).toBe(first.id);
    expect(local.insertLocalDeviceSession).toHaveBeenCalledTimes(1);
  });

  it('rejects a second installation key when the local boundary already has a different installation', async () => {
    const client = createMockClient();
    const local = createLocalPersistence();
    const service = new DeviceRegistrationService(client as never, local);

    await service.register(USER_A, { installationKey: INSTALLATION_KEY, now: NOW });

    await expect(service.register(USER_A, { installationKey: 'different-key', now: NOW })).rejects.toMatchObject({
      code: 'LOCAL_DEVICE_CONFLICT',
    });
    expect(client.state.size).toBe(1);
  });

  it('preserves ACTIVE to REVOKED lifecycle and rejects a second revocation transition', async () => {
    const client = createMockClient();
    const local = createLocalPersistence();
    const service = new DeviceRegistrationService(client as never, local);

    await service.register(USER_A, { installationKey: INSTALLATION_KEY, now: NOW });
    const revoked = await service.revoke(USER_A, 1, '2026-08-17T10:02:00.000Z');

    expect(revoked.status).toBe('REVOKED');
    expect(client.state.get(INSTALLATION_ID).status).toBe('REVOKED');
    await expect(service.revoke(USER_A, 2, '2026-08-17T10:03:00.000Z')).rejects.toMatchObject({ code: 'INVALID_LIFECYCLE' });
  });

  it('surfaces optimistic revision mismatch', async () => {
    const client = createMockClient();
    const local = createLocalPersistence();
    const service = new DeviceRegistrationService(client as never, local);

    await service.register(USER_A, { installationKey: INSTALLATION_KEY, now: NOW });

    await expect(service.revoke(USER_A, 99, '2026-08-17T10:02:00.000Z')).rejects.toMatchObject({
      code: 'REVISION_MISMATCH',
    });
  });

  it('rejects a server response that attempts to bind the installation to another user', async () => {
    const client = createMockClient();
    const local = createLocalPersistence();
    const service = new DeviceRegistrationService(client as never, local);

    const originalFrom = client.from;
    client.from = jest.fn(() => {
      const builder: any = originalFrom();
      builder.single = jest.fn(async () => ({
        data: {
          id: INSTALLATION_ID,
          user_id: USER_B,
          installation_key: INSTALLATION_KEY,
          status: 'ACTIVE',
          created_at: NOW,
          last_seen_at: NOW,
          revoked_at: null,
        },
        error: null,
      }));
      return builder;
    }) as never;

    await expect(service.register(USER_A, { installationKey: INSTALLATION_KEY, now: NOW })).rejects.toMatchObject({
      code: 'CROSS_USER_ACCESS',
    });
  });
});
