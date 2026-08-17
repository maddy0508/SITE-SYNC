import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getLocalDeviceSession,
  insertLocalDeviceSession,
  updateLocalDeviceSession,
} from '../database/localPersistence';
import type { LocalDeviceSessionRecord } from '../domain/localPersistence';

export type DeviceRegistrationErrorCode =
  | 'INVALID_INPUT'
  | 'DEVICE_NOT_FOUND'
  | 'CROSS_USER_ACCESS'
  | 'SUPABASE_FAILED'
  | 'INVALID_LIFECYCLE'
  | 'REVISION_MISMATCH';

export class DeviceRegistrationServiceError extends Error {
  readonly code: DeviceRegistrationErrorCode;

  constructor(code: DeviceRegistrationErrorCode, message: string) {
    super(message);
    this.name = 'DeviceRegistrationServiceError';
    this.code = code;
  }
}

export interface DeviceRegistrationInput {
  installationKey: string;
  deviceName?: string;
  appVersion?: string;
  osVersion?: string;
  now: string;
}

export interface DeviceInstallation {
  id: string;
  userId: string;
  installationKey: string;
  deviceName: string | null;
  appVersion: string | null;
  osVersion: string | null;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
}

type Row = Record<string, unknown>;
type QueryResult<T> = { data: T | null; error: { message: string } | null };

type LocalPersistenceBoundary = Pick<
  typeof import('../database/localPersistence'),
  'getLocalDeviceSession' | 'insertLocalDeviceSession' | 'updateLocalDeviceSession'
>;

export class DeviceRegistrationService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly local: LocalPersistenceBoundary = {
      getLocalDeviceSession,
      insertLocalDeviceSession,
      updateLocalDeviceSession,
    },
  ) {}

  async register(authenticatedUserId: string, input: DeviceRegistrationInput): Promise<DeviceInstallation> {
    this.validateInput(authenticatedUserId, input);

    const existing = await this.client
      .from('device_installations')
      .select('id, user_id, installation_key, device_name, app_version, os_version, status, created_at, last_seen_at, revoked_at')
      .eq('user_id', authenticatedUserId)
      .eq('installation_key', input.installationKey)
      .maybeSingle() as unknown as QueryResult<Row>;

    if (existing.error) {
      throw new DeviceRegistrationServiceError('SUPABASE_FAILED', existing.error.message);
    }

    if (existing.data) {
      const installation = this.mapInstallation(existing.data, authenticatedUserId);
      if (installation.status === 'ACTIVE') {
        return this.syncLocalSession(installation, input.now);
      }
      return installation;
    }

    const inserted = await this.client
      .from('device_installations')
      .insert({
        user_id: authenticatedUserId,
        installation_key: input.installationKey,
        device_name: input.deviceName ?? null,
        app_version: input.appVersion ?? null,
        os_version: input.osVersion ?? null,
        status: 'ACTIVE',
        last_seen_at: input.now,
      })
      .select('id, user_id, installation_key, device_name, app_version, os_version, status, created_at, last_seen_at, revoked_at')
      .single() as unknown as QueryResult<Row>;

    if (inserted.error) {
      throw new DeviceRegistrationServiceError('SUPABASE_FAILED', inserted.error.message);
    }
    if (!inserted.data) {
      throw new DeviceRegistrationServiceError('SUPABASE_FAILED', 'Device registration returned no installation');
    }

    const installation = this.mapInstallation(inserted.data, authenticatedUserId);
    await this.local.insertLocalDeviceSession({
      userId: authenticatedUserId,
      deviceInstallationId: installation.id,
      installationKey: installation.installationKey,
      status: installation.status,
      createdAt: installation.createdAt,
      lastVerifiedAt: input.now,
      updatedAt: input.now,
    });

    return installation;
  }

  async get(authenticatedUserId: string): Promise<DeviceInstallation | null> {
    if (!authenticatedUserId) {
      throw new DeviceRegistrationServiceError('INVALID_INPUT', 'Authenticated user id is required');
    }

    const result = await this.client
      .from('device_installations')
      .select('id, user_id, installation_key, device_name, app_version, os_version, status, created_at, last_seen_at, revoked_at')
      .eq('user_id', authenticatedUserId)
      .maybeSingle() as unknown as QueryResult<Row>;

    if (result.error) {
      throw new DeviceRegistrationServiceError('SUPABASE_FAILED', result.error.message);
    }
    return result.data ? this.mapInstallation(result.data, authenticatedUserId) : null;
  }

  async revoke(authenticatedUserId: string, expectedRevision: number, now: string): Promise<DeviceInstallation> {
    if (!authenticatedUserId || !now || !Number.isInteger(expectedRevision) || expectedRevision < 1) {
      throw new DeviceRegistrationServiceError('INVALID_INPUT', 'Authenticated user id, revision, and timestamp are required');
    }

    const localSession = await this.local.getLocalDeviceSession(authenticatedUserId);
    if (!localSession) {
      throw new DeviceRegistrationServiceError('DEVICE_NOT_FOUND', 'No local device session exists for authenticated user');
    }
    if (localSession.revision !== expectedRevision) {
      throw new DeviceRegistrationServiceError(
        'REVISION_MISMATCH',
        `Revision mismatch: expected ${expectedRevision}, got ${localSession.revision}`,
      );
    }
    if (localSession.status === 'REVOKED') {
      throw new DeviceRegistrationServiceError('INVALID_LIFECYCLE', 'A revoked device cannot be revoked again');
    }

    const result = await this.client
      .from('device_installations')
      .update({ status: 'REVOKED', revoked_at: now, last_seen_at: now })
      .eq('id', localSession.deviceInstallationId)
      .eq('user_id', authenticatedUserId)
      .select('id, user_id, installation_key, device_name, app_version, os_version, status, created_at, last_seen_at, revoked_at')
      .single() as unknown as QueryResult<Row>;

    if (result.error) {
      throw new DeviceRegistrationServiceError('SUPABASE_FAILED', result.error.message);
    }
    if (!result.data) {
      throw new DeviceRegistrationServiceError('DEVICE_NOT_FOUND', 'Authoritative device installation could not be resolved');
    }

    const installation = this.mapInstallation(result.data, authenticatedUserId);
    if (installation.status !== 'REVOKED') {
      throw new DeviceRegistrationServiceError('INVALID_LIFECYCLE', 'Device revocation did not produce REVOKED state');
    }

    await this.local.updateLocalDeviceSession(authenticatedUserId, expectedRevision, {
      status: 'REVOKED',
      lastVerifiedAt: now,
      updatedAt: now,
    });

    return installation;
  }

  private async syncLocalSession(installation: DeviceInstallation, now: string): Promise<DeviceInstallation> {
    const localSession = await this.local.getLocalDeviceSession(installation.userId);

    if (!localSession) {
      await this.local.insertLocalDeviceSession({
        userId: installation.userId,
        deviceInstallationId: installation.id,
        installationKey: installation.installationKey,
        status: installation.status,
        createdAt: installation.createdAt,
        lastVerifiedAt: now,
        updatedAt: now,
      });
      return installation;
    }

    if (localSession.deviceInstallationId !== installation.id || localSession.installationKey !== installation.installationKey) {
      throw new DeviceRegistrationServiceError('CROSS_USER_ACCESS', 'Local device session does not match authoritative installation');
    }

    await this.local.updateLocalDeviceSession(localSession.userId, localSession.revision, {
      lastVerifiedAt: now,
      updatedAt: now,
    });
    return installation;
  }

  private mapInstallation(row: Row, authenticatedUserId: string): DeviceInstallation {
    const userId = String(row.user_id);
    if (userId !== authenticatedUserId) {
      throw new DeviceRegistrationServiceError('CROSS_USER_ACCESS', 'Device installation does not belong to authenticated user');
    }

    const status = row.status as DeviceInstallation['status'];
    if (status !== 'ACTIVE' && status !== 'REVOKED') {
      throw new DeviceRegistrationServiceError('INVALID_LIFECYCLE', `Unsupported device status: ${String(row.status)}`);
    }

    return {
      id: String(row.id),
      userId,
      installationKey: String(row.installation_key),
      deviceName: row.device_name == null ? null : String(row.device_name),
      appVersion: row.app_version == null ? null : String(row.app_version),
      osVersion: row.os_version == null ? null : String(row.os_version),
      status,
      createdAt: String(row.created_at),
      lastSeenAt: String(row.last_seen_at),
      revokedAt: row.revoked_at == null ? null : String(row.revoked_at),
    };
  }

  private validateInput(authenticatedUserId: string, input: DeviceRegistrationInput): void {
    if (!authenticatedUserId) {
      throw new DeviceRegistrationServiceError('INVALID_INPUT', 'Authenticated user id is required');
    }
    if (!input.installationKey || !input.now) {
      throw new DeviceRegistrationServiceError('INVALID_INPUT', 'Installation key and timestamp are required');
    }
  }
}
