import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from '../locales';

export type ViewMode = 'graph' | 'lineage';

/** What the address bar says, before it is checked against the data. */
export interface RouteRequest {
  language: Language;
  treeId: string | null;
  memberId: string | null;
  view: ViewMode;
  /** True when the path was not in canonical form (e.g. "/"), so it should be replaced. */
  isRedirectNeeded: boolean;
}

const TREE_PATH_SEGMENT = 'tree';

function isLanguage(value: string | undefined): value is Language {
  return SUPPORTED_LANGUAGES.some((language) => language === value);
}

export function parseRoute(pathname: string, search: string): RouteRequest {
  const segments = pathname.split('/').filter((segment) => segment !== '');
  const firstSegment = segments[0];
  const language = isLanguage(firstSegment) ? firstSegment : DEFAULT_LANGUAGE;
  const remainingSegments = isLanguage(firstSegment) ? segments.slice(1) : segments;
  const treeId =
    remainingSegments[0] === TREE_PATH_SEGMENT && remainingSegments[1] !== undefined
      ? decodeURIComponent(remainingSegments[1])
      : null;
  const parameters = new URLSearchParams(search);
  return {
    language,
    treeId,
    memberId: parameters.get('member'),
    view: parameters.get('view') === 'lineage' ? 'lineage' : 'graph',
    isRedirectNeeded: !isLanguage(firstSegment),
  };
}

export interface RouteState {
  language: Language;
  treeId: string | null;
  memberId: string | null;
  view: ViewMode;
}

export function buildPath(route: RouteState): string {
  const basePath =
    route.treeId === null
      ? `/${route.language}/`
      : `/${route.language}/tree/${encodeURIComponent(route.treeId)}`;
  const parameters = new URLSearchParams();
  if (route.memberId !== null) parameters.set('member', route.memberId);
  if (route.view === 'lineage') parameters.set('view', 'lineage');
  const query = parameters.toString();
  return query === '' ? basePath : `${basePath}?${query}`;
}
