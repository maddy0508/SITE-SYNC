import type { AuthenticatedIdentity, IdentityService } from './identityService';
import type { DeviceInstallation, DeviceRegistrationService } from './deviceRegistrationService';

export type ProjectContextErrorCode = 'INVALID_INPUT' | 'CROSS_USER_DEVICE';

export class ProjectContextError extends Error {
  readonly code: ProjectContextErrorCode;

  constructor(code: ProjectContextErrorCode, message: string) {
    super(message);
    this.name = 'ProjectContextError';
    this.code = code;
  }
}

export interface ApplicationContext {
  userId: string;
  profile: AuthenticatedIdentity['profile'];
  person: AuthenticatedIdentity['person'];
  organisation: AuthenticatedIdentity['organisation'];
  memberships: AuthenticatedIdentity['memberships'];
  activeProjectAssignments: AuthenticatedIdentity['projectAssignments'];
  hasProjectAccess: boolean;
  device: DeviceInstallation | null;
}

export class ProjectContext {
  constructor(
    private readonly identityService: Pick<IdentityService, 'resolve'>,
    private readonly deviceRegistrationService: Pick<DeviceRegistrationService, 'get'>,
  ) {}

  async resolve(authenticatedUserId: string): Promise<ApplicationContext> {
    if (!authenticatedUserId) {
      throw new ProjectContextError('INVALID_INPUT', 'Authenticated user id is required');
    }

    const identity = await this.identityService.resolve(authenticatedUserId);
    const device = await this.deviceRegistrationService.get(authenticatedUserId);

    if (device && device.userId !== identity.userId) {
      throw new ProjectContextError('CROSS_USER_DEVICE', 'Device state does not belong to resolved authenticated identity');
    }

    const activeProjectAssignments = identity.projectAssignments.filter((assignment) => assignment.status === 'ACTIVE');

    return {
      userId: identity.userId,
      profile: identity.profile,
      person: identity.person,
      organisation: identity.organisation,
      memberships: identity.memberships,
      activeProjectAssignments,
      hasProjectAccess: activeProjectAssignments.length > 0,
      device,
    };
  }
}
