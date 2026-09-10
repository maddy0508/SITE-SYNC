import type { ProjectContextRecord, ProjectRosterRecord } from '../domain/localPersistence';
import type { WorkerQrPayload } from './qrPayload';

export type QrValidationStatus = 'VALID' | 'PROVISIONAL' | 'BLOCKED';

export type QrValidationReason =
  | 'ORG_MISMATCH'
  | 'COMPANY_MISMATCH'
  | 'PERSON_UNASSIGNED'
  | 'MEMBERSHIP_INVALID'
  | 'PROJECT_UNASSIGNED'
  | 'ACTOR_NOT_PERMITTED'
  | 'ROSTER_UNVERIFIABLE';

export interface TrustedMembershipRecord {
  id: string;
  organisationId: string;
  companyId: string;
  personId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface QrRosterResolver {
  getRoster(projectId: string, personId: string): Promise<ProjectRosterRecord | null>;
  getMembership(membershipId: string): Promise<TrustedMembershipRecord | null>;
}

export interface QrValidationResult {
  status: QrValidationStatus;
  reason: QrValidationReason | null;
  payload: WorkerQrPayload;
  personId: string | null;
  displayName: string | null;
  /** True only when trusted cached data was sufficient for an offline provisional result. */
  provisional: boolean;
}

function blocked(payload: WorkerQrPayload, reason: QrValidationReason): QrValidationResult {
  return {
    status: 'BLOCKED',
    reason,
    payload,
    personId: null,
    displayName: null,
    provisional: false,
  };
}

/**
 * Validates a QR as a pointer into trusted local context.
 * QR fields can identify a record, but never confer authority.
 */
export class QrValidationService {
  constructor(private readonly resolver: QrRosterResolver) {}

  async validate(
    payload: WorkerQrPayload,
    context: ProjectContextRecord,
    options: { online: boolean },
  ): Promise<QrValidationResult> {
    if (payload.organisationId !== context.organisationId) {
      return blocked(payload, 'ORG_MISMATCH');
    }

    if (payload.projectId !== undefined && payload.projectId !== context.projectId) {
      return blocked(payload, 'PROJECT_UNASSIGNED');
    }

    const membership = await this.resolver.getMembership(payload.membershipId);
    if (!membership) {
      return options.online
        ? blocked(payload, 'MEMBERSHIP_INVALID')
        : blocked(payload, 'ROSTER_UNVERIFIABLE');
    }

    if (
      membership.status !== 'ACTIVE' ||
      membership.id !== payload.membershipId ||
      membership.organisationId !== context.organisationId ||
      membership.companyId !== payload.companyId ||
      membership.personId !== payload.personId
    ) {
      return blocked(payload, 'MEMBERSHIP_INVALID');
    }

    if (membership.companyId !== context.companyId) {
      return blocked(payload, 'COMPANY_MISMATCH');
    }

    const roster = await this.resolver.getRoster(context.projectId, payload.personId);
    if (!roster) {
      return blocked(payload, 'PERSON_UNASSIGNED');
    }

    if (
      roster.organisationId !== context.organisationId ||
      roster.companyId !== payload.companyId ||
      roster.personId !== payload.personId ||
      roster.projectId !== context.projectId ||
      roster.assignmentStatus !== 'ACTIVE' ||
      roster.membershipStatus !== 'ACTIVE'
    ) {
      return blocked(payload, 'PROJECT_UNASSIGNED');
    }

    const isSelf = context.personId === payload.personId;
    const actorCanScanOthers = context.projectRole === 'SUPERVISOR' || context.projectRole === 'ADMIN';
    if (!isSelf && !actorCanScanOthers) {
      return blocked(payload, 'ACTOR_NOT_PERMITTED');
    }

    const provisional = !options.online;
    return {
      status: provisional ? 'PROVISIONAL' : 'VALID',
      reason: null,
      payload,
      personId: roster.personId,
      displayName: roster.displayName,
      provisional,
    };
  }
}
