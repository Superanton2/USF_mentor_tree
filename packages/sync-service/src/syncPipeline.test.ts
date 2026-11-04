import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CsvImportReportWriter } from './csvImportReportWriter';
import { CsvMembershipDataSource } from './csvMembershipDataSource';
import { DataSourceUnavailableError } from './membershipDataSource';
import { ReleaseStore } from './releaseStore';
import { runSync, summarizeOutcome } from './syncPipeline';
import { CITIES_CSV, createWorkspace, legacyRow, MEMBERS_HEADER } from './testWorkspace';

async function setup(rows: string[], settings?: string) {
  const directory = await createWorkspace({
    'in/mentorship_clean.csv': [MEMBERS_HEADER, ...rows].join('\n') + '\n',
    'in/cities.csv': CITIES_CSV,
    ...(settings ? { 'in/settings.csv': settings } : {}),
  });
  const run = (clockSecond = 1) =>
    runSync({
      dataSource: new CsvMembershipDataSource({
        directory: join(directory, 'in'),
        citiesFilePath: join(directory, 'in/cities.csv'),
      }),
      reportWriter: new CsvImportReportWriter(join(directory, 'reports/import-report.csv')),
      releaseStore: new ReleaseStore(join(directory, 'public'), 5),
      now: () => new Date(Date.UTC(2026, 10, 4, 10, 0, clockSecond)),
    });
  return { directory, run };
}

const rows = [
  legacyRow({ id: '1', name: 'Анна Перша', status: 'немає ментора' }),
  legacyRow({ id: '2', name: 'Борис Другий', mentorId: '1', status: 'точний' }),
  legacyRow({
    id: '3',
    name: 'Віра Третя',
    mentorId: '777',
    status: 'ментор поза списком',
    mentorRaw: 'Хтось',
  }),
  legacyRow({ id: '4', name: 'Гліб Четвертий', status: 'немає ментора' }),
];

describe('runSync', () => {
  it('publishes graph.json and writes the report', async () => {
    const { directory, run } = await setup(rows);
    const outcome = await run();
    expect(outcome.status).toBe('published');
    expect(outcome.report).toMatchObject({ memberCount: 4, linkCount: 1, treeCount: 1 });

    const graph = JSON.parse(await readFile(join(directory, 'public/current/graph.json'), 'utf8'));
    expect(graph.members).toHaveLength(4);
    expect(graph.trees).toEqual([{ treeId: '1', founderMemberId: '1', memberCount: 2 }]);

    const report = await readFile(join(directory, 'reports/import-report.csv'), 'utf8');
    expect(report.startsWith('﻿')).toBe(true);
    expect(report).toContain('UNRESOLVED_MENTOR');
    expect(summarizeOutcome(outcome)).toBe('Успішно, 1 помилок і 0 попереджень у звіті');
  });

  it('a repeated run gives an identical graph apart from publishedAt', async () => {
    const { directory, run } = await setup(rows);
    await run(1);
    const first = JSON.parse(await readFile(join(directory, 'public/current/graph.json'), 'utf8'));
    await run(2);
    const second = JSON.parse(await readFile(join(directory, 'public/current/graph.json'), 'utf8'));
    expect({ ...second, publishedAt: '' }).toEqual({ ...first, publishedAt: '' });
    expect(second.publishedAt).not.toBe(first.publishedAt);
  });

  it('aborts with FATAL when the source is broken and keeps the previous release', async () => {
    const { directory, run } = await setup(rows);
    await run(1);
    const broken = await createWorkspace({
      'mentorship_clean.csv': 'id\n1\n',
      'cities.csv': CITIES_CSV,
    });
    const outcome = await runSync({
      dataSource: new CsvMembershipDataSource({
        directory: broken,
        citiesFilePath: join(broken, 'cities.csv'),
      }),
      reportWriter: new CsvImportReportWriter(join(directory, 'reports/import-report.csv')),
      releaseStore: new ReleaseStore(join(directory, 'public'), 5),
      now: () => new Date(Date.UTC(2026, 10, 4, 10, 0, 2)),
    });
    expect(outcome.status).toBe('aborted');
    expect(outcome.report.issues.at(-1)).toMatchObject({ code: 'FATAL', level: 'fatal' });
    expect(await new ReleaseStore(join(directory, 'public'), 5).listReleaseIds()).toHaveLength(1);
    expect(await readFile(join(directory, 'reports/import-report.csv'), 'utf8')).toContain('FATAL');
  });

  it('aborts when no member is left', async () => {
    const { run } = await setup([legacyRow({ id: '', name: 'Без ID', status: 'немає ментора' })]);
    const outcome = await run();
    expect(outcome.status).toBe('aborted');
    expect(summarizeOutcome(outcome)).toContain('жодного учасника');
  });

  it('aborts when the member count drops by more than the threshold', async () => {
    const { directory, run } = await setup(rows);
    await run(1);
    const shrunk = await createWorkspace({
      'mentorship_clean.csv': [MEMBERS_HEADER, rows[0] as string].join('\n') + '\n',
      'cities.csv': CITIES_CSV,
    });
    const outcome = await runSync({
      dataSource: new CsvMembershipDataSource({
        directory: shrunk,
        citiesFilePath: join(shrunk, 'cities.csv'),
      }),
      reportWriter: new CsvImportReportWriter(join(directory, 'reports/import-report.csv')),
      releaseStore: new ReleaseStore(join(directory, 'public'), 5),
      now: () => new Date(Date.UTC(2026, 10, 4, 10, 0, 2)),
    });
    expect(outcome.status).toBe('aborted');
    expect(summarizeOutcome(outcome)).toContain('впала з 4 до 1');
  });

  it('respects a custom threshold from settings', async () => {
    const { directory, run } = await setup(rows);
    await run(1);
    const shrunk = await createWorkspace({
      'mentorship_clean.csv': [MEMBERS_HEADER, rows[0] as string].join('\n') + '\n',
      'cities.csv': CITIES_CSV,
      'settings.csv': 'Ключ,Значення,Опис\nmemberCountDropAbortPercent,90,\n',
    });
    const outcome = await runSync({
      dataSource: new CsvMembershipDataSource({
        directory: shrunk,
        citiesFilePath: join(shrunk, 'cities.csv'),
      }),
      reportWriter: new CsvImportReportWriter(join(directory, 'reports/import-report.csv')),
      releaseStore: new ReleaseStore(join(directory, 'public'), 5),
      now: () => new Date(Date.UTC(2026, 10, 4, 10, 0, 2)),
    });
    expect(outcome.status).toBe('published');
  });

  it('rethrows unexpected errors instead of swallowing them', async () => {
    const { directory } = await setup(rows);
    await expect(
      runSync({
        dataSource: {
          description: 'broken',
          readMembershipRecords: () => Promise.reject(new TypeError('boom')),
        },
        reportWriter: new CsvImportReportWriter(join(directory, 'reports/r.csv')),
        releaseStore: new ReleaseStore(join(directory, 'public'), 5),
        now: () => new Date(),
      }),
    ).rejects.toThrow('boom');
    expect(new DataSourceUnavailableError('x').name).toBe('DataSourceUnavailableError');
  });
});
