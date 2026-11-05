import { loadEnvironmentFile, readEnvironmentConfiguration } from '../environmentConfiguration';
import { logEvent } from '../structuredLogger';
import { createSyncRuntime } from '../syncRuntime';

// `--force` exists for the spreadsheet stage, where a checkbox gates publishing.
// The CSV source has no checkbox, so every run publishes.
loadEnvironmentFile();

try {
  const { syncAndLog } = createSyncRuntime(readEnvironmentConfiguration());
  process.exitCode = (await syncAndLog()) ? 0 : 1;
} catch (error) {
  logEvent('error', 'Неочікувана помилка синхронізації', {
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
  });
  process.exitCode = 1;
}
