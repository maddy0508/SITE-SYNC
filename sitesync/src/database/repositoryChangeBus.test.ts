import {
  emitRepositoryChange,
  subscribeRepositoryChanges,
  type RepositoryChangeEvent,
} from './repositoryChangeBus';

describe('repositoryChangeBus', () => {
  const event: RepositoryChangeEvent = {
    kind: 'attendance',
    projectId: 'project-1',
    personId: 'person-1',
    commandId: 'command-1',
    at: '2026-09-15T00:00:00.000Z',
  };

  it('notifies active subscribers with the exact repository event', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeRepositoryChanges(listener);

    emitRepositoryChange(event);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);
    unsubscribe();
  });

  it('stops notifying a listener after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeRepositoryChanges(listener);

    unsubscribe();
    emitRepositoryChange(event);

    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates observer failures so one listener cannot break later observers', () => {
    const failingListener = jest.fn(() => {
      throw new Error('observer failure');
    });
    const healthyListener = jest.fn();
    const unsubscribeFailing = subscribeRepositoryChanges(failingListener);
    const unsubscribeHealthy = subscribeRepositoryChanges(healthyListener);

    expect(() => emitRepositoryChange(event)).not.toThrow();
    expect(failingListener).toHaveBeenCalledTimes(1);
    expect(healthyListener).toHaveBeenCalledWith(event);

    unsubscribeFailing();
    unsubscribeHealthy();
  });
});
