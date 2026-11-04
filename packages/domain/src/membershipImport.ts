import { buildCityReference } from './cityReference';
import { buildGraphDocument, type GraphDocument } from './graphDocument';
import { createImportIssue, type ImportIssue } from './importIssue';
import { validateLinks } from './linkValidation';
import { validateMembers } from './memberValidation';
import type {
  Member,
  MentorshipLink,
  RawCityRecord,
  RawMemberRecord,
  RawMentorshipLinkRecord,
  RawSettingRecord,
} from './membershipTypes';
import { parseSettings, type Settings } from './settingsParsing';
import { buildMentorshipForest, type MentorshipForest } from './treeBuilding';

/** Everything a data source hands over, still unvalidated. */
export interface RawMembershipRecords {
  members: RawMemberRecord[];
  links: RawMentorshipLinkRecord[];
  cities: RawCityRecord[];
  settings: RawSettingRecord[];
  /** Problems the source itself found while reading (e.g. legacy CSV rows it had to skip). */
  sourceIssues: ImportIssue[];
}

export interface MembershipImportResult {
  members: Member[];
  links: MentorshipLink[];
  forest: MentorshipForest;
  settings: Settings;
  issues: ImportIssue[];
  /** Absent when the import is fatal. */
  graphDocument: GraphDocument | null;
}

export interface MembershipImportOptions {
  currentYear: number;
  publishedAt: string;
}

/** Validates raw records and derives trees. A single bad record never blocks the rest. */
export function importMembership(
  raw: RawMembershipRecords,
  options: MembershipImportOptions,
): MembershipImportResult {
  const { reference, issues: cityIssues } = buildCityReference(raw.cities);
  const { settings, issues: settingIssues } = parseSettings(raw.settings);
  const memberResult = validateMembers(raw.members, reference, options.currentYear);
  const linkResult = validateLinks(raw.links, memberResult.members);
  const forest = buildMentorshipForest(memberResult.members, linkResult.links);

  const issues = [
    ...raw.sourceIssues,
    ...cityIssues,
    ...memberResult.issues,
    ...linkResult.issues,
    ...settingIssues,
  ];

  if (memberResult.members.length === 0) {
    issues.push(
      createImportIssue({
        code: 'FATAL',
        description: 'Після перевірки не лишилося жодного учасника — публікацію скасовано.',
      }),
    );
    return {
      members: [],
      links: [],
      forest,
      settings,
      issues,
      graphDocument: null,
    };
  }

  return {
    members: memberResult.members,
    links: linkResult.links,
    forest,
    settings,
    issues,
    graphDocument: buildGraphDocument({
      members: memberResult.members,
      forest,
      referenceCities: reference.cities,
      settings,
      publishedAt: options.publishedAt,
    }),
  };
}
