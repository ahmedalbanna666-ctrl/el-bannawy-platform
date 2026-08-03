export interface ZigzagPoint {
  x: number;
  y: number;
}

const MIN_OFFSET_PX = 40;
const MAX_OFFSET_PX = 60;
const DESKTOP_OFFSET_PX = 64;
const DESKTOP_BREAKPOINT = 768;

export function computeZigzagOffset(width: number): number {
  if (width >= DESKTOP_BREAKPOINT) return DESKTOP_OFFSET_PX;
  return Math.min(Math.max(width * 0.14, MIN_OFFSET_PX), MAX_OFFSET_PX);
}

export function buildZigzagPath(
  points: readonly ZigzagPoint[],
): { bgD: string; dotsD: string } {
  let bgD = `M ${String(points[0].x)} ${String(points[0].y)}`;
  let dotsD = `M ${String(points[0].x)} ${String(points[0].y)}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dir = dx >= 0 ? 1 : -1;
    const bulge = Math.min(Math.abs(dx) * 0.5, 22);
    const cp1x = Math.round(prev.x + dir * bulge);
    const cp1y = Math.round(prev.y + dy * 0.2);
    const cp2x = Math.round(curr.x - dir * bulge);
    const cp2y = Math.round(curr.y - dy * 0.2);
    const curve = `C ${String(cp1x)} ${String(cp1y)}, ${String(cp2x)} ${String(cp2y)}, ${String(curr.x)} ${String(curr.y)}`;
    bgD += ` ${curve}`;
    dotsD += ` ${curve}`;
  }

  return { bgD, dotsD };
}
