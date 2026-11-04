import { isAbsolute } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readEnvironmentConfiguration } from './environmentConfiguration';

describe('readEnvironmentConfiguration', () => {
  it('defaults to demo CSV data with absolute paths', () => {
    const configuration = readEnvironmentConfiguration({});
    expect(configuration.csvDirectory.endsWith('data/demo')).toBe(true);
    expect(isAbsolute(configuration.publicDataDirectory)).toBe(true);
    expect(configuration.releasesToKeep).toBe(5);
  });

  it('keeps absolute paths as given', () => {
    expect(readEnvironmentConfiguration({ CSV_DIRECTORY: '/data/private' }).csvDirectory).toBe(
      '/data/private',
    );
  });

  it('rejects unsupported sources and bad retention', () => {
    expect(() => readEnvironmentConfiguration({ DATA_SOURCE: 'google-sheets' })).toThrow(/етап 6/);
    expect(() => readEnvironmentConfiguration({ RELEASES_TO_KEEP: '1' })).toThrow(
      /RELEASES_TO_KEEP/,
    );
  });
});
