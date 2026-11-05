import { setTimeout as waitFor } from 'node:timers/promises';
import { loadEnvironmentFile, readEnvironmentConfiguration } from '../environmentConfiguration';
import { logEvent } from '../structuredLogger';
import { createSyncRuntime } from '../syncRuntime';
import { watchForChanges } from '../syncWatcher';

const MILLISECONDS_PER_SECOND = 1000;

// Long-running mode for Docker: publishes at start and again whenever the data files change,
// so the container never has to be recreated to pick up new data.
loadEnvironmentFile();
const configuration = readEnvironmentConfiguration();
const { dataSource, syncAndLog } = createSyncRuntime(configuration);

let isStopping = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    isStopping = true;
    process.exit(0);
  });
}

logEvent('info', 'Спостерігач даних запущено', {
  intervalSeconds: configuration.csvPollIntervalSeconds,
  directory: configuration.csvDirectory,
});
await watchForChanges({
  readFingerprint: () => dataSource.readChangeFingerprint(),
  onChange: async () => {
    await syncAndLog();
  },
  onError: (error) =>
    logEvent('error', 'Помилка спостерігача даних', {
      error:
        error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
    }),
  intervalMs: configuration.csvPollIntervalSeconds * MILLISECONDS_PER_SECOND,
  waitFor: (milliseconds) => waitFor(milliseconds),
  shouldContinue: () => !isStopping,
});
