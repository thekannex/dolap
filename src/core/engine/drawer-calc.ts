import type { CalcResult } from '../models/common';
import { roundDown05 } from '../utils/rounding';

export function calcDrawerBoxWidth(
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

export function calcBestRailLength(
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

export function calcDrawerFronts(
  totalHeight: number,
  ratios: number[],
  doorGap: number,
  doorCount: number
): { heights: CalcResult[]; frontWidth: CalcResult } {
  const totalGapSpace = doorCount * doorGap;
  const availableFrontHeight = totalHeight - totalGapSpace;
  const sumRatios = ratios.reduce((a, b) => a + b, 0);

  const heights = ratios.map(ratio => {
    const val = (ratio / sumRatios) * availableFrontHeight;
    return {
      value: roundDown05(val),
      trace: {
        formula: '(ratio / sumRatios) * (H - n*d)',
        inputs: { totalHeight, ratio, sumRatios, doorCount, doorGap },
        ruleId: 'RULE_DRAWER_FRONT_HEIGHT',
        description: 'Çekmece klapa yüksekliği.'
      }
    };
  });

  return {
    heights,
    frontWidth: {
      value: roundDown05(100),
      trace: { formula: 'W', inputs: {}, ruleId: 'RULE_FRONT_WIDTH', description: 'Klapa genişliği' }
    }
  };
}

export function calcDrawerBoxDepth(railLength: number): CalcResult {
  return {
    value: roundDown05(railLength),
    trace: {
      formula: 'railLength',
      inputs: { railLength },
      ruleId: 'RULE_DRAWER_BOX_DEPTH',
      description: 'Çekmece kutusu derinliği ray boyuna eşittir.'
    }
  };
}

export function calcDrawerBoxHeight(frontHeight: number): CalcResult {
  const val = frontHeight - 25;
  return {
    value: roundDown05(val),
    trace: {
      formula: 'frontHeight - 25',
      inputs: { frontHeight },
      ruleId: 'RULE_DRAWER_BOX_HEIGHT',
      description: 'Çekmece kutusu yüksekliği klapadan 25mm kısadır.'
    }
  };
}
