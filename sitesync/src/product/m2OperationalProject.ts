export type M2LocationState = 'VERIFIED' | 'UNVERIFIED' | 'NOT_PERMITTED' | 'UNAVAILABLE';
export type M2WorkFrontStatus = 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETE' | 'BLOCKED';
export type M2PreStartState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'BLOCKED' | 'UNAVAILABLE';
export type M2SwmsState = 'NOT_REQUIRED' | 'REQUIRED' | 'CONFIRMED' | 'EXPIRED' | 'UNAVAILABLE';
export type M2PermitState = 'NONE' | 'REQUESTED' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'UNAVAILABLE';

export interface M2OperationalSiteInput {
  siteId: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  locationState: M2LocationState;
  organisationId?: string;
  companyId?: string;
}

export interface M2OperationalShiftInput {
  shiftId: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface M2OperationalWorkFrontInput {
  id: string;
  name: string;
  status: M2WorkFrontStatus;
  plannedQuantity: number;
  completedQuantity: number;
  unit: string;
  crewId: string | null;
  organisationId?: string;
  companyId?: string;
}

export interface M2OperationalCrewInput {
  id: string;
  name: string;
  supervisorPersonId: string | null;
  workerCount: number;
  organisationId?: string;
  companyId?: string;
}

export interface M2OperationalSafetyInput {
  preStart: M2PreStartState;
  swms: M2SwmsState;
  permits: M2PermitState;
  hazards: string[];
  restrictions: string[];
  warnings: string[];
}

export interface M2OperationalActionsInput {
  blockers: string[];
  outstanding: string[];
  upcoming: string[];
}

export interface M2OperationalProjectInput {
  projectId: string;
  organisationId: string;
  companyId: string;
  site: M2OperationalSiteInput;
  shift: M2OperationalShiftInput | null;
  workFronts: M2OperationalWorkFrontInput[];
  crews: M2OperationalCrewInput[];
  safety: M2OperationalSafetyInput;
  actions: M2OperationalActionsInput;
}

export interface M2OperationalWorkFront extends M2OperationalWorkFrontInput {
  progressPercent: number;
}

export interface M2OperationalProject extends Omit<M2OperationalProjectInput, 'workFronts'> {
  workFronts: M2OperationalWorkFront[];
}

function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid quantity: ${field}`);
}

function assertTenant(value: string | undefined, expected: string): void {
  if (value !== undefined && value !== expected) throw new Error('M2 operational projection tenant mismatch');
}

function progressPercent(planned: number, completed: number): number {
  assertNonNegative(planned, 'plannedQuantity');
  assertNonNegative(completed, 'completedQuantity');
  if (completed > planned) throw new Error('Invalid quantity: completedQuantity exceeds plannedQuantity');
  if (planned === 0) return 0;
  return Math.round((completed / planned) * 10000) / 100;
}

/**
 * Validates and normalises persisted operational records for TODAY/MAP.
 * This function deliberately does not invent missing operational state.
 */
export function buildM2OperationalProject(input: M2OperationalProjectInput): M2OperationalProject {
  assertTenant(input.site.organisationId, input.organisationId);
  assertTenant(input.site.companyId, input.companyId);

  const workFronts = input.workFronts.map(front => {
    assertTenant(front.organisationId, input.organisationId);
    assertTenant(front.companyId, input.companyId);
    return { ...front, progressPercent: progressPercent(front.plannedQuantity, front.completedQuantity) };
  });

  const crews = input.crews.map(crew => {
    assertTenant(crew.organisationId, input.organisationId);
    assertTenant(crew.companyId, input.companyId);
    assertNonNegative(crew.workerCount, 'workerCount');
    return { ...crew };
  });

  const crewIds = new Set(crews.map(crew => crew.id));
  for (const front of workFronts) {
    if (front.crewId !== null && !crewIds.has(front.crewId)) throw new Error(`Unknown crew for work front: ${front.id}`);
  }

  return { ...input, workFronts, crews };
}
