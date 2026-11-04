import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createImportIssue,
  parseCsvRecords,
  type CsvRecord,
  type ImportIssue,
  type RawCityRecord,
  type RawMemberRecord,
  type RawMembershipRecords,
  type RawMentorshipLinkRecord,
  type RawSettingRecord,
} from '@mentor-tree/domain';
import { DataSourceUnavailableError, type MembershipDataSource } from './membershipDataSource';

const MEMBERS_FILE_NAME = 'mentorship_clean.csv';
const SETTINGS_FILE_NAME = 'settings.csv';

const REQUIRED_MEMBER_COLUMNS = [
  'id',
  'name',
  'level',
  'region',
  'city',
  'join_year',
  'mentor_id',
  'mentor_raw',
  'match_status',
];

const MATCH_STATUS_EXACT = 'точний';
const MATCH_STATUS_NO_MENTOR = 'немає ментора';
const MATCH_STATUS_EXTERNAL_MENTOR = 'зовнішній вузол (немає в списку учасників)';

const TRUE_VALUES = new Set(['true', '1', 'так', 'yes']);

export interface CsvMembershipDataSourceOptions {
  /** Directory with mentorship_clean.csv and optionally settings.csv. */
  directory: string;
  /** City reference (SPEC appendix A). Lives apart from private data and is committed. */
  citiesFilePath: string;
}

/**
 * Reads the legacy hand-assembled CSV (SPEC 5.1). Only `mentorship_clean.csv` is used:
 * columns that the domain derives itself (depth, mentees_count, …) are ignored on purpose.
 */
export class CsvMembershipDataSource implements MembershipDataSource {
  readonly description: string;

  constructor(private readonly options: CsvMembershipDataSourceOptions) {
    this.description = `CSV: ${options.directory}`;
  }

  async readMembershipRecords(): Promise<RawMembershipRecords> {
    const membersFile = await this.readRequiredFile(
      join(this.options.directory, MEMBERS_FILE_NAME),
    );
    const { headers, records } = parseCsvRecords(membersFile);
    const missingColumns = REQUIRED_MEMBER_COLUMNS.filter((column) => !headers.includes(column));
    if (missingColumns.length > 0) {
      throw new DataSourceUnavailableError(
        `У файлі ${MEMBERS_FILE_NAME} немає обов'язкових колонок: ${missingColumns.join(', ')}.`,
      );
    }

    const members: RawMemberRecord[] = [];
    const links: RawMentorshipLinkRecord[] = [];
    const sourceIssues: ImportIssue[] = [];
    for (const record of records) {
      readMemberRow(record, members, links, sourceIssues);
    }

    return {
      members,
      links,
      cities: await this.readCities(),
      settings: await this.readSettings(),
      sourceIssues,
    };
  }

  private async readRequiredFile(filePath: string): Promise<string> {
    try {
      return await readFile(filePath, 'utf8');
    } catch (cause) {
      throw new DataSourceUnavailableError(`Не вдалося прочитати файл ${filePath}.`, { cause });
    }
  }

  private async readCities(): Promise<RawCityRecord[]> {
    const text = await this.readRequiredFile(this.options.citiesFilePath);
    return parseCsvRecords(text).records.map((record) => ({
      sourceRow: record.sourceRow,
      ukrainianName: record.values['Місто'] ?? '',
      englishName: record.values['City'] ?? '',
      region: record.values['Регіон'] ?? '',
    }));
  }

  private async readSettings(): Promise<RawSettingRecord[]> {
    let text: string;
    try {
      text = await readFile(join(this.options.directory, SETTINGS_FILE_NAME), 'utf8');
    } catch {
      // Settings are optional in the CSV stage: defaults apply when the file is absent.
      return [];
    }
    return parseCsvRecords(text).records.map((record) => ({
      sourceRow: record.sourceRow,
      key: record.values['Ключ'] ?? '',
      value: record.values['Значення'] ?? '',
    }));
  }
}

function readMemberRow(
  record: CsvRecord,
  members: RawMemberRecord[],
  links: RawMentorshipLinkRecord[],
  sourceIssues: ImportIssue[],
): void {
  const { values, sourceRow } = record;
  const memberId = values['id'] ?? '';
  const fullName = values['name'] ?? '';
  const matchStatus = values['match_status'] ?? '';

  if (matchStatus === MATCH_STATUS_EXTERNAL_MENTOR) {
    sourceIssues.push(
      createImportIssue({
        code: 'EXTERNAL_MENTOR_RECORD',
        memberId,
        memberName: fullName,
        sourceRow,
        description: `«${fullName}» — зовнішній ментор (його немає в списку учасників), тому не додається як учасник.`,
      }),
    );
    return;
  }

  members.push({
    sourceRow,
    memberId,
    fullName,
    city: values['city'] ?? '',
    region: values['region'] ?? '',
    level: values['level'] ?? '',
    leadershipProgramYear: values['join_year'] ?? '',
    // Optional column, absent from the real data; lets demo data exercise hidden members.
    isHidden: TRUE_VALUES.has((values['is_hidden'] ?? '').toLowerCase()),
  });

  if (matchStatus === MATCH_STATUS_NO_MENTOR) return;
  if (matchStatus === MATCH_STATUS_EXACT) {
    links.push({ sourceRow, mentorMemberId: values['mentor_id'] ?? '', menteeMemberId: memberId });
    return;
  }
  sourceIssues.push(
    createImportIssue({
      code: 'UNRESOLVED_MENTOR',
      memberId,
      memberName: fullName,
      sourceRow,
      description: `Ментора «${values['mentor_raw'] ?? ''}» не вдалося визначити (статус: ${matchStatus || 'порожній'}) — зв'язок не додано. Вкажіть ID ментора.`,
    }),
  );
}
