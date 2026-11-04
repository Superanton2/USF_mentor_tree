import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importMembership } from '@mentor-tree/domain';
import { generateDemoDataFiles } from '../../../scripts/demoDataGenerator';
import { CsvMembershipDataSource } from './csvMembershipDataSource';

const projectRoot = resolve(import.meta.dirname, '../../..');
const demoDirectory = join(projectRoot, 'data/demo');

// Codes a single-mentor-per-row CSV cannot express; unit tests cover them with direct input.
const CODES_UNREACHABLE_FROM_CSV = [
  'MENTEE_NOT_FOUND',
  'DUPLICATE_LINK',
  'MULTIPLE_MENTORS',
  'FATAL',
];
const ALL_CODES = [
  'MISSING_MEMBER_ID',
  'DUPLICATE_MEMBER_ID',
  'MISSING_NAME',
  'EXTERNAL_MENTOR_RECORD',
  'UNRESOLVED_MENTOR',
  'MENTOR_NOT_FOUND',
  'MENTEE_NOT_FOUND',
  'SELF_MENTORSHIP',
  'DUPLICATE_LINK',
  'MULTIPLE_MENTORS',
  'MENTORSHIP_CYCLE',
  'UNKNOWN_CITY',
  'REGION_MISMATCH',
  'UNKNOWN_LEVEL',
  'INVALID_PROGRAM_YEAR',
  'INVALID_SETTING',
  'FATAL',
];

describe('demo data', () => {
  it('is deterministic and equals the committed files', () => {
    const generated = generateDemoDataFiles();
    expect(generateDemoDataFiles()).toEqual(generated);
    expect(readFileSync(join(demoDirectory, 'mentorship_clean.csv'), 'utf8')).toBe(
      generated.membersCsv,
    );
    expect(readFileSync(join(demoDirectory, 'settings.csv'), 'utf8')).toBe(generated.settingsCsv);
  });

  it('has the agreed size and covers every issue code the CSV can produce', async () => {
    const raw = await new CsvMembershipDataSource({
      directory: demoDirectory,
      citiesFilePath: join(projectRoot, 'data/reference/cities.csv'),
    }).readMembershipRecords();
    const result = importMembership(raw, { currentYear: 2026, publishedAt: 'test' });

    const presentCodes = new Set(result.issues.map((issue) => issue.code));
    const expectedCodes = ALL_CODES.filter((code) => !CODES_UNREACHABLE_FROM_CSV.includes(code));
    expect([...presentCodes].sort()).toEqual([...expectedCodes].sort());

    expect(result.members.length).toBeGreaterThanOrEqual(290);
    expect(result.forest.trees.length).toBeGreaterThanOrEqual(25);
    expect(Math.max(...result.forest.generationByMemberId.values())).toBe(6);
    expect(result.members.some((member) => member.isHidden)).toBe(true);
  });
});
