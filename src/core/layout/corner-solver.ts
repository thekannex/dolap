import { roundDown05 } from '../utils/math';

export type CornerType = 'blind' | 'L' | 'carousel';

export interface CornerSolution {
  cornerType: CornerType;
  blindOverlap: number;
  cornerModuleWidth: number;
  cornerModuleDepth: number;
  fillerWidth: number;
  doorClearance: boolean;
  warning?: string;
}

export function solveCorner(
  cornerType: CornerType,
  wall1Depth: number,
  wall2Depth: number,
  bodyThickness: number,
  doorGap: number,
  handleLength: number,
  minDoorClearance: number = 50
): CornerSolution {
  let blindOverlap = 0;
  let cornerModuleWidth = 0;
  let cornerModuleDepth = wall1Depth;
  let fillerWidth = 0;
  let doorClearance = true;
  let warning: string | undefined = undefined;

  if (cornerType === 'blind') {
    blindOverlap = wall2Depth - doorGap;
    cornerModuleWidth = 900;
    fillerWidth = handleLength + minDoorClearance;
    if (fillerWidth < handleLength + minDoorClearance) {
      doorClearance = false;
      warning = 'Kapak açılma payı yetersiz.';
    }
  } else if (cornerType === 'L') {
    cornerModuleWidth = wall1Depth + wall2Depth - bodyThickness;
    cornerModuleDepth = wall1Depth;
    fillerWidth = 0;
  } else if (cornerType === 'carousel') {
    cornerModuleWidth = 900;
    cornerModuleDepth = 900;
    fillerWidth = 0;
  }

  return {
    cornerType,
    blindOverlap: roundDown05(blindOverlap),
    cornerModuleWidth: roundDown05(cornerModuleWidth),
    cornerModuleDepth: roundDown05(cornerModuleDepth),
    fillerWidth: roundDown05(fillerWidth),
    doorClearance,
    warning,
  };
}
