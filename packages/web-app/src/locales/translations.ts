import type { MembershipLevel, Region } from '@mentor-tree/domain';

export type Language = 'uk' | 'en';
export const SUPPORTED_LANGUAGES: readonly Language[] = ['uk', 'en'];
export const DEFAULT_LANGUAGE: Language = 'uk';

export interface PluralForms {
  one: string;
  few?: string;
  many?: string;
  other: string;
}

/** Every interface string lives here; a missing key in any language is a compile error. */
export interface Translations {
  htmlTitle: string;
  siteName: string;
  logoDescription: string;
  languageSwitchLabel: string;
  searchPlaceholder: string;
  searchLabel: string;
  searchResultsLabel: string;
  searchNothingFound: string;
  resultNotInTree: string;
  resultTree: (founderName: string) => string;
  fillForm: string;
  loading: string;
  loadError: string;
  retry: string;
  emptyData: string;
  treeNotFound: string;
  dismiss: string;
  disclaimerBeforeLink: string;
  disclaimerLink: string;
  dataUpdatedOn: (formattedDate: string) => string;
  hiddenMemberName: string;
  hiddenFounderTreeName: string;
  treeTitle: (founderName: string) => string;
  memberCount: PluralForms;
  cardLabel: string;
  closeCard: string;
  foundedThisTree: string;
  treeFounderLabel: string;
  mentorLabel: string;
  noMentor: string;
  menteesLabel: (count: number) => string;
  totalDescendants: (count: number) => string;
  notInTreeMessage: string;
  graphLabel: string;
  levels: Record<MembershipLevel, string>;
  regions: Record<Region, string>;
}
