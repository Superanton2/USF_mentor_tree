import { describe, expect, it } from 'vitest';
import { computeInitialCamera } from './initialCamera';
import type { LineageLayout, LineageLayoutNode } from './treeLayout';

const viewport = { width: 1000, height: 800, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
const layoutOfSize = (width: number, height: number): LineageLayout => ({
  nodes: [],
  bounds: { minX: -width / 2, maxX: width / 2, minY: 0, maxY: height },
});
const focusNode = { x: 1500, y: 100 } as LineageLayoutNode;

describe('computeInitialCamera', () => {
  it('fits a small tree without upscaling beyond the cap and centers it', () => {
    const camera = computeInitialCamera(layoutOfSize(200, 100), viewport, null);
    expect(camera.scale).toBe(1.2);
    expect(camera.translateX).toBeCloseTo(500);
    expect(camera.translateY).toBeCloseTo(400 - 50 * 1.2);
  });

  it('fits a medium tree entirely', () => {
    const camera = computeInitialCamera(layoutOfSize(1400, 300), viewport, focusNode);
    expect(camera.scale).toBeGreaterThanOrEqual(0.6);
    expect(camera.scale).toBeLessThan(1);
  });

  it('centers on the focused person when the tree is too wide to read', () => {
    const camera = computeInitialCamera(layoutOfSize(6000, 300), viewport, focusNode);
    expect(camera.scale).toBe(1);
    expect(camera.translateX + focusNode.x * camera.scale).toBeCloseTo(500);
  });

  it('still fits when nobody is selected', () => {
    expect(computeInitialCamera(layoutOfSize(6000, 300), viewport, null).scale).toBeLessThan(0.6);
  });

  it('respects interface insets', () => {
    const camera = computeInitialCamera(
      layoutOfSize(200, 100),
      { ...viewport, insets: { top: 0, right: 400, bottom: 0, left: 0 } },
      null,
    );
    expect(camera.translateX).toBeCloseTo(300);
  });
});
