import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ReleaseStore } from './releaseStore';
import { createWorkspace } from './testWorkspace';

const meta = (memberCount: number) => ({ publishedAt: 'x', memberCount });
const at = (second: number) => new Date(Date.UTC(2026, 10, 4, 10, 0, second));
const file = (content: string) => [{ name: 'graph.json', content }];

describe('ReleaseStore', () => {
  it('publishes atomically and exposes the release through `current`', async () => {
    const root = await createWorkspace({});
    const store = new ReleaseStore(root, 5);
    expect(await store.readCurrentMeta()).toBeNull();

    const releaseId = await store.publish(file('{"a":1}'), meta(3), at(1));
    expect(releaseId).toBe('20261104T100001000Z');
    expect(await readFile(join(root, 'current', 'graph.json'), 'utf8')).toBe('{"a":1}');
    expect(await store.readCurrentMeta()).toMatchObject({ releaseId, memberCount: 3 });
    expect((await readdir(join(root, 'releases'))).filter((name) => name.startsWith('.'))).toEqual(
      [],
    );
  });

  it('keeps only the newest releases, never deleting the current one', async () => {
    const root = await createWorkspace({});
    const store = new ReleaseStore(root, 3);
    for (let second = 1; second <= 5; second++)
      await store.publish(file(String(second)), meta(1), at(second));
    expect(await store.listReleaseIds()).toHaveLength(3);
    expect(await readFile(join(root, 'current', 'graph.json'), 'utf8')).toBe('5');
  });

  it('rolls back step by step and fails when there is nothing older', async () => {
    const root = await createWorkspace({});
    const store = new ReleaseStore(root, 5);
    await store.publish(file('one'), meta(1), at(1));
    await store.publish(file('two'), meta(2), at(2));

    await store.rollback();
    expect(await readFile(join(root, 'current', 'graph.json'), 'utf8')).toBe('one');
    expect((await store.readCurrentMeta())?.memberCount).toBe(1);
    await expect(store.rollback()).rejects.toThrow(/Немає попереднього релізу/);
  });

  it('does not delete the current release even if it is older than the kept window', async () => {
    const root = await createWorkspace({});
    const store = new ReleaseStore(root, 2);
    await store.publish(file('1'), meta(1), at(1));
    await store.publish(file('2'), meta(1), at(2));
    await store.rollback();
    await store.publish(file('3'), meta(1), at(3));
    expect(await readFile(join(root, 'current', 'graph.json'), 'utf8')).toBe('3');
  });
});
