// d3-force-3d ships without types; only the two centering forces are used, behind the adapter.
declare module 'd3-force-3d' {
  interface CenteringForce {
    (alpha: number): void;
    strength(value: number): CenteringForce;
  }
  export function forceX(position: number): CenteringForce;
  export function forceY(position: number): CenteringForce;
}
