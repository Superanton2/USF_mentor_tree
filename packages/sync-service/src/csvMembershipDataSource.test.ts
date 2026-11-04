import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CsvMembershipDataSource } from './csvMembershipDataSource';
import { DataSourceUnavailableError } from './membershipDataSource';
import { CITIES_CSV, createWorkspace, legacyRow, MEMBERS_HEADER } from './testWorkspace';

async function readFrom(rows: string[], extraFiles: Record<string, string> = {}) {
  const directory = await createWorkspace({
    'mentorship_clean.csv': `\uFEFF${[MEMBERS_HEADER, ...rows].join('\n')}\n`,
    'cities.csv': CITIES_CSV,
    ...extraFiles,
  });
  return new CsvMembershipDataSource({
    directory,
    citiesFilePath: join(directory, 'cities.csv'),
  }).readMembershipRecords();
}

describe('CsvMembershipDataSource', () => {
  it('turns exact matches into links and "no mentor" into nothing', async () => {
    const records = await readFrom([
      legacyRow({ id: '1', name: 'Анна Перша', status: 'немає ментора' }),
      legacyRow({ id: '2', name: 'Борис Другий', mentorId: '1', status: 'точний' }),
    ]);
    expect(records.members.map((member) => member.memberId)).toEqual(['1', '2']);
    expect(records.links).toEqual([{ sourceRow: 3, mentorMemberId: '1', menteeMemberId: '2' }]);
    expect(records.sourceIssues).toEqual([]);
    expect(records.members[1]).toMatchObject({
      fullName: 'Борис Другий',
      leadershipProgramYear: '2023',
    });
  });

  it('skips external mentor rows with EXTERNAL_MENTOR_RECORD', async () => {
    const records = await readFrom([
      legacyRow({ id: '1', name: 'Анна', status: 'немає ментора' }),
      legacyRow({
        id: '2001',
        name: 'Зовнішній Ментор',
        status: 'зовнішній вузол (немає в списку учасників)',
      }),
    ]);
    expect(records.members.map((member) => member.memberId)).toEqual(['1']);
    expect(records.sourceIssues[0]).toMatchObject({
      code: 'EXTERNAL_MENTOR_RECORD',
      memberId: '2001',
      sourceRow: 3,
    });
  });

  it.each([
    'ментор поза списком (додано вузол)',
    'нечіткий збіг прізвища (перевірити)',
    'лише імʼя — 2 кандидатів',
    'не знайдено серед учасників',
    'сміття/порожньо',
    'щось нове',
  ])('does not link and reports UNRESOLVED_MENTOR for status "%s"', async (status) => {
    const records = await readFrom([
      legacyRow({ id: '1', name: 'Анна', mentorId: '2001', status, mentorRaw: 'Денис' }),
    ]);
    expect(records.links).toEqual([]);
    expect(records.members).toHaveLength(1);
    expect(records.sourceIssues[0]?.code).toBe('UNRESOLVED_MENTOR');
    expect(records.sourceIssues[0]?.description).toContain('Денис');
    expect(records.sourceIssues[0]?.description).toContain(status);
  });

  it('reads cities and settings, and treats a missing settings file as defaults', async () => {
    const without = await readFrom([legacyRow({ id: '1', name: 'Анна', status: 'немає ментора' })]);
    expect(without.settings).toEqual([]);
    expect(without.cities).toEqual([
      { sourceRow: 2, ukrainianName: 'Київ', englishName: 'Kyiv', region: 'Центр' },
      { sourceRow: 3, ukrainianName: 'Львів', englishName: 'Lviv', region: 'Захід' },
    ]);

    const withSettings = await readFrom(
      [legacyRow({ id: '1', name: 'Анна', status: 'немає ментора' })],
      { 'settings.csv': 'Ключ,Значення,Опис\nformUrl,https://forms.gle/x,Форма\n' },
    );
    expect(withSettings.settings).toEqual([
      { sourceRow: 2, key: 'formUrl', value: 'https://forms.gle/x' },
    ]);
  });

  it('supports the optional is_hidden column', async () => {
    const directory = await createWorkspace({
      'mentorship_clean.csv': `${MEMBERS_HEADER},is_hidden\n${legacyRow({ id: '1', name: 'Анна', status: 'немає ментора' })},так\n`,
      'cities.csv': CITIES_CSV,
    });
    const records = await new CsvMembershipDataSource({
      directory,
      citiesFilePath: join(directory, 'cities.csv'),
    }).readMembershipRecords();
    expect(records.members[0]?.isHidden).toBe(true);
  });

  it('fails with DataSourceUnavailableError when required columns are missing', async () => {
    const directory = await createWorkspace({
      'mentorship_clean.csv': 'id,name\n1,Анна\n',
      'cities.csv': CITIES_CSV,
    });
    const source = new CsvMembershipDataSource({
      directory,
      citiesFilePath: join(directory, 'cities.csv'),
    });
    await expect(source.readMembershipRecords()).rejects.toThrow(DataSourceUnavailableError);
    await expect(source.readMembershipRecords()).rejects.toThrow(/mentor_id/);
  });

  it('fails with DataSourceUnavailableError when the file is missing', async () => {
    const directory = await createWorkspace({ 'cities.csv': CITIES_CSV });
    const source = new CsvMembershipDataSource({
      directory,
      citiesFilePath: join(directory, 'cities.csv'),
    });
    await expect(source.readMembershipRecords()).rejects.toThrow(DataSourceUnavailableError);
  });
});
