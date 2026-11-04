import { listPathFromFounder } from '@mentor-tree/domain';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { computeInitialCamera } from '../lineage/initialCamera';
import { buildConnectorPath } from '../lineage/connectorPath';
import { buildLineageInput } from '../lineage/lineageInput';
import { createCanvasTextMeasurer, waitForLineageFonts } from '../lineage/textMeasurement';
import {
  GENERATION_SPACING,
  LABEL_HEIGHT,
  LINEAGE_LINE_HEIGHT,
  computeLineageLayout,
  type LineageLayoutNode,
  type TextWidthMeasurer,
} from '../lineage/treeLayout';
import {
  getDisplayName,
  useApplication,
  useSelectionActions,
  useTranslations,
} from '../state/ApplicationContext';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const CARD_WIDTH_WITH_GAP = 392;
const TOP_INSET = 110;
const BOTTOM_INSET = 70;
const DESKTOP_MIN_WIDTH = 768;
const DOT_RADIUS = 3;
const DOT_OFFSET_FROM_EDGE = 12;

function useLineageFonts(): TextWidthMeasurer | null {
  const [measurer, setMeasurer] = useState<TextWidthMeasurer | null>(null);
  useEffect(() => {
    let isCancelled = false;
    waitForLineageFonts().then(() => {
      if (!isCancelled) setMeasurer(() => createCanvasTextMeasurer());
    });
    return () => {
      isCancelled = true;
    };
  }, []);
  return measurer;
}

/** "Мій родовід": the whole tree from the founder down, with the line to the chosen person highlighted. */
export function LineageView() {
  const { state, index } = useApplication();
  const translations = useTranslations();
  const { selectMember } = useSelectionActions();
  const measurer = useLineageFonts();
  const svgRef = useRef<SVGSVGElement>(null);
  const contentRef = useRef<SVGGElement>(null);
  const selectedMemberIdRef = useRef(state.selectedMemberId);
  selectedMemberIdRef.current = state.selectedMemberId;

  const treeId = state.selectedTreeId;
  const layout = useMemo(() => {
    if (measurer === null || treeId === null) return null;
    const input = buildLineageInput(index, treeId, translations);
    return input && computeLineageLayout(input, measurer);
  }, [measurer, index, treeId, translations]);

  const chainMemberIds = useMemo(
    () =>
      new Set(
        state.selectedMemberId === null
          ? []
          : listPathFromFounder(index, state.selectedMemberId).map((member) => member.memberId),
      ),
    [index, state.selectedMemberId],
  );

  // The camera is set once per tree, not on every selection, so clicking names does not make the picture jump.
  useEffect(() => {
    const svgElement = svgRef.current;
    if (svgElement === null || layout === null) return;
    const behavior: ZoomBehavior<SVGSVGElement, unknown> = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        contentRef.current?.setAttribute('transform', event.transform.toString());
      });
    const svg = select(svgElement);
    svg.call(behavior);

    const isDesktop = window.innerWidth >= DESKTOP_MIN_WIDTH;
    const focusNode =
      layout.nodes.find((node) => node.memberId === selectedMemberIdRef.current) ?? null;
    const camera = computeInitialCamera(
      layout,
      {
        width: svgElement.clientWidth,
        height: svgElement.clientHeight,
        insets: {
          top: TOP_INSET,
          bottom: BOTTOM_INSET,
          left: 0,
          right: isDesktop ? CARD_WIDTH_WITH_GAP : 0,
        },
      },
      focusNode,
    );
    svg.call(
      behavior.transform,
      zoomIdentity.translate(camera.translateX, camera.translateY).scale(camera.scale),
    );
    return () => {
      svg.on('.zoom', null);
    };
  }, [layout]);

  const nodesById = useMemo(
    () => new Map(layout?.nodes.map((node) => [node.memberId, node]) ?? []),
    [layout],
  );
  const dotColor = index.document.settings.colors.highlight;

  const activateOnKeyboard = (event: KeyboardEvent<SVGGElement>, memberId: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    selectMember(memberId);
  };

  return (
    <svg
      ref={svgRef}
      className="lineage-view"
      data-testid="lineage-view"
      role="group"
      aria-label={translations.lineageLabel}
    >
      <g ref={contentRef}>
        {layout && (
          <>
            <g className="lineage-edges" fill="none">
              {layout.nodes.flatMap((node) => {
                const parent =
                  node.parentMemberId === null ? undefined : nodesById.get(node.parentMemberId);
                return parent ? [renderEdge(parent, node, false)] : [];
              })}
              {layout.nodes.flatMap((node) => {
                const parent =
                  node.parentMemberId === null ? undefined : nodesById.get(node.parentMemberId);
                const isOnChain =
                  chainMemberIds.has(node.memberId) &&
                  parent &&
                  chainMemberIds.has(parent.memberId);
                return parent && isOnChain ? [renderEdge(parent, node, true)] : [];
              })}
            </g>
            {layout.nodes.map((node) => {
              const member = index.membersById.get(node.memberId);
              const displayName = member ? getDisplayName(member, translations) : '';
              return (
                <g
                  key={node.memberId}
                  className="lineage-node"
                  transform={`translate(${node.x} ${node.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={displayName}
                  aria-current={node.memberId === state.selectedMemberId}
                  data-member-id={node.memberId}
                  data-chain={chainMemberIds.has(node.memberId)}
                  data-selected={node.memberId === state.selectedMemberId}
                  onClick={() => selectMember(node.memberId)}
                  onKeyDown={(event) => activateOnKeyboard(event, node.memberId)}
                >
                  <rect
                    x={-node.width / 2}
                    y={-LABEL_HEIGHT / 2}
                    width={node.width}
                    height={LABEL_HEIGHT}
                    fill="transparent"
                  />
                  <circle
                    cx={-node.width / 2 + DOT_OFFSET_FROM_EDGE}
                    cy={-LINEAGE_LINE_HEIGHT / 2}
                    r={DOT_RADIUS}
                    fill={dotColor}
                  />
                  <text className="lineage-name" textAnchor="middle">
                    <tspan x={0} y={-LINEAGE_LINE_HEIGHT / 2} dominantBaseline="central">
                      {node.firstLine}
                    </tspan>
                    <tspan x={0} y={LINEAGE_LINE_HEIGHT / 2} dominantBaseline="central">
                      {node.secondLine}
                    </tspan>
                  </text>
                </g>
              );
            })}
          </>
        )}
      </g>
    </svg>
  );
}

function renderEdge(parent: LineageLayoutNode, child: LineageLayoutNode, isHighlighted: boolean) {
  return (
    <path
      key={`${isHighlighted ? 'chain' : 'edge'}-${child.memberId}`}
      className={isHighlighted ? 'lineage-edge lineage-edge--chain' : 'lineage-edge'}
      d={buildConnectorPath(parent.x, parent.y, child.x)}
      data-spacing={GENERATION_SPACING}
    />
  );
}
