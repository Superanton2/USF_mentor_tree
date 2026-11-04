import {
  countIssuesByLevel,
  createImportIssue,
  importMembership,
  type ImportIssue,
  type ImportReport,
  type RawMembershipRecords,
} from '@mentor-tree/domain';
import { DataSourceUnavailableError, type MembershipDataSource } from './membershipDataSource';
import type { ImportReportWriter } from './importReportWriter';
import type { ReleaseStore } from './releaseStore';

export interface SyncDependencies {
  dataSource: MembershipDataSource;
  reportWriter: ImportReportWriter;
  releaseStore: ReleaseStore;
  now: () => Date;
}

export type SyncOutcome =
  | { status: 'published'; releaseId: string; report: ImportReport }
  | { status: 'aborted'; reason: string; report: ImportReport };

const DEFAULT_DROP_ABORT_PERCENT = 50;

/** read → validate → build trees → protect against data loss → publish → report. */
export async function runSync(dependencies: SyncDependencies): Promise<SyncOutcome> {
  const { dataSource, reportWriter, releaseStore, now } = dependencies;
  const startedAt = now();

  const abort = async (
    reason: string,
    issues: ImportIssue[],
    memberCount = 0,
  ): Promise<SyncOutcome> => {
    const fatalIssue = createImportIssue({
      code: 'FATAL',
      description: `Публікацію скасовано: ${reason}`,
    });
    const report = buildReport(dataSource, startedAt, { memberCount, linkCount: 0, treeCount: 0 }, [
      ...issues.filter((issue) => issue.code !== 'FATAL'),
      fatalIssue,
    ]);
    await reportWriter.writeImportReport(report);
    return { status: 'aborted', reason, report };
  };

  let rawRecords: RawMembershipRecords;
  try {
    rawRecords = await dataSource.readMembershipRecords();
  } catch (error) {
    if (error instanceof DataSourceUnavailableError) return abort(error.message, []);
    throw error;
  }

  const result = importMembership(rawRecords, {
    currentYear: startedAt.getUTCFullYear(),
    publishedAt: startedAt.toISOString(),
  });
  if (result.graphDocument === null) {
    return abort('після перевірки не лишилося жодного учасника.', result.issues);
  }

  const previousMeta = await releaseStore.readCurrentMeta();
  const abortPercent = result.settings.memberCountDropAbortPercent ?? DEFAULT_DROP_ABORT_PERCENT;
  if (previousMeta && previousMeta.memberCount > 0) {
    const dropPercent =
      ((previousMeta.memberCount - result.members.length) / previousMeta.memberCount) * 100;
    if (dropPercent > abortPercent) {
      return abort(
        `кількість учасників впала з ${previousMeta.memberCount} до ${result.members.length} (більше ніж на ${abortPercent} %). Схоже, таблицю випадково очищено; на сайті лишається попередній реліз.`,
        result.issues,
        result.members.length,
      );
    }
  }

  const releaseId = await releaseStore.publish(
    [{ name: 'graph.json', content: JSON.stringify(result.graphDocument) }],
    { publishedAt: result.graphDocument.publishedAt, memberCount: result.members.length },
    startedAt,
  );
  const report = buildReport(
    dataSource,
    startedAt,
    {
      memberCount: result.members.length,
      linkCount: result.links.length,
      treeCount: result.forest.trees.length,
    },
    result.issues,
  );
  await reportWriter.writeImportReport(report);
  return { status: 'published', releaseId, report };
}

function buildReport(
  dataSource: MembershipDataSource,
  generatedAt: Date,
  counts: { memberCount: number; linkCount: number; treeCount: number },
  issues: ImportIssue[],
): ImportReport {
  return {
    generatedAt: generatedAt.toISOString(),
    source: dataSource.description,
    ...counts,
    issues,
  };
}

export function summarizeOutcome(outcome: SyncOutcome): string {
  const { errorCount, warningCount } = countIssuesByLevel(outcome.report.issues);
  return outcome.status === 'published'
    ? `Успішно, ${errorCount} помилок і ${warningCount} попереджень у звіті`
    : `Скасовано: ${outcome.reason}`;
}
