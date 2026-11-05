import ForceGraph, { type LinkObject, type NodeObject } from 'force-graph';
import { designTokens } from '../design/tokens';
import { withOpacity } from './colorConversion';
import { computeClusterLayout } from './clusterLayout';
import type {
  GraphRendererFactory,
  GraphRendererNode,
  GraphRendererSelection,
  ViewInsets,
} from './GraphRenderer';

const BASE_NODE_RADIUS = 3;
const NODE_RADIUS_PER_SQRT_DESCENDANT = 1.6;
const MAX_NODE_RADIUS = 14;
const CAMERA_PADDING = 70;
const MAX_FOCUS_ZOOM = 6;
// These must match the values used to precompute the layout (clusterLayout.ts): then the
// picture starts at equilibrium and only the dragged part of the graph reacts to physics.
const LINK_DISTANCE = 18;
const CHARGE_STRENGTH = -30;
/** Repulsion only acts inside a tree's neighbourhood, so a drag does not shove distant trees. */
const CHARGE_MAX_DISTANCE = 120;
const SETTLE_TICKS_AFTER_DRAG = 150;
const CAMERA_DURATION_MS = 600;
const SELECTED_TREE_LABEL_THRESHOLD_FACTOR = 0.6;
const LABEL_FADE_RANGE_FACTOR = 0.4;
const LABEL_FONT_SIZE = 12;
const LABEL_OFFSET = 4;
const SELECTED_OUTLINE_WIDTH = 2;
const LINK_WIDTH = 1;
const LINK_WIDTH_HIGHLIGHTED = 1.6;
const ARROW_LENGTH = 4;
const ARROW_GAP_FROM_NODE = 1.5;
const MIN_ARROW_RELATIVE_POSITION = 0.5;
const FONT_FAMILY = "'Apercu Pro', system-ui, sans-serif";
const WHITE = '#FFFFFF';

type SimulationNode = NodeObject & GraphRendererNode;
type SimulationLink = LinkObject<SimulationNode>;

function endpointId(endpoint: string | number | SimulationNode | undefined): string {
  return typeof endpoint === 'object' ? endpoint.memberId : String(endpoint);
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
  // Node coordinates exist only after the first frame; camera moves wait for it.
  let isLayoutReady = false;
  let isDragging = false;
  let pendingFocus: { treeId: string | null; insets: ViewInsets } | null = null;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cameraDuration = () => (prefersReducedMotion.matches ? 0 : CAMERA_DURATION_MS);

  // Hidden until laid out and framed, so the viewer never sees nodes jumping into place.
  container.dataset['ready'] = 'false';

  const nodeRadius = (node: GraphRendererNode) =>
    options.shouldScaleNodesByDescendants
      ? Math.min(
          MAX_NODE_RADIUS,
          BASE_NODE_RADIUS + NODE_RADIUS_PER_SQRT_DESCENDANT * Math.sqrt(node.descendantCount),
        )
      : BASE_NODE_RADIUS;

  // Mentees point to their mentors: source = mentee, target = mentor, arrow at the target end.
  const layoutPositions = computeClusterLayout(
    nodes.map((node) => ({
      memberId: node.memberId,
      treeId: node.treeId,
      radius: nodeRadius(node),
    })),
    links.map((link) => ({
      sourceMemberId: link.menteeMemberId,
      targetMemberId: link.mentorMemberId,
    })),
  );
  const simulationNodes: SimulationNode[] = nodes.map((node) => ({
    ...node,
    id: node.memberId,
    x: layoutPositions.get(node.memberId)?.x ?? 0,
    y: layoutPositions.get(node.memberId)?.y ?? 0,
  }));
  const nodesById = new Map(simulationNodes.map((node) => [node.memberId, node]));
  const simulationLinks: SimulationLink[] = links.map((link) => ({
    source: link.menteeMemberId,
    target: link.mentorMemberId,
  }));

  const isInSelectedTree = (node: SimulationNode) =>
    selection.treeId !== null && node.treeId === selection.treeId;
  const isDimmed = (node: SimulationNode) => selection.treeId !== null && !isInSelectedTree(node);
  const isHoverNeighbour = (first: string, second: string) =>
    hoveredMemberId !== null && (first === hoveredMemberId || second === hoveredMemberId);

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

  /** Mentee node of a link: the one the link starts from. */
  const menteeOf = (link: SimulationLink) => nodesById.get(endpointId(link.source));

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
      const mentee = menteeOf(link);
      if (mentee && isInSelectedTree(mentee)) return settings.colors.highlight;
      if (mentee && isDimmed(mentee)) {
        return withOpacity(settings.colors.link, settings.dimmedOpacity);
      }
      return isHoverNeighbour(endpointId(link.source), endpointId(link.target))
        ? designTokens.colorLinkHover
        : settings.colors.link;
    })
    .linkWidth((link) => {
      const mentee = menteeOf(link);
      return mentee && isInSelectedTree(mentee) ? LINK_WIDTH_HIGHLIGHTED : LINK_WIDTH;
    })
    .linkDirectionalArrowLength(ARROW_LENGTH)
    .linkDirectionalArrowColor((link) => {
      const mentee = menteeOf(link);
      if (mentee && isInSelectedTree(mentee)) return settings.colors.highlight;
      if (mentee && isDimmed(mentee)) {
        return withOpacity(designTokens.colorLinkHover, settings.dimmedOpacity);
      }
      return designTokens.colorLinkHover;
    })
    // The arrow sits just outside the mentor's circle, otherwise the node would hide it.
    .linkDirectionalArrowRelPos((link) => {
      const mentor = nodesById.get(endpointId(link.target));
      const mentee = menteeOf(link);
      if (!mentor || !mentee) return 1;
      const length = Math.hypot(
        (mentor.x ?? 0) - (mentee.x ?? 0),
        (mentor.y ?? 0) - (mentee.y ?? 0),
      );
      if (length === 0) return 1;
      return Math.max(
        MIN_ARROW_RELATIVE_POSITION,
        1 - (nodeRadius(mentor) + ARROW_GAP_FROM_NODE) / length,
      );
    })
    // The layout is precomputed (deterministic, no visible settling), so the physics engine
    // is idle until a drag. The scene redraws every frame so selection and hover show up.
    .autoPauseRedraw(false)
    .warmupTicks(0)
    .cooldownTicks(0)
    .enableNodeDrag(true)
    .onEngineStop(() => {
      if (isLayoutReady) return;
      isLayoutReady = true;
      if (pendingFocus) focusOnTree(pendingFocus.treeId, pendingFocus.insets, 0);
      else graph.zoomToFit(0, CAMERA_PADDING);
      container.dataset['ready'] = 'true';
    })
    .onNodeHover((node) => {
      hoveredMemberId = node ? node.memberId : null;
      container.style.cursor = node ? 'pointer' : '';
    })
    .onNodeDrag(() => {
      // The scene is static until a node is grabbed; then the edge physics wakes up so that
      // neighbours follow the dragged node, and it keeps running as long as the drag lasts.
      if (isDragging) return;
      isDragging = true;
      graph.cooldownTicks(Number.POSITIVE_INFINITY).d3ReheatSimulation();
    })
    .onNodeDragEnd(() => {
      isDragging = false;
      // Re-arm a finite cool-down and let the graph settle, then freeze again.
      graph.cooldownTicks(SETTLE_TICKS_AFTER_DRAG).d3ReheatSimulation();
    })
    .onNodeClick((node) => callbacks.onMemberClick(node.memberId))
    .onBackgroundClick(() => callbacks.onBackgroundClick());

  /** Frames the tree (or everything) inside the area not covered by panels. */
  function focusOnTree(treeId: string | null, insets: ViewInsets, duration: number): void {
    const bounds = graph.getGraphBbox(
      treeId === null ? undefined : (node) => node.treeId === treeId,
    );
    if (!bounds) return;
    const availableWidth = container.clientWidth - insets.left - insets.right - 2 * CAMERA_PADDING;
    const availableHeight =
      container.clientHeight - insets.top - insets.bottom - 2 * CAMERA_PADDING;
    const scale = Math.min(
      MAX_FOCUS_ZOOM,
      availableWidth / Math.max(1, bounds.x[1] - bounds.x[0]),
      availableHeight / Math.max(1, bounds.y[1] - bounds.y[0]),
    );
    // The screen center is not the center of the free area; shift the target by the difference.
    const centerX = (bounds.x[0] + bounds.x[1]) / 2 + (insets.right - insets.left) / 2 / scale;
    const centerY = (bounds.y[0] + bounds.y[1]) / 2 + (insets.bottom - insets.top) / 2 / scale;
    graph.centerAt(centerX, centerY, duration).zoom(scale, duration);
  }

  configurePhysics(graph);
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
    focusOnTree(treeId, insets) {
      if (!isLayoutReady) {
        pendingFocus = { treeId, insets };
        return;
      }
      focusOnTree(treeId, insets, cameraDuration());
    },
    getMemberScreenPosition(memberId) {
      const node = nodesById.get(memberId);
      return node ? graph.graph2ScreenCoords(node.x ?? 0, node.y ?? 0) : null;
    },
    destroy() {
      resizeObserver.disconnect();
      graph._destructor();
    },
  };
};

interface TunableForce {
  strength(value: number): unknown;
  distance?(value: number): unknown;
  distanceMax?(value: number): unknown;
}

function configurePhysics(graph: ForceGraph<SimulationNode, SimulationLink>): void {
  // force-graph hands out its d3 forces untyped; only these three knobs are used.
  const linkForce = graph.d3Force('link') as unknown as TunableForce | undefined;
  linkForce?.distance?.(LINK_DISTANCE);
  const chargeForce = graph.d3Force('charge') as unknown as TunableForce | undefined;
  chargeForce?.strength(CHARGE_STRENGTH);
  chargeForce?.distanceMax?.(CHARGE_MAX_DISTANCE);
  // The default centering force would slowly drag whole trees towards the origin.
  graph.d3Force('center', null);
}
