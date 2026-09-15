import { emitRepositoryChange, subscribeRepositoryChanges } from '../src/database/repositoryChangeBus';

describe('repository change bus', () => {
  it('delivers persisted-state change notifications and cleans up listeners', () => {
    const events: string[] = [];
    const unsubscribe = subscribeRepositoryChanges(event => events.push(`${event.kind}:${event.commandId ?? ''}`));
    emitRepositoryChange({ kind: 'attendance', projectId: 'p1', personId: 'person1', commandId: 'cmd1', at: '2026-09-12T00:00:00.000Z' });
    unsubscribe();
    emitRepositoryChange({ kind: 'timesheet', projectId: 'p1', personId: 'person1', commandId: 'cmd1', at: '2026-09-12T00:00:01.000Z' });
    expect(events).toEqual(['attendance:cmd1']);
  });

  it('isolates observer failures from other observers', () => {
    const events: string[] = [];
    const unsubscribeBad = subscribeRepositoryChanges(() => { throw new Error('observer failure'); });
    const unsubscribeGood = subscribeRepositoryChanges(event => events.push(event.kind));
    emitRepositoryChange({ kind: 'command', commandId: 'cmd2', at: '2026-09-12T00:00:00.000Z' });
    unsubscribeBad();
    unsubscribeGood();
    expect(events).toEqual(['command']);
  });
});
