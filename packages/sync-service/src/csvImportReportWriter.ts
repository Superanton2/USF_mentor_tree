import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { formatImportReportRows, serializeCsv, type ImportReport } from '@mentor-tree/domain';
import type { ImportReportWriter } from './importReportWriter';

/** Reports contain names, so they are written outside the publicly served directory. */
export class CsvImportReportWriter implements ImportReportWriter {
  constructor(private readonly filePath: string) {}

  async writeImportReport(report: ImportReport): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, serializeCsv(formatImportReportRows(report)), 'utf8');
    await rename(temporaryPath, this.filePath);
  }
}
