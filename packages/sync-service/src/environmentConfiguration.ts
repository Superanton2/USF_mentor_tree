import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DEFAULT_RELEASES_TO_KEEP = 5;

export interface EnvironmentConfiguration {
  dataSource: 'csv';
  csvDirectory: string;
  citiesFilePath: string;
  publicDataDirectory: string;
  reportDirectory: string;
  releasesToKeep: number;
}

function resolveFromProjectRoot(path: string): string {
  return isAbsolute(path) ? path : resolve(PROJECT_ROOT, path);
}

/**
 * Variables are described in SPEC 9.2. Paths are relative to the repository root, not to the
 * current directory, because npm runs workspace scripts from the package directory.
 */
export function readEnvironmentConfiguration(environment = process.env): EnvironmentConfiguration {
  const dataSource = environment['DATA_SOURCE'] ?? 'csv';
  if (dataSource !== 'csv') {
    throw new Error(`DATA_SOURCE="${dataSource}" ще не підтримується (Google Sheets — етап 6).`);
  }
  const releasesToKeep = Number(environment['RELEASES_TO_KEEP'] ?? DEFAULT_RELEASES_TO_KEEP);
  if (!Number.isInteger(releasesToKeep) || releasesToKeep < 2) {
    throw new Error('RELEASES_TO_KEEP має бути цілим числом не менше 2.');
  }
  return {
    dataSource,
    csvDirectory: resolveFromProjectRoot(environment['CSV_DIRECTORY'] ?? 'data/demo'),
    citiesFilePath: resolveFromProjectRoot(
      environment['CITIES_FILE'] ?? 'data/reference/cities.csv',
    ),
    publicDataDirectory: resolveFromProjectRoot(
      environment['PUBLIC_DATA_DIRECTORY'] ?? 'public-data',
    ),
    reportDirectory: resolveFromProjectRoot(environment['REPORT_DIRECTORY'] ?? 'reports'),
    releasesToKeep,
  };
}

export function loadEnvironmentFile(): void {
  const environmentFilePath = resolve(PROJECT_ROOT, '.env');
  if (existsSync(environmentFilePath)) process.loadEnvFile(environmentFilePath);
}
