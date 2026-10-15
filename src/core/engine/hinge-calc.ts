import type { CalcResult } from '../models/common';
import type { HingeCountRule } from '../models/hardware';
import { roundDown05 } from '../utils/rounding';

export function calcHingeCount(
  doorHeight: number,
  doorWidth: number,
  countTable: HingeCountRule[],
  extraHingeWidthMm: number
): CalcResult {
  let count = 2;
  for (const rule of countTable) {
    if (doorHeight >= rule.minHeight && doorHeight <= rule.maxHeight) {
      count = rule.count;
      break;
    }
  }
  if (doorWidth > extraHingeWidthMm) {
    count++;
  }
  return {
    value: count,
    trace: {
      formula: 'lookup(countTable) + (doorWidth > extraHingeWidthMm ? 1 : 0)',
      inputs: { doorHeight, doorWidth, extraHingeWidthMm },
      ruleId: 'RULE_HINGE_COUNT',
      description: 'Kapak yüksekliğine göre menteşe sayısı belirlenir. Geniş kapaklarda +1.'
    }
  };
}

export function calcHingePositions(
  doorHeight: number,
  hingeCount: number,
  topBottomInset: number
): number[] {
  if (hingeCount < 2) return [doorHeight / 2];
  
  const positions: number[] = [];
  const start = topBottomInset;
  const end = doorHeight - topBottomInset;
  
  for (let i = 0; i < hingeCount; i++) {
    const pos = start + (i * (end - start)) / (hingeCount - 1);
    positions.push(roundDown05(pos));
  }
  return positions;
}

export function getHingeType(overlayType: 'full' | 'half' | 'inset'): string {
  if (overlayType === 'full') return 'Düz (Tam Bindirme)';
  if (overlayType === 'half') return 'Yarım Çıkma';
  return 'Gömme';
}

export function checkHingeRailClash(
  hingePositions: number[],
  drawerYPositions: number[],
  cabinetHeight: number,
  tolerance: number
): { clashes: boolean; details: string[] } {
  let clashes = false;
  const details: string[] = [];
  
  for (const hPos of hingePositions) {
    const hY = cabinetHeight - hPos; // convert to bottom-up Y coordinate
    for (const dY of drawerYPositions) {
      if (Math.abs(hY - dY) <= tolerance) {
        clashes = true;
        details.push(`Menteşe (Y: ${hY}) ile Ray (Y: ${dY}) çakışıyor.`);
      }
    }
  }
  return { clashes, details };
}
