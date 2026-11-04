import { useEffect, useRef } from 'react';
import { createForceGraphRenderer } from '../graph/forceGraphRenderer';
import type { GraphRenderer } from '../graph/GraphRenderer';
import { useApplication, useSelectionActions, useTranslations } from '../state/ApplicationContext';

export function GraphView() {
  const { state, index } = useApplication();
  const translations = useTranslations();
  const { selectMember, clearSelection } = useSelectionActions();
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
      { settings, shouldScaleNodesByDescendants: true },
      { onMemberClick: selectMember, onBackgroundClick: clearSelection },
    );
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [members, settings, selectMember, clearSelection]);

  useEffect(() => {
    rendererRef.current?.setSelection({
      memberId: state.selectedMemberId,
      treeId: state.selectedTreeId,
    });
  }, [state.selectedMemberId, state.selectedTreeId, members]);

  useEffect(() => {
    rendererRef.current?.focusOnTree(state.selectedTreeId);
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
