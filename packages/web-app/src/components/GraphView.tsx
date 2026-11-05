import { useEffect, useRef } from 'react';
import { useMemberStyles } from '../appearance/AppearanceContext';
import { createForceGraphRenderer } from '../graph/forceGraphRenderer';
import type { GraphRenderer } from '../graph/GraphRenderer';
import { useApplication, useSelectionActions, useTranslations } from '../state/ApplicationContext';

const DESKTOP_MIN_WIDTH = 768;
const CARD_WIDTH_WITH_GAP = 392;
const TOP_INSET = 110;
const BOTTOM_INSET = 70;
/** Share of the screen the mobile bottom sheet may cover (see .card in application.css). */
const MOBILE_CARD_HEIGHT_SHARE = 0.55;

/** What the camera must keep clear: search on top, disclaimer below, and the card when open. */
function measureInterfaceInsets(isCardOpen: boolean) {
  const isDesktop = window.innerWidth >= DESKTOP_MIN_WIDTH;
  return {
    top: TOP_INSET,
    left: 0,
    right: isCardOpen && isDesktop ? CARD_WIDTH_WITH_GAP : 0,
    bottom:
      isCardOpen && !isDesktop
        ? Math.round(window.innerHeight * MOBILE_CARD_HEIGHT_SHARE)
        : BOTTOM_INSET,
  };
}

export function GraphView() {
  const { state, index } = useApplication();
  const translations = useTranslations();
  const { selectMember, clearSelection } = useSelectionActions();
  const memberStyles = useMemberStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const { settings, members } = index.document;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const visibleMembers = members.filter(
      (member) => member.treeId !== null || settings.showMembersWithoutConnections,
    );
    const renderer = createForceGraphRenderer(
      container,
      visibleMembers.map((member) => ({
        memberId: member.memberId,
        treeId: member.treeId,
        label: member.fullName,
        descendantCount: member.descendantCount,
      })),
      members.flatMap((member) =>
        member.mentorMemberId === null
          ? []
          : [{ mentorMemberId: member.mentorMemberId, menteeMemberId: member.memberId }],
      ),
      { settings },
      { onMemberClick: selectMember, onBackgroundClick: clearSelection },
    );
    rendererRef.current = renderer;
    // Development-only handle so end-to-end tests can read node positions (stripped from production builds).
    if (import.meta.env.DEV)
      (window as unknown as { __graphRenderer?: GraphRenderer }).__graphRenderer = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [members, settings, selectMember, clearSelection]);

  useEffect(() => {
    rendererRef.current?.setAppearance({
      memberStyles,
      isSelectedTreeHighlighted: state.settings.colorMode === 'uniform',
      labelMode: state.settings.labelMode,
      shouldScaleNodes: state.settings.shouldScaleNodes,
    });
  }, [
    memberStyles,
    state.settings.colorMode,
    state.settings.labelMode,
    state.settings.shouldScaleNodes,
    members,
  ]);

  useEffect(() => {
    rendererRef.current?.setSelection({
      memberId: state.selectedMemberId,
      treeId: state.selectedTreeId,
    });
  }, [state.selectedMemberId, state.selectedTreeId, members]);

  useEffect(() => {
    rendererRef.current?.focusOnTree(
      state.selectedTreeId,
      measureInterfaceInsets(state.selectedTreeId !== null),
    );
  }, [state.selectedTreeId, members]);

  return (
    <div
      ref={containerRef}
      className="graph-view"
      role="img"
      aria-label={translations.graphLabel}
      data-testid="graph-view"
      data-selected-tree-id={state.selectedTreeId ?? ''}
      data-selected-member-id={state.selectedMemberId ?? ''}
    />
  );
}
