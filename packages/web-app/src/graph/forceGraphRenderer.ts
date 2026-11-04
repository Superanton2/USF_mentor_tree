import ForceGraph, { type LinkObject, type NodeObject } from 'force-graph';
import { forceX, forceY } from 'd3-force-3d';
import { designTokens } from '../design/tokens';
import { withOpacity } from './colorConversion';
import type {
  GraphRendererFactory,
  GraphRendererNode,
  GraphRendererSelection,
} from './GraphRenderer';

const BASE_NODE_RADIUS = 3;
const NODE_RADIUS_PER_SQRT_DESCENDANT = 1.6;
const MAX_NODE_RADIUS = 14;
const WARMUP_TICKS = 250;
const REHEAT_TICKS_AFTER_DRAG = 120;
const CENTERING_FORCE_STRENGTH = 0.04;
const CAMERA_PADDING = 70;
const CAMERA_DURATION_MS = 600;
const SELECTED_TREE_LABEL_THRESHOLD_FACTOR = 0.6;
const LABEL_FADE_RANGE_FACTOR = 0.4;
const LABEL_FONT_SIZE = 12;
const LABEL_OFFSET = 4;
const SELECTED_OUTLINE_WIDTH = 2;
const LINK_WIDTH = 1;
const LINK_WIDTH_HIGHLIGHTED = 1.6;
const FONT_FAMILY = "'Apercu Pro', system-ui, sans-serif";
const WHITE = '#FFFFFF';
const RING_MIN_RADIUS = 260;
const RING_RADIUS_PER_SQRT_NODE = 20;

type SimulationNode = NodeObject & GraphRendererNode;
type SimulationLink = LinkObject<SimulationNode>;

function endpointId(endpoint: string | number | SimulationNode | undefined): string {
  return typeof endpoint === 'object' ? endpoint.memberId : String(endpoint);
}

/** Members without a tree form a fixed ring around the graph, like loners in Obsidian. */
function placeUnconnectedNodesOnRing(allNodes: SimulationNode[]): void {
  const unconnectedNodes = allNodes.filter((node) => node.treeId === null);
  const connectedCount = allNodes.length - unconnectedNodes.length;
  const radius = Math.max(RING_MIN_RADIUS, Math.sqrt(connectedCount) * RING_RADIUS_PER_SQRT_NODE);
  unconnectedNodes.forEach((node, position) => {
    const angle = (2 * Math.PI * position) / unconnectedNodes.length;
    node.fx = radius * Math.cos(angle);
    node.fy = radius * Math.sin(angle);
  });
}

export const createForceGraphRenderer: GraphRendererFactory = (
  container,
  nodes,
  links,
  options,
  callbacks,
) => {
  const { settings } = options;
  let selection: GraphRendererSelection = { memberId: null, treeId: null };
  let hoveredMemberId: string | null = null;
  let isReheated = false;
  // Node coordinates exist only after the first layout pass; camera moves wait for it.
  let isLayoutReady = false;
  let pendingFocusTreeId: string | null = null;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cameraDuration = () => (prefersReducedMotion.matches ? 0 : CAMERA_DURATION_MS);

  const simulationNodes: SimulationNode[] = nodes.map((node) => ({ ...node, id: node.memberId }));
  const simulationLinks: SimulationLink[] = links.map((link) => ({
    source: link.mentorMemberId,
    target: link.menteeMemberId,
  }));

  placeUnconnectedNodesOnRing(simulationNodes);

  const isInSelectedTree = (node: SimulationNode) =>
    selection.treeId !== null && node.treeId === selection.treeId;
  const isDimmed = (node: SimulationNode) => selection.treeId !== null && !isInSelectedTree(node);
  const isHoverNeighbour = (first: string, second: string) =>
    hoveredMemberId !== null && (first === hoveredMemberId || second === hoveredMemberId);

  const nodeRadius = (node: SimulationNode) =>
    options.shouldScaleNodesByDescendants
      ? Math.min(
          MAX_NODE_RADIUS,
          BASE_NODE_RADIUS + NODE_RADIUS_PER_SQRT_DESCENDANT * Math.sqrt(node.descendantCount),
        )
      : BASE_NODE_RADIUS;

  function drawNode(
    node: SimulationNode,
    canvasContext: CanvasRenderingContext2D,
    zoom: number,
  ): void {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const radius = nodeRadius(node);
    const isHovered = node.memberId === hoveredMemberId;
    const baseColor = isInSelectedTree(node)
      ? settings.colors.highlight
      : isHovered
        ? designTokens.colorNodeHover
        : settings.colors.node;

    canvasContext.beginPath();
    canvasContext.arc(x, y, radius, 0, 2 * Math.PI);
    canvasContext.fillStyle = isDimmed(node)
      ? withOpacity(baseColor, settings.dimmedOpacity)
      : baseColor;
    canvasContext.fill();

    if (node.memberId === selection.memberId) {
      canvasContext.lineWidth = SELECTED_OUTLINE_WIDTH / zoom;
      canvasContext.strokeStyle = WHITE;
      canvasContext.stroke();
    }
    drawLabel(node, canvasContext, zoom, x, y + radius, isHovered);
  }

  function drawLabel(
    node: SimulationNode,
    canvasContext: CanvasRenderingContext2D,
    zoom: number,
    x: number,
    bottomY: number,
    isHovered: boolean,
  ): void {
    if (node.label === null || isDimmed(node)) return;
    const threshold = isInSelectedTree(node)
      ? settings.labelZoomThreshold * SELECTED_TREE_LABEL_THRESHOLD_FACTOR
      : settings.labelZoomThreshold;
    const fadeRange = threshold * LABEL_FADE_RANGE_FACTOR;
    const fadeIn = isHovered
      ? 1
      : Math.min(1, Math.max(0, (zoom - (threshold - fadeRange)) / fadeRange));
    if (fadeIn === 0) return;

    canvasContext.font = `${LABEL_FONT_SIZE / zoom}px ${FONT_FAMILY}`;
    canvasContext.textAlign = 'center';
    canvasContext.textBaseline = 'top';
    canvasContext.fillStyle = withOpacity(designTokens.colorTextPrimary, fadeIn);
    canvasContext.fillText(node.label, x, bottomY + LABEL_OFFSET / zoom);
  }

  const graph: ForceGraph<SimulationNode, SimulationLink> = new ForceGraph<
    SimulationNode,
    SimulationLink
  >(container)
    .backgroundColor(designTokens.colorBackground)
    .nodeId('id')
    .nodeCanvasObjectMode(() => 'replace')
    .nodeCanvasObject((node, canvasContext, zoom) => drawNode(node, canvasContext, zoom))
    .nodePointerAreaPaint((node, color, canvasContext) => {
      canvasContext.fillStyle = color;
      canvasContext.beginPath();
      canvasContext.arc(node.x ?? 0, node.y ?? 0, nodeRadius(node) + 2, 0, 2 * Math.PI);
      canvasContext.fill();
    })
    .linkColor((link) => {
      const source = endpointId(link.source);
      const target = endpointId(link.target);
      const sourceNode = simulationNodes.find((node) => node.memberId === source);
      if (sourceNode && isInSelectedTree(sourceNode)) return settings.colors.highlight;
      if (sourceNode && isDimmed(sourceNode))
        return withOpacity(settings.colors.link, settings.dimmedOpacity);
      return isHoverNeighbour(source, target) ? designTokens.colorLinkHover : settings.colors.link;
    })
    .linkWidth((link) => {
      const source = simulationNodes.find((node) => node.memberId === endpointId(link.source));
      return source && isInSelectedTree(source) ? LINK_WIDTH_HIGHLIGHTED : LINK_WIDTH;
    })
    // The layout is frozen after warm-up, so selection/hover changes need an explicit redraw.
    .autoPauseRedraw(false)
    .warmupTicks(WARMUP_TICKS)
    .cooldownTicks(0)
    .enableNodeDrag(true)
    .onEngineStop(() => {
      if (isLayoutReady) return;
      isLayoutReady = true;
      focusOnTree(pendingFocusTreeId, 0);
    })
    .onNodeHover((node) => {
      hoveredMemberId = node ? node.memberId : null;
      container.style.cursor = node ? 'pointer' : '';
    })
    .onNodeClick((node) => callbacks.onMemberClick(node.memberId))
    .onBackgroundClick(() => callbacks.onBackgroundClick())
    .onNodeDrag(() => {
      // The layout is frozen after warm-up (for a deterministic picture); dragging wakes it briefly.
      if (isReheated) return;
      isReheated = true;
      graph.cooldownTicks(REHEAT_TICKS_AFTER_DRAG).d3ReheatSimulation();
    })
    .onNodeDragEnd(() => {
      isReheated = false;
    });

  function focusOnTree(treeId: string | null, duration: number): void {
    graph.zoomToFit(
      duration,
      CAMERA_PADDING,
      treeId === null ? undefined : (node) => node.treeId === treeId,
    );
  }

  // Without a centering pull, the ~100 separate trees would drift apart indefinitely.
  graph.d3Force('x', forceX(0).strength(CENTERING_FORCE_STRENGTH));
  graph.d3Force('y', forceY(0).strength(CENTERING_FORCE_STRENGTH));
  graph.graphData({ nodes: simulationNodes, links: simulationLinks });

  const resizeObserver = new ResizeObserver(() => {
    graph.width(container.clientWidth).height(container.clientHeight);
  });
  resizeObserver.observe(container);
  graph.width(container.clientWidth).height(container.clientHeight);

  return {
    setSelection(nextSelection) {
      selection = nextSelection;
    },
    focusOnTree(treeId) {
      if (!isLayoutReady) {
        pendingFocusTreeId = treeId;
        return;
      }
      focusOnTree(treeId, cameraDuration());
    },
    destroy() {
      resizeObserver.disconnect();
      graph._destructor();
    },
  };
};
