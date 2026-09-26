export type RepositoryChangeKind = 'attendance' | 'timesheet' | 'command' | 'conflict';

export interface RepositoryChangeEvent {
  kind: RepositoryChangeKind;
  projectId?: string;
  personId?: string;
  commandId: string;
  at: string;
}

type RepositoryChangeEventInput = Omit<RepositoryChangeEvent, 'commandId'> & { commandId?: string };
type Listener = (event: RepositoryChangeEvent) => void;

const listeners = new Set<Listener>();

export function subscribeRepositoryChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function emitRepositoryChange(event: RepositoryChangeEventInput): void {
  const normalized: RepositoryChangeEvent = { ...event, commandId: event.commandId ?? '' };
  for (const listener of Array.from(listeners)) {
    try { listener(normalized); } catch { /* observers must never break persistence */ }
  }
}
