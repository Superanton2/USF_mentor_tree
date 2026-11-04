import type { LineageLayout, LineageLayoutNode } from './treeLayout';

const MAX_INITIAL_SCALE = 1.2;
/** Below this scale names become unreadable, so we stop fitting and center on the person instead. */
const MIN_READABLE_SCALE = 0.6;
const FOCUSED_SCALE = 1;
const FIT_MARGIN = 24;

export interface CameraViewport {
  width: number;
  height: number;
  /** Space taken by interface on each side (search bar, card, disclaimer). */
  insets: { top: number; right: number; bottom: number; left: number };
}

export interface CameraTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

/** Fits the whole tree; if that would be too small to read, centers on `focusNode` instead (SPEC 7.3). */
export function computeInitialCamera(
  layout: LineageLayout,
  viewport: CameraViewport,
  focusNode: LineageLayoutNode | null,
): CameraTransform {
  const availableWidth =
    viewport.width - viewport.insets.left - viewport.insets.right - 2 * FIT_MARGIN;
  const availableHeight =
    viewport.height - viewport.insets.top - viewport.insets.bottom - 2 * FIT_MARGIN;
  const { bounds } = layout;
  const fitScale = Math.min(
    availableWidth / (bounds.maxX - bounds.minX),
    availableHeight / (bounds.maxY - bounds.minY),
    MAX_INITIAL_SCALE,
  );

  const centerOfAvailableArea = {
    x: viewport.insets.left + (viewport.width - viewport.insets.left - viewport.insets.right) / 2,
    y: viewport.insets.top + (viewport.height - viewport.insets.top - viewport.insets.bottom) / 2,
  };
  const shouldFocus = fitScale < MIN_READABLE_SCALE && focusNode !== null;
  const scale = shouldFocus ? FOCUSED_SCALE : fitScale;
  const target = shouldFocus
    ? { x: focusNode.x, y: focusNode.y }
    : { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };

  return {
    scale,
    translateX: centerOfAvailableArea.x - target.x * scale,
    translateY: centerOfAvailableArea.y - target.y * scale,
  };
}
