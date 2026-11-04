import { describe, expect, it } from 'vitest';
import { loadGraphIndex } from './graphDocumentLoading';

const respond = (body: unknown, status = 200) => () =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('loadGraphIndex', () => {
  it('builds an index for a supported document', async () => {
    const index = await loadGraphIndex(respond({ schemaVersion: 1, members: [], trees: [], cities: [] }));
    expect(index.membersById.size).toBe(0);
  });
  it('rejects HTTP errors and unknown schema versions', async () => {
    await expect(loadGraphIndex(respond({}, 500))).rejects.toThrow('500');
    await expect(loadGraphIndex(respond({ schemaVersion: 99 }))).rejects.toThrow('schemaVersion');
  });
});
