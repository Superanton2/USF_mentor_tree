import { createImportIssue, type ImportIssue } from './importIssue';
import { REGION_BY_LABEL, type City, type RawCityRecord } from './membershipTypes';

export interface CityReference {
  /** Lookup by Ukrainian name, as typed in the member rows. */
  findByUkrainianName(ukrainianName: string): City | null;
  cities: City[];
}

function createCityKey(englishName: string): string {
  return englishName
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
}

export function buildCityReference(records: readonly RawCityRecord[]): {
  reference: CityReference;
  issues: ImportIssue[];
} {
  const issues: ImportIssue[] = [];
  const citiesByName = new Map<string, City>();

  for (const record of records) {
    const ukrainianName = record.ukrainianName.trim();
    const region = REGION_BY_LABEL[record.region.trim()];
    if (ukrainianName === '' || record.englishName.trim() === '' || region === undefined) {
      issues.push(
        createImportIssue({
          code: 'UNKNOWN_CITY',
          sourceRow: record.sourceRow,
          description: `Рядок довідника міст пропущено: перевірте назву, англійську назву та регіон («${record.region}»).`,
        }),
      );
      continue;
    }
    if (citiesByName.has(ukrainianName)) continue;
    citiesByName.set(ukrainianName, {
      cityKey: createCityKey(record.englishName),
      names: { uk: ukrainianName, en: record.englishName.trim() },
      region,
    });
  }

  return {
    reference: {
      findByUkrainianName: (ukrainianName) => citiesByName.get(ukrainianName.trim()) ?? null,
      cities: [...citiesByName.values()],
    },
    issues,
  };
}
