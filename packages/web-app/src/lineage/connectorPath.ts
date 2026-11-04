import { GENERATION_SPACING, LABEL_HEIGHT } from './treeLayout';

const CONNECTOR_CLEARANCE = 4;
const CORNER_RADIUS = 10;

/**
 * Neurotree-style connector: down from the parent to a horizontal bus, along it, then down
 * to the child, with rounded corners. `parentX/childX` are label centers; y is the parent's.
 */
export function buildConnectorPath(parentX: number, parentY: number, childX: number): string {
  const startY = parentY + LABEL_HEIGHT / 2 + CONNECTOR_CLEARANCE;
  const endY = parentY + GENERATION_SPACING - LABEL_HEIGHT / 2 - CONNECTOR_CLEARANCE;
  const busY = (startY + endY) / 2;
  const distance = childX - parentX;
  if (Math.abs(distance) < 1) return `M ${parentX} ${startY} V ${endY}`;

  const direction = Math.sign(distance);
  const radius = Math.min(CORNER_RADIUS, Math.abs(distance) / 2, busY - startY, endY - busY);
  return [
    `M ${parentX} ${startY}`,
    `V ${busY - radius}`,
    `Q ${parentX} ${busY} ${parentX + direction * radius} ${busY}`,
    `H ${childX - direction * radius}`,
    `Q ${childX} ${busY} ${childX} ${busY + radius}`,
    `V ${endY}`,
  ].join(' ');
}
