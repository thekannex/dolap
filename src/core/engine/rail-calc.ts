import type { CalcResult } from '../models/common';
import { roundDown05 } from '../utils/rounding';

export function calcSideMountDrawerWidth(
  innerWidth: number, widthDeduction: number
): CalcResult {
  const val = innerWidth - widthDeduction;
  return {
    value: roundDown05(val),
    trace: {
      formula: 'innerWidth - widthDeduction',
      inputs: { innerWidth, widthDeduction },
      ruleId: 'RULE_DRAWER_BOX_WIDTH',
      description: 'Çekmece kutusu = iç genişlik − ray düşümü.'
    }
  };
}

export function findBestRailLength(
  innerDepth: number, standardLengths: number[]
): CalcResult {
  const validLengths = standardLengths.filter(l => l <= innerDepth).sort((a, b) => b - a);
  const best = validLengths.length > 0 ? validLengths[0] : 0;
  return {
    value: roundDown05(best),
    trace: {
      formula: 'max(L <= innerDepth)',
      inputs: { innerDepth, standardLengths },
      ruleId: 'RULE_BEST_RAIL_LENGTH',
      description: 'İç derinlikten küçük en büyük standart ray boyu seçilir.'
    }
  };
}

export function checkRailFit(
  innerDepth: number, railLength: number
): { fits: boolean; message: string } {
  const fits = railLength <= innerDepth;
  return {
    fits,
    message: fits ? 'Ray sığıyor.' : 'Ray boyu iç derinliği aşıyor.'
  };
}
