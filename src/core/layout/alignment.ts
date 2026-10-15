import type { PlannedModule } from './module-planner';
import { roundDown05 } from '../utils/math';

export interface AlignmentResult {
  adjustedModules: PlannedModule[];
  alignmentScore: number;
  adjustments: Array<{ moduleIndex: number; originalWidth: number; newWidth: number; reason: string }>;
}

export function alignUpperToLower(
  lowerModules: PlannedModule[],
  upperModules: PlannedModule[],
  tolerance: number = 5
): AlignmentResult {
  const lowerSeams = new Set<number>();
  let lowerX = 0;
  for (const m of lowerModules) {
    lowerX += m.width;
    lowerSeams.add(roundDown05(lowerX));
  }

  const adjustedModules = JSON.parse(JSON.stringify(upperModules)) as PlannedModule[];
  const adjustments = [];
  let upperX = 0;
  let alignedCount = 0;
  let totalSeams = 0;

  for (let i = 0; i < adjustedModules.length - 1; i++) {
    totalSeams++;
    const m = adjustedModules[i];
    upperX += m.width;
    
    let closestSeam = -1;
    let minDiff = Infinity;
    for (const ls of lowerSeams) {
      const diff = Math.abs(ls - upperX);
      if (diff < minDiff) {
        minDiff = diff;
        closestSeam = ls;
      }
    }

    if (minDiff === 0) {
      alignedCount++;
    } else if (minDiff <= tolerance) {
      const originalWidth = m.width;
      const newWidth = m.width + (closestSeam - upperX);
      m.width = newWidth;
      
      const nextM = adjustedModules[i + 1];
      nextM.x = closestSeam;
      nextM.width = nextM.width - (closestSeam - upperX);
      
      upperX = closestSeam;
      alignedCount++;
      adjustments.push({
        moduleIndex: i,
        originalWidth,
        newWidth,
        reason: 'Alt dolap derzine hizalandı',
      });
    }
  }

  const alignmentScore = totalSeams > 0 ? Math.round((alignedCount / totalSeams) * 100) : 100;

  return {
    adjustedModules,
    alignmentScore,
    adjustments,
  };
}
