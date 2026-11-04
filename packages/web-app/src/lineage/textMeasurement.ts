import { LINEAGE_FONT_SIZE } from './treeLayout';
import type { TextWidthMeasurer } from './treeLayout';

export const LINEAGE_FONT_FAMILY = "'Apercu Pro', system-ui, sans-serif";
const BOLD_WEIGHT = 700;

/**
 * Measures with the bold weight: a selected name is bold, and it must still fit in the space
 * reserved for the regular one.
 */
export function createCanvasTextMeasurer(): TextWidthMeasurer {
  const canvasContext = document.createElement('canvas').getContext('2d');
  if (canvasContext === null) throw new Error('2D canvas is not available');
  canvasContext.font = `${BOLD_WEIGHT} ${LINEAGE_FONT_SIZE}px ${LINEAGE_FONT_FAMILY}`;
  return (text) => canvasContext.measureText(text).width;
}

/** Layout depends on real glyph widths, so it must wait until Apercu Pro is loaded. */
export async function waitForLineageFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load(`${BOLD_WEIGHT} ${LINEAGE_FONT_SIZE}px ${LINEAGE_FONT_FAMILY}`),
    document.fonts.load(`400 ${LINEAGE_FONT_SIZE}px ${LINEAGE_FONT_FAMILY}`),
  ]);
  await document.fonts.ready;
}
