import type { SyncTransport, SyncTransportRequest, SyncTransportResponse } from './syncTransport';

export interface SupabaseRpcClient {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asRevision(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

export class SupabaseSyncTransport implements SyncTransport {
  constructor(private readonly client: SupabaseRpcClient) {}

  async submit(request: SyncTransportRequest): Promise<SyncTransportResponse> {
    const { data, error } = await this.client.rpc('sync_attendance_command', {
      command_id: request.command.commandId,
      device_installation_id: request.deviceInstallationId,
      project_id: request.aggregate.projectId,
      person_id: request.aggregate.personId,
      work_date_utc: request.aggregate.workDateUtc,
      base_revision: request.payload.baseRevision,
      command_type: request.payload.commandType,
      payload: request.payload,
    });

    if (error) {
      return {
        kind: 'SERVER_ERROR',
        code: error.code ?? 'RPC_ERROR',
        message: error.message,
        retryable: true,
      };
    }

    const response = asObject(data);
    if (!response) return this.malformed('RPC_EMPTY_RESPONSE');
    const status = asString(response.status);
    if (!status) return this.malformed('RPC_MISSING_STATUS');

    switch (status) {
      case 'ACCEPTED':
      case 'DUPLICATE_ACCEPTED': {
        const serverRevision = asRevision(response.server_revision);
        const responseCommandId = asString(response.command_id);
        if (serverRevision === null || response.result === undefined || responseCommandId !== request.command.commandId) {
          return this.malformed('RPC_INVALID_SUCCESS');
        }
        return { kind: status, serverRevision, result: response.result };
      }
      case 'REVISION_CONFLICT': {
        const serverRevision = asRevision(response.server_revision);
        const reasonCode = asString(response.reason_code);
        const responseCommandId = asString(response.command_id);
        if (serverRevision === null || !reasonCode || responseCommandId !== request.command.commandId) return this.malformed('RPC_INVALID_CONFLICT');
        const aggregate = response.authoritative_aggregate;
        return {
          kind: 'REVISION_CONFLICT',
          serverRevision,
          serverPayload: aggregate === undefined || aggregate === null ? null : JSON.stringify(aggregate),
          reasonCode,
        };
      }
      case 'AUTHORIZATION_REJECTED':
      case 'VALIDATION_REJECTED':
      case 'DEVICE_REVOKED': {
        const code = asString(response.code);
        const message = asString(response.message);
        if (!code || !message) return this.malformed(`RPC_INVALID_${status}`);
        return { kind: status, code, message };
      }
      case 'SERVER_ERROR': {
        const code = asString(response.code);
        const message = asString(response.message);
        if (!code || !message) return this.malformed('RPC_INVALID_SERVER_ERROR');
        return { kind: 'SERVER_ERROR', code, message, retryable: response.retryable === true };
      }
      default:
        return this.malformed('RPC_UNKNOWN_STATUS');
    }
  }

  private malformed(code: string): SyncTransportResponse {
    return {
      kind: 'SERVER_ERROR',
      code,
      message: 'The sync RPC returned an invalid response',
      retryable: true,
    };
  }
}
