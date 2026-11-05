import type { RawMembershipRecords } from '@mentor-tree/domain';

export interface MembershipDataSource {
  /** Human-readable origin shown in the import report, e.g. a directory or a spreadsheet. */
  readonly description: string;
  readMembershipRecords(): Promise<RawMembershipRecords>;
  /**
   * A cheap value that changes whenever the source data changes, so the watcher knows when to
   * publish again without reading and validating everything.
   */
  readChangeFingerprint(): Promise<string>;
}

/** The source is unreachable or its structure is broken: the whole import must be aborted. */
export class DataSourceUnavailableError extends Error {
  override name = 'DataSourceUnavailableError';
}
