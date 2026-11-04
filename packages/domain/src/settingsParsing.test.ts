import { describe, expect, it } from 'vitest';
import { parseSettings, SETTING_DEFINITIONS } from './settingsParsing';

const setting = (key: string, value: string) => ({ sourceRow: 2, key, value });

describe('parseSettings', () => {
  it('returns defaults for every key when nothing is given', () => {
    const { settings, issues } = parseSettings([]);
    expect(issues).toEqual([]);
    expect(Object.keys(settings).sort()).toEqual(Object.keys(SETTING_DEFINITIONS).sort());
    expect(settings.colorHighlight).toBe('#FFD600');
    expect(settings.largestTreesCount).toBe(10);
  });

  it('parses valid values', () => {
    const { settings, issues } = parseSettings([
      setting('publishRequested', 'true'),
      setting('largestTreesCount', '5'),
      setting('labelZoomThreshold', '2,5'),
      setting('colorNode', '#abcdef'),
      setting('formUrl', 'https://forms.gle/abc'),
    ]);
    expect(issues).toEqual([]);
    expect(settings).toMatchObject({
      publishRequested: true,
      largestTreesCount: 5,
      labelZoomThreshold: 2.5,
      colorNode: '#ABCDEF',
      formUrl: 'https://forms.gle/abc',
    });
  });

  it.each([
    ['publishRequested', 'maybe'],
    ['largestTreesCount', '0'],
    ['largestTreesCount', '2.5'],
    ['dimmedOpacity', '3'],
    ['colorNode', 'red'],
    ['formUrl', 'http://insecure.example'],
    ['formUrl', 'javascript:alert(1)'],
    ['formUrl', 'not a url'],
  ])('falls back to default and reports INVALID_SETTING for %s=%s', (key, value) => {
    const { settings, issues } = parseSettings([setting(key, value)]);
    expect(issues.map((issue) => issue.code)).toEqual(['INVALID_SETTING']);
    expect(settings[key as keyof typeof settings]).toBe(
      SETTING_DEFINITIONS[key as keyof typeof SETTING_DEFINITIONS].defaultValue,
    );
  });

  it('ignores unknown keys, service keys and empty values', () => {
    const { issues } = parseSettings([
      setting('lastPublishedAt', 'yesterday'),
      setting('whatever', 'x'),
      setting('colorNode', ''),
      setting('toString', 'x'),
    ]);
    expect(issues).toEqual([]);
  });
});
