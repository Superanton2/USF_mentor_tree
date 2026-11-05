import { serializeCsv } from '../packages/domain/src/csvSerialization';

/**
 * Deterministic synthetic data in the legacy `mentorship_clean.csv` format.
 * Names are assembled from syllables, so they are invented and never real people.
 */

export const DEMO_SEED = 20261104;
const TREE_SIZES = [
  40, 26, 18, 14, 12, 10, 9, 8, 7, 6, 6, 5, 5, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 2,
];
const TOTAL_MEMBERS = 300;
const MAX_GENERATION = 6;
const CURRENT_YEAR = 2026;

const CSV_HEADER = [
  'id',
  'name',
  'surname',
  'first_name',
  'level',
  'pl',
  'region',
  'city',
  'join_year',
  'mentor_id',
  'mentor_name',
  'mentor_raw',
  'match_status',
  'city_source',
  'in_cycle',
  'depth',
  'mentees_count',
  'is_hidden',
];

const CITY_TO_REGION: [string, string][] = [
  ['Київ', 'Центр'],
  ['Львів', 'Захід'],
  ['Харків', 'Схід'],
  ['Одеса', 'Південь'],
  ['Вінниця', 'Захід'],
  ['Дніпро', 'Південь'],
  ['Тернопіль', 'Захід'],
  ['Суми', 'Схід'],
  ['Чернівці', 'Захід'],
  ['Полтава', 'Схід'],
  ['Луцьк', 'Захід'],
  ['Черкаси', 'Південь'],
];
const LEVELS = [
  'Активіст',
  'Активіст',
  'Активіст',
  'Функціонер',
  'Функціонер',
  'Координатор',
  'Старший координатор',
];
const FIRST_NAME_SYLLABLES = [
  'Ор',
  'Ли',
  'Ма',
  'Ве',
  'Да',
  'Зо',
  'Ре',
  'Та',
  'Ні',
  'Бо',
  'Кі',
  'Ус',
];
const FIRST_NAME_ENDINGS = ['ян', 'мир', 'слав', 'на', 'ся', 'ко', 'ра', 'ла', 'сим', 'дан'];
const SURNAME_SYLLABLES = [
  'Кра',
  'Зелен',
  'Бі',
  'Мор',
  'Дуб',
  'Рос',
  'Сніж',
  'Волод',
  'Лісн',
  'Гір',
  'Тихо',
  'Ясен',
];
const SURNAME_ENDINGS = ['енко', 'ук', 'ський', 'ець', 'ів', 'чук', 'ненко', 'ович'];

const STATUS_EXACT = 'точний';
const STATUS_NO_MENTOR = 'немає ментора';
const STATUS_EXTERNAL = 'зовнішній вузол (немає в списку учасників)';
const STATUS_OUTSIDE_LIST = 'ментор поза списком (додано вузол)';

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

interface DemoMember {
  id: string;
  firstName: string;
  surname: string;
  level: string;
  city: string;
  region: string;
  year: string;
  mentorId: string;
  status: string;
  mentorRaw: string;
  isHidden: boolean;
}

export function generateDemoDataFiles(seed = DEMO_SEED): {
  membersCsv: string;
  settingsCsv: string;
} {
  const random = createRandom(seed);
  const pick = <Item>(items: readonly Item[]): Item =>
    items[Math.floor(random() * items.length)] as Item;
  const usedNames = new Set<string>();
  let nextId = 1;

  const createMember = (overrides: Partial<DemoMember> = {}): DemoMember => {
    let firstName: string;
    let surname: string;
    do {
      firstName = pick(FIRST_NAME_SYLLABLES) + pick(FIRST_NAME_ENDINGS);
      surname = pick(SURNAME_SYLLABLES) + pick(SURNAME_ENDINGS);
    } while (usedNames.has(`${firstName} ${surname}`));
    usedNames.add(`${firstName} ${surname}`);
    const [city, region] = pick(CITY_TO_REGION);
    return {
      id: String(nextId++),
      firstName,
      surname,
      level: pick(LEVELS),
      city,
      region,
      year: String(2020 + Math.floor(random() * (CURRENT_YEAR - 2020 + 1))),
      mentorId: '',
      status: STATUS_NO_MENTOR,
      mentorRaw: '',
      isHidden: false,
      ...overrides,
    };
  };

  const members: DemoMember[] = [];
  for (const treeSize of TREE_SIZES) {
    const founder = createMember();
    const treeMembers = [{ member: founder, generation: 1 }];
    members.push(founder);
    while (treeMembers.length < treeSize) {
      const candidates = treeMembers.filter(({ generation }) => generation < MAX_GENERATION);
      const mentor = pick(candidates);
      const mentee = createMember({ mentorId: mentor.member.id, status: STATUS_EXACT });
      // Some tree members lack a year, level or city, like real data does: the color modes
      // and filters must handle "no data".
      if (members.length % 9 === 4) mentee.year = '';
      if (members.length % 7 === 2) mentee.level = '';
      if (members.length % 11 === 6) {
        mentee.city = '';
        mentee.region = '';
      }
      treeMembers.push({ member: mentee, generation: mentor.generation + 1 });
      members.push(mentee);
    }
  }
  // Force one chain of the maximum depth so the layout tests see the deepest case.
  let chainMentor = members[0] as DemoMember;
  for (let generation = 2; generation <= MAX_GENERATION; generation++) {
    const chainMember = createMember({ mentorId: chainMentor.id, status: STATUS_EXACT });
    members.push(chainMember);
    chainMentor = chainMember;
  }

  addIssueExamples(members, createMember);

  while (members.length < TOTAL_MEMBERS) members.push(createMember());

  // Hidden: a member deep in a tree, a tree founder, and a member without a tree.
  (members[3] as DemoMember).isHidden = true;
  (members[0] as DemoMember).isHidden = true;
  (members[members.length - 1] as DemoMember).isHidden = true;

  const rows = members.map((member) => toRow(member));
  rows.push(...createBrokenRows(members));
  rows.push(...createExternalMentorRows());
  return {
    membersCsv: serializeCsv([CSV_HEADER, ...rows]),
    settingsCsv: serializeCsv(SETTINGS_ROWS),
  };
}

function addIssueExamples(
  members: DemoMember[],
  createMember: (overrides?: Partial<DemoMember>) => DemoMember,
): void {
  const firstExisting = members[10] as DemoMember;
  const selfMentor = createMember();
  selfMentor.mentorId = selfMentor.id;
  selfMentor.status = STATUS_EXACT;

  // A closed loop of three members: each is the other's mentor.
  const first = createMember();
  const second = createMember({ mentorId: first.id, status: STATUS_EXACT });
  const third = createMember({ mentorId: second.id, status: STATUS_EXACT });
  first.mentorId = third.id;
  first.status = STATUS_EXACT;

  members.push(
    selfMentor,
    first,
    second,
    third,
    createMember({ mentorId: '9999', status: STATUS_EXACT, mentorRaw: 'Неіснуючий' }),
    createMember({ mentorId: '2001', status: STATUS_OUTSIDE_LIST, mentorRaw: 'Зовнішній Ментор' }),
    createMember({ status: 'нечіткий збіг прізвища (перевірити)', mentorRaw: 'Схожепрізвище' }),
    createMember({ status: 'сміття/порожньо', mentorRaw: '???' }),
    createMember({ city: 'Вигадане Місто', region: '' }),
    createMember({
      city: firstExisting.city,
      region: firstExisting.region === 'Схід' ? 'Захід' : 'Схід',
    }),
    createMember({ level: 'Невідомий рівень' }),
    createMember({ year: '1999' }),
    createMember({ level: '', year: '' }),
    createMember({ city: '', region: '' }),
  );
}

function createBrokenRows(members: DemoMember[]): string[][] {
  const existing = members[5] as DemoMember;
  const emptyRow = (overrides: Partial<Record<string, string>>): string[] =>
    CSV_HEADER.map((column) => overrides[column] ?? '');
  return [
    emptyRow({ id: '', name: 'Без Ідентифікатора', match_status: STATUS_NO_MENTOR }),
    emptyRow({ id: existing.id, name: 'Дублікат Ідентифікатора', match_status: STATUS_NO_MENTOR }),
    emptyRow({ id: '9000', name: '', match_status: STATUS_NO_MENTOR }),
  ];
}

function createExternalMentorRows(): string[][] {
  return [2001, 2002].map((id) =>
    CSV_HEADER.map((column) => {
      if (column === 'id') return String(id);
      if (column === 'name') return `Зовнішній Ментор ${id - 2000}`;
      if (column === 'match_status') return STATUS_EXTERNAL;
      return '';
    }),
  );
}

function toRow(member: DemoMember): string[] {
  const mentorColumns: Record<string, string> = {
    id: member.id,
    name: `${member.firstName} ${member.surname}`,
    surname: member.surname,
    first_name: member.firstName,
    level: member.level,
    pl: member.year ? `ПЛ ${member.year}` : '',
    region: member.region,
    city: member.city,
    join_year: member.year,
    mentor_id: member.mentorId,
    mentor_raw: member.mentorRaw,
    match_status: member.status,
    is_hidden: member.isHidden ? 'TRUE' : '',
  };
  return CSV_HEADER.map((column) => mentorColumns[column] ?? '');
}

const SETTINGS_ROWS: string[][] = [
  ['Ключ', 'Значення', 'Опис'],
  ['publishRequested', 'TRUE', 'Галочка «Опублікувати зміни»'],
  ['formUrl', 'https://forms.gle/demo-form', 'Посилання на Google Form'],
  ['showMembersWithoutConnections', 'FALSE', 'Показувати кільце учасників без зв’язків'],
  ['largestTreesCount', '10', 'Скільки дерев у списку найбільших'],
  ['labelZoomThreshold', '1.5', 'З якого масштабу видно підписи'],
  ['dimmedOpacity', 'дуже тьмяно', 'Навмисно некоректне значення для демо INVALID_SETTING'],
];
