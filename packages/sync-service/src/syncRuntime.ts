import { join } from 'node:path';
import { CsvImportReportWriter } from './csvImportReportWriter';
import { CsvMembershipDataSource } from './csvMembershipDataSource';
import type { EnvironmentConfiguration } from './environmentConfiguration';
import { ReleaseStore } from './releaseStore';
import { runSync, summarizeOutcome } from './syncPipeline';
import { logEvent } from './structuredLogger';

/** Wires the CSV source, report writer and release store from the environment configuration. */
export function createSyncRuntime(configuration: EnvironmentConfiguration) {
  const dataSource = new CsvMembershipDataSource({
    directory: configuration.csvDirectory,
    citiesFilePath: configuration.citiesFilePath,
  });
  const dependencies = {
    dataSource,
    reportWriter: new CsvImportReportWriter(
      join(configuration.reportDirectory, 'import-report.csv'),
    ),
    releaseStore: new ReleaseStore(configuration.publicDataDirectory, configuration.releasesToKeep),
    now: () => new Date(),
  };

  /** Runs one import and logs the result. Returns true when a release was published. */
  async function syncAndLog(): Promise<boolean> {
    const outcome = await runSync(dependencies);
    logEvent(outcome.status === 'published' ? 'info' : 'error', summarizeOutcome(outcome), {
      status: outcome.status,
      memberCount: outcome.report.memberCount,
      treeCount: outcome.report.treeCount,
      issueCount: outcome.report.issues.length,
    });
    return outcome.status === 'published';
  }

  return { dataSource, syncAndLog };
}
