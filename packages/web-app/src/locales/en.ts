import type { Translations } from './translations';

export const en: Translations = {
  htmlTitle: 'USF Mentor Tree',
  siteName: 'USF Mentor Tree',
  logoDescription: 'USF logo',
  languageSwitchLabel: 'Language',
  searchPlaceholder: 'Find yourself by first or last name',
  searchLabel: 'Search for a member',
  searchResultsLabel: 'Search results',
  searchNothingFound:
    'Nobody found. Your data may not be here yet — fill in the form and we will add you in the next update',
  resultNotInTree: 'Not in a tree yet',
  resultTree: (founderName) => `${founderName}'s tree`,
  fillForm: 'Fill in the form',
  loading: 'Loading…',
  loadError: 'Could not load the data',
  retry: 'Try again',
  emptyData:
    'There are no mentorship trees yet. Fill in the form and we will add you in the next update',
  treeNotFound: 'Tree not found',
  dismiss: 'Dismiss message',
  disclaimerBeforeLink:
    "Data is incomplete and may contain errors. Can't find yourself or spotted a mistake? ",
  disclaimerLink: 'Fill in the form',
  dataUpdatedOn: (formattedDate) => `Data updated ${formattedDate}`,
  hiddenMemberName: 'USF member',
  hiddenFounderTreeName: "USF member's tree",
  treeTitle: (founderName) => `${founderName}'s tree`,
  memberCount: { one: 'member', other: 'members' },
  cardLabel: 'Member card',
  closeCard: 'Close card',
  foundedThisTree: 'Started this tree',
  treeFounderLabel: 'Tree founder',
  mentorLabel: 'Mentor',
  noMentor: '—',
  menteesLabel: (count) => `Mentees (${count})`,
  totalDescendants: (count) => `Total descendants: ${count}`,
  notInTreeMessage:
    'Not in a tree yet. Our data is incomplete — if you had a mentor or have mentees, fill in the form and we will add you in the next update',
  graphLabel: 'Mentorship graph',
  levels: {
    activist: 'Activist',
    functionary: 'Functionary',
    coordinator: 'Coordinator',
    'senior-coordinator': 'Senior Coordinator',
  },
  regions: { west: 'West', center: 'Center', east: 'East', south: 'South' },
};
