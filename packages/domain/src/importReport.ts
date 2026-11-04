import type { ImportIssue } from './importIssue';

export interface ImportReport {
  generatedAt: string;
  source: string;
  memberCount: number;
  linkCount: number;
  treeCount: number;
  issues: ImportIssue[];
}

const LEVEL_LABELS = { warning: 'Попередження', error: 'Помилка', fatal: 'FATAL' } as const;

export function countIssuesByLevel(issues: readonly ImportIssue[]): {
  errorCount: number;
  warningCount: number;
} {
  return {
    errorCount: issues.filter((issue) => issue.level !== 'warning').length,
    warningCount: issues.filter((issue) => issue.level === 'warning').length,
  };
}

/** One layout for the CSV file and the spreadsheet tab (SPEC 5.3): summary, blank row, issues. */
export function formatImportReportRows(report: ImportReport): string[][] {
  const { errorCount, warningCount } = countIssuesByLevel(report.issues);
  return [
    ['Час', report.generatedAt],
    ['Джерело', report.source],
    ['Учасників', String(report.memberCount)],
    ['Зв’язків', String(report.linkCount)],
    ['Дерев', String(report.treeCount)],
    ['Помилок', String(errorCount)],
    ['Попереджень', String(warningCount)],
    [],
    ['Рівень', 'Код', 'ID учасника', 'Ім’я', 'Рядок у джерелі', 'Опис'],
    ...report.issues.map((issue) => [
      LEVEL_LABELS[issue.level],
      issue.code,
      issue.memberId,
      issue.memberName,
      issue.sourceRow === null ? '' : String(issue.sourceRow),
      issue.description,
    ]),
  ];
}
