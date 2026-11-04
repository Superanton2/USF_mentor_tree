import type { ImportReport } from '@mentor-tree/domain';

export interface ImportReportWriter {
  writeImportReport(report: ImportReport): Promise<void>;
}
