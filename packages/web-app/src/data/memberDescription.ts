import type { GraphIndex, GraphMember } from '@mentor-tree/domain';
import type { Language } from '../locales';

export function findCityName(index: GraphIndex, member: GraphMember, language: Language): string | null {
  if (member.cityKey === null) return null;
  return index.citiesByKey.get(member.cityKey)?.names[language] ?? null;
}
