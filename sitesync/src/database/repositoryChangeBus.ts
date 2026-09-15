export type RepositoryChangeKind = 'attendance' | 'timesheet' | 'command' | 'conflict';

export interface RepositoryChangeEvent {
  kind: RepositoryChangeKind;
  projectId?: string;
  personId?: string;
  commandId?: string;
  at: string;
}

type Listener = (event: RepositoryChangeEvent) => void;

const listeners = new Set<Listener>();

export function subscribeRepositoryChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function emitRepositoryChange(event: RepositoryChangeEvent): void {
  for (const listener of Array.from(listeners)) {
    try { listener(event); } catch { /* observers must never break persistence */ }
  }
}
