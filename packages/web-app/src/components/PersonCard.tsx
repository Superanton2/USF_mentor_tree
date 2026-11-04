import { findTreeFounder, listMentees, type GraphMember } from '@mentor-tree/domain';
import { findCityName } from '../data/memberDescription';
import { formatCountWithNoun } from '../locales';
import {
  getDisplayName,
  useApplication,
  useSelectionActions,
  useTranslations,
} from '../state/ApplicationContext';

function MemberLink({ member }: { member: GraphMember }) {
  const translations = useTranslations();
  const { selectMember } = useSelectionActions();
  return (
    <button type="button" className="link-button" onClick={() => selectMember(member.memberId)}>
      {getDisplayName(member, translations)}
    </button>
  );
}

/** Right-hand card (bottom sheet on mobile). Shows a member, or a tree when only a tree is chosen. */
export function PersonCard() {
  const { state, index } = useApplication();
  const translations = useTranslations();
  const { clearSelection } = useSelectionActions();
  const member =
    state.selectedMemberId === null ? undefined : index.membersById.get(state.selectedMemberId);
  const tree =
    state.selectedTreeId === null ? undefined : index.treesById.get(state.selectedTreeId);
  if (!member && !tree) return null;

  const founder = tree ? findTreeFounder(index, tree.treeId) : null;
  const formUrl = index.document.settings.formUrl;

  return (
    <aside className="card" aria-label={translations.cardLabel} data-testid="person-card">
      <button
        type="button"
        className="card__close"
        aria-label={translations.closeCard}
        onClick={clearSelection}
      >
        ×
      </button>
      {member ? (
        <MemberDetails member={member} founder={founder} />
      ) : (
        tree &&
        founder && (
          <>
            <h2 className="card__title">
              {founder.fullName === null
                ? translations.hiddenFounderTreeName
                : translations.treeTitle(founder.fullName)}
            </h2>
            <p className="card__line">
              {formatCountWithNoun(state.language, tree.memberCount, translations.memberCount)}
            </p>
            <p className="card__line">
              {translations.treeFounderLabel}: <MemberLink member={founder} />
            </p>
          </>
        )
      )}
      {member && member.treeId === null && !member.isHidden && formUrl && (
        <a className="button" href={formUrl} target="_blank" rel="noreferrer">
          {translations.fillForm}
        </a>
      )}
    </aside>
  );
}

function MemberDetails({ member, founder }: { member: GraphMember; founder: GraphMember | null }) {
  const { state, index } = useApplication();
  const translations = useTranslations();
  const mentor =
    member.mentorMemberId === null ? undefined : index.membersById.get(member.mentorMemberId);
  const mentees = listMentees(index, member.memberId);

  if (member.isHidden) return <h2 className="card__title">{translations.hiddenMemberName}</h2>;

  const details = [
    findCityName(index, member, state.language),
    member.membershipLevel === null ? null : translations.levels[member.membershipLevel],
    member.leadershipProgramYear === null ? null : `ПЛ ${member.leadershipProgramYear}`,
  ].filter(Boolean);

  return (
    <>
      <h2 className="card__title">{member.fullName}</h2>
      {details.length > 0 && <p className="card__details">{details.join(' · ')}</p>}
      {member.treeId === null ? (
        <p className="card__line" role="status">
          {translations.notInTreeMessage}
        </p>
      ) : (
        <>
          <p className="card__line">
            {founder && founder.memberId === member.memberId ? (
              translations.foundedThisTree
            ) : (
              <>
                {translations.treeFounderLabel}: {founder && <MemberLink member={founder} />}
              </>
            )}
          </p>
          <p className="card__line">
            {translations.mentorLabel}:{' '}
            {mentor ? <MemberLink member={mentor} /> : translations.noMentor}
          </p>
          {mentees.length > 0 && (
            <div className="card__line">
              <p className="card__subtitle">{translations.menteesLabel(mentees.length)}</p>
              <ul className="card__list">
                {mentees.map((mentee) => (
                  <li key={mentee.memberId}>
                    <MemberLink member={mentee} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="card__line">{translations.totalDescendants(member.descendantCount)}</p>
        </>
      )}
    </>
  );
}
