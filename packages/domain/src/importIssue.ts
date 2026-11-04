export const IMPORT_ISSUE_LEVELS = ['warning', 'error', 'fatal'] as const;
export type ImportIssueLevel = (typeof IMPORT_ISSUE_LEVELS)[number];

export type ImportIssueCode =
  | 'MISSING_MEMBER_ID'
  | 'DUPLICATE_MEMBER_ID'
  | 'MISSING_NAME'
  | 'EXTERNAL_MENTOR_RECORD'
  | 'UNRESOLVED_MENTOR'
  | 'MENTOR_NOT_FOUND'
  | 'MENTEE_NOT_FOUND'
  | 'SELF_MENTORSHIP'
  | 'DUPLICATE_LINK'
  | 'MULTIPLE_MENTORS'
  | 'MENTORSHIP_CYCLE'
  | 'UNKNOWN_CITY'
  | 'REGION_MISMATCH'
  | 'UNKNOWN_LEVEL'
  | 'INVALID_PROGRAM_YEAR'
  | 'INVALID_SETTING'
  | 'FATAL';

/** Level of each code is fixed by SPEC 5.3, so callers cannot get it wrong. */
const LEVEL_BY_CODE: Record<ImportIssueCode, ImportIssueLevel> = {
  MISSING_MEMBER_ID: 'error',
  DUPLICATE_MEMBER_ID: 'error',
  MISSING_NAME: 'error',
  EXTERNAL_MENTOR_RECORD: 'error',
  UNRESOLVED_MENTOR: 'error',
  MENTOR_NOT_FOUND: 'error',
  MENTEE_NOT_FOUND: 'error',
  SELF_MENTORSHIP: 'error',
  DUPLICATE_LINK: 'warning',
  MULTIPLE_MENTORS: 'error',
  MENTORSHIP_CYCLE: 'error',
  UNKNOWN_CITY: 'warning',
  REGION_MISMATCH: 'warning',
  UNKNOWN_LEVEL: 'warning',
  INVALID_PROGRAM_YEAR: 'warning',
  INVALID_SETTING: 'warning',
  FATAL: 'fatal',
};

export interface ImportIssue {
  level: ImportIssueLevel;
  code: ImportIssueCode;
  memberId: string;
  memberName: string;
  /** Line (CSV) or row (spreadsheet) in the source; null when not tied to one row. */
  sourceRow: number | null;
  /** Ukrainian text for a non-technical administrator. */
  description: string;
}

export interface ImportIssueInput {
  code: ImportIssueCode;
  description: string;
  memberId?: string;
  memberName?: string;
  sourceRow?: number | null;
}

export function createImportIssue(input: ImportIssueInput): ImportIssue {
  return {
    level: LEVEL_BY_CODE[input.code],
    code: input.code,
    memberId: input.memberId ?? '',
    memberName: input.memberName ?? '',
    sourceRow: input.sourceRow ?? null,
    description: input.description,
  };
}
