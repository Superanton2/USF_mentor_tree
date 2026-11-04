import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const CITIES_CSV = 'Місто,City,Регіон\nКиїв,Kyiv,Центр\nЛьвів,Lviv,Захід\n';

export const MEMBERS_HEADER =
  'id,name,surname,first_name,level,pl,region,city,join_year,mentor_id,mentor_name,mentor_raw,match_status,city_source,in_cycle,depth,mentees_count';

/** Builds one legacy CSV line; only the columns the importer reads are meaningful. */
export function legacyRow(fields: {
  id: string;
  name: string;
  mentorId?: string;
  status: string;
  mentorRaw?: string;
  city?: string;
  level?: string;
  year?: string;
  region?: string;
}): string {
  return [
    fields.id,
    fields.name,
    '',
    '',
    fields.level ?? 'Активіст',
    '',
    fields.region ?? '',
    fields.city ?? 'Київ',
    fields.year ?? '2023',
    fields.mentorId ?? '',
    '',
    fields.mentorRaw ?? '',
    fields.status,
    '',
    '',
    '',
    '',
  ].join(',');
}

export async function createWorkspace(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'mentor-tree-test-'));
  for (const [name, content] of Object.entries(files)) {
    await mkdir(join(directory, name, '..'), { recursive: true });
    await writeFile(join(directory, name), content, 'utf8');
  }
  return directory;
}
