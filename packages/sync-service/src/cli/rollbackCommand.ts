import { loadEnvironmentFile, readEnvironmentConfiguration } from '../environmentConfiguration';
import { ReleaseStore } from '../releaseStore';
import { logEvent } from '../structuredLogger';

loadEnvironmentFile();
const configuration = readEnvironmentConfiguration();

try {
  const releaseId = await new ReleaseStore(
    configuration.publicDataDirectory,
    configuration.releasesToKeep,
  ).rollback();
  logEvent('info', 'Відкат виконано', { releaseId });
} catch (error) {
  logEvent('error', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
