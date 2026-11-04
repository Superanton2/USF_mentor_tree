import { describe, expect, it } from 'vitest';
import { buildPath, parseRoute } from './locationRouting';

describe('parseRoute', () => {
  it('redirects the root to the default language', () => {
    expect(parseRoute('/', '')).toMatchObject({
      language: 'uk',
      treeId: null,
      isRedirectNeeded: true,
    });
  });

  it('parses tree, member and view', () => {
    expect(parseRoute('/en/tree/12', '?member=15&view=lineage')).toEqual({
      language: 'en',
      treeId: '12',
      memberId: '15',
      view: 'lineage',
      isRedirectNeeded: false,
    });
  });

  it('decodes opaque ids and ignores unknown views', () => {
    expect(parseRoute('/uk/tree/hidden-1', '?view=other')).toMatchObject({
      treeId: 'hidden-1',
      view: 'graph',
    });
  });

  it('falls back to the default language for unknown prefixes', () => {
    expect(parseRoute('/fr/tree/1', '')).toMatchObject({ language: 'uk', isRedirectNeeded: true });
  });
});

describe('buildPath', () => {
  it('round-trips with parseRoute', () => {
    const route = {
      language: 'uk' as const,
      treeId: 'a b',
      memberId: '7',
      view: 'lineage' as const,
    };
    expect(buildPath(route)).toBe('/uk/tree/a%20b?member=7&view=lineage');
    const parsed = parseRoute('/uk/tree/a%20b', '?member=7&view=lineage');
    expect(parsed).toMatchObject({ treeId: 'a b', memberId: '7', view: 'lineage' });
  });

  it('builds the overview path', () => {
    expect(buildPath({ language: 'en', treeId: null, memberId: null, view: 'graph' })).toBe('/en/');
    expect(buildPath({ language: 'en', treeId: null, memberId: '3', view: 'graph' })).toBe(
      '/en/?member=3',
    );
  });
});
