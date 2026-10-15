import { roundDown05 } from '../utils/rounding';

export const HOLE_ROW_INSET = 37;

export function generate32mmHolePositions(
  panelHeight: number,
  startFromBottom: number,
  endFromTop: number,
  holePitch: number,
  _holeDiameter: number
): number[] {
  const positions: number[] = [];
  const maxH = panelHeight - endFromTop;
  let currentY = startFromBottom;
  while (currentY <= maxH) {
    positions.push(roundDown05(currentY));
    currentY += holePitch;
  }
  return positions;
}

export function snapTo32mm(
  desiredY: number,
  holePositions: number[]
): { snapped: number; originalY: number; delta: number } {
  if (holePositions.length === 0) return { snapped: desiredY, originalY: desiredY, delta: 0 };
  let closest = holePositions[0];
  let minDiff = Math.abs(desiredY - closest);
  for (const pos of holePositions) {
    const diff = Math.abs(desiredY - pos);
    if (diff < minDiff) {
      closest = pos;
      minDiff = diff;
    }
  }
  return { snapped: closest, originalY: desiredY, delta: closest - desiredY };
}
