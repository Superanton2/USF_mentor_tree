import { describe, expect, it } from 'vitest';
import { watchForChanges } from './syncWatcher';

function runWatcher(fingerprints: (string | Error)[], failOnChangeAt: number[] = []) {
  const events: string[] = [];
  let tick = 0;
  let changeCalls = 0;
  return watchForChanges({
    readFingerprint: () => {
      const next = fingerprints[tick];
      if (next instanceof Error) return Promise.reject(next);
      return Promise.resolve(next ?? 'unchanged');
    },
    onChange: () => {
      changeCalls++;
      events.push(`publish@${tick}`);
      return failOnChangeAt.includes(changeCalls)
        ? Promise.reject(new Error('publish failed'))
        : Promise.resolve();
    },
    onError: (error) => events.push(`error@${tick}:${(error as Error).message}`),
    intervalMs: 10,
    waitFor: () => {
      tick++;
      return Promise.resolve();
    },
    shouldContinue: () => tick < fingerprints.length,
  }).then(() => events);
}

describe('watchForChanges', () => {
  it('publishes at start and only when the fingerprint changes', async () => {
    expect(await runWatcher(['a', 'a', 'b', 'b', 'b', 'c'])).toEqual([
      'publish@0',
      'publish@2',
      'publish@5',
    ]);
  });

  it('keeps going after a failing check and retries after a failing publish', async () => {
    expect(await runWatcher(['a', new Error('disk'), 'a', 'b', 'b'], [2])).toEqual([
      'publish@0',
      'error@1:disk',
      'publish@3',
      'error@3:publish failed',
      'publish@4',
    ]);
  });

  it('does nothing when told to stop immediately', async () => {
    expect(await runWatcher([])).toEqual([]);
  });
});
