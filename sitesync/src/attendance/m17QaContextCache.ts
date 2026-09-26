import type { ApplicationContext } from '../identity/projectContext';

export const M17_QA_CONTEXT_CACHE_TABLE = 'm17_qa_context_cache';

export function serializeM17QaContext(context: ApplicationContext): string {
  return JSON.stringify(context);
}

export function deserializeM17QaContext(serialized: string): ApplicationContext {
  const parsed = JSON.parse(serialized) as ApplicationContext;
  if (!parsed || typeof parsed !== 'object') throw new Error('M17 QA context cache is not an object');
  if (!parsed.userId || parsed.profile?.userId !== parsed.userId) throw new Error('M17 QA context cache has invalid user identity');
  if (!parsed.person?.id || parsed.person.organisationId !== parsed.profile.organisationId) throw new Error('M17 QA context cache has invalid person tenancy');
  if (!parsed.organisation?.id || parsed.organisation.id !== parsed.profile.organisationId) throw new Error('M17 QA context cache has invalid organisation');
  if (!Array.isArray(parsed.activeProjectAssignments) || parsed.activeProjectAssignments.length === 0) throw new Error('M17 QA context cache has no active project assignment');
  if (parsed.activeProjectAssignments.some(assignment => assignment.organisationId !== parsed.profile.organisationId || assignment.personId !== parsed.person.id || assignment.status !== 'ACTIVE')) {
    throw new Error('M17 QA context cache contains an invalid project assignment');
  }
  if (!parsed.device || parsed.device.userId !== parsed.userId) throw new Error('M17 QA context cache has no valid device');
  Object.defineProperty(parsed.device, 'deviceInstallationId', { value: parsed.device.id, enumerable: false, configurable: false, writable: false });
  return parsed;
}
