import { parsePersistedAttendancePayload, type SyncTransport, type SyncTransportResponse } from './syncTransport';
import { SyncCommandRepository, type ClaimedSyncCommand } from './syncCommandRepository';
import { classifySyncResponse, computeRetryAt } from './syncRetryPolicy';

export type SyncTriggerReason = 'STARTUP' | 'NETWORK_RESTORED' | 'MANUAL' | 'RETRY';

export interface SyncRunResult {
  status: 'IDLE' | 'SUCCEEDED' | 'RETRY_SCHEDULED' | 'FAILED' | 'CONFLICT' | 'ERROR';
  commandId?: string;
}

export type SyncCommandRepositoryPort = Pick<
  SyncCommandRepository,
  'releaseStaleClaims' | 'claimNextEligible' | 'markSucceeded' | 'markRetryableFailure' | 'markFailed' | 'markConflict'
>;

export interface SyncDeviceContext {
  getDeviceInstallationId(): Promise<string | null>;
}

export class SyncWorker {
  private running: Promise<SyncRunResult> | null = null;
  private started = false;

  constructor(
    private readonly transport: SyncTransport,
    private readonly repository: SyncCommandRepositoryPort = new SyncCommandRepository(),
    private readonly deviceContext?: SyncDeviceContext,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.requestSync('STARTUP');
  }

  stop(): void {
    this.started = false;
  }

  async requestSync(_reason: SyncTriggerReason, now = new Date().toISOString()): Promise<SyncRunResult> {
    return this.runOnce(now);
  }

  async runOnce(now = new Date().toISOString()): Promise<SyncRunResult> {
    if (this.running) return this.running;
    this.running = this.executeOnce(now).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async executeOnce(now: string): Promise<SyncRunResult> {
    try {
      await this.repository.releaseStaleClaims(now);
      const command = await this.repository.claimNextEligible(now);
      if (!command) return { status: 'IDLE' };
      return await this.submitClaim(command, now);
    } catch {
      return { status: 'ERROR' };
    }
  }

  private async submitClaim(command: ClaimedSyncCommand, now: string): Promise<SyncRunResult> {
    let response: SyncTransportResponse;
    try {
      const payload = parsePersistedAttendancePayload(command);
      const deviceInstallationId = await this.deviceContext?.getDeviceInstallationId();
      if (!deviceInstallationId) {
        const message = 'No active local device installation is available for sync';
        if (command.attemptCount >= command.maxAttempts) {
          await this.repository.markFailed(command.commandId, now, 'DEVICE_CONTEXT', message);
          return { status: 'FAILED', commandId: command.commandId };
        }
        await this.repository.markRetryableFailure(
          command.commandId,
          now,
          computeRetryAt(now, command.attemptCount),
          'DEVICE_CONTEXT',
          message,
        );
        return { status: 'RETRY_SCHEDULED', commandId: command.commandId };
      }
      response = await this.transport.submit({
        command,
        aggregate: { projectId: command.projectId, personId: command.personId, workDateUtc: payload.workDateUtc },
        payload,
        deviceInstallationId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transport failure';
      const nextRetryAt = computeRetryAt(now, command.attemptCount);
      if (command.attemptCount >= command.maxAttempts) {
        await this.repository.markFailed(command.commandId, now, 'TRANSPORT', message);
        return { status: 'FAILED', commandId: command.commandId };
      }
      await this.repository.markRetryableFailure(command.commandId, now, nextRetryAt, 'TRANSPORT', message);
      return { status: 'RETRY_SCHEDULED', commandId: command.commandId };
    }

    const classification = classifySyncResponse(response);
    switch (classification) {
      case 'SUCCEEDED': {
        if (response.kind !== 'ACCEPTED' && response.kind !== 'DUPLICATE_ACCEPTED') throw new Error('Invalid success response');
        await this.repository.markSucceeded(command.commandId, now, response.serverRevision, response.result);
        return { status: 'SUCCEEDED', commandId: command.commandId };
      }
      case 'CONFLICT': {
        if (response.kind !== 'REVISION_CONFLICT') throw new Error('Invalid conflict response');
        await this.repository.markConflict(command.commandId, now, response.serverRevision, response.serverPayload, response.reasonCode);
        return { status: 'CONFLICT', commandId: command.commandId };
      }
      case 'FAILED': {
        if (!('code' in response) || !('message' in response)) throw new Error('Invalid failure response');
        await this.repository.markFailed(command.commandId, now, response.code, response.message);
        return { status: 'FAILED', commandId: command.commandId };
      }
      case 'RETRYABLE_FAILURE': {
        if (response.kind !== 'SERVER_ERROR') throw new Error('Invalid retryable response');
        if (command.attemptCount >= command.maxAttempts) {
          await this.repository.markFailed(command.commandId, now, response.code, response.message);
          return { status: 'FAILED', commandId: command.commandId };
        }
        await this.repository.markRetryableFailure(
          command.commandId,
          now,
          computeRetryAt(now, command.attemptCount),
          response.code,
          response.message,
        );
        return { status: 'RETRY_SCHEDULED', commandId: command.commandId };
      }
    }
  }
}
