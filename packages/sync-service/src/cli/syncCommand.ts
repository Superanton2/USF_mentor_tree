import { join } from 'node:path';
import { CsvImportReportWriter } from '../csvImportReportWriter';
import { CsvMembershipDataSource } from '../csvMembershipDataSource';
import { loadEnvironmentFile, readEnvironmentConfiguration } from '../environmentConfiguration';
import { ReleaseStore } from '../releaseStore';
import { logEvent } from '../structuredLogger';
import { runSync, summarizeOutcome } from '../syncPipeline';

// `--force` exists for the spreadsheet stage, where a checkbox gates publishing.
// The CSV source has no checkbox, so every run publishes.
loadEnvironmentFile();
const configuration = readEnvironmentConfiguration();

try {
  const outcome = await runSync({
    dataSource: new CsvMembershipDataSource({
      directory: configuration.csvDirectory,
      citiesFilePath: configuration.citiesFilePath,
    }),
    reportWriter: new CsvImportReportWriter(
      join(configuration.reportDirectory, 'import-report.csv'),
    ),
    releaseStore: new ReleaseStore(configuration.publicDataDirectory, configuration.releasesToKeep),
    now: () => new Date(),
  });
  logEvent(outcome.status === 'published' ? 'info' : 'error', summarizeOutcome(outcome), {
    status: outcome.status,
    memberCount: outcome.report.memberCount,
    treeCount: outcome.report.treeCount,
    issueCount: outcome.report.issues.length,
  });
  process.exitCode = outcome.status === 'published' ? 0 : 1;
} catch (error) {
  logEvent('error', 'Неочікувана помилка синхронізації', {
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
  });
  process.exitCode = 1;
}
