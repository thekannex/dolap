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

/**
 * Menteşeleri yasak yükseklik bantlarından (ör. iç çekmece ray takozu) kaçırır.
 * Yerler kapağın altından mm; plaka yarı yüksekliği + pay kadar bant dışında kalır, kapak kenarına
 * edge'den yakın olmaz. Kaydırılamayan menteşe varsa ok = false.
 */
export function placeHingesClear(
  doorHeight: number, hingeCount: number, blocked: Array<[number, number]>,
  topBottomInset = 90, halfPlate = 30, edge = 50,
): { positions: number[]; moved: boolean; ok: boolean } {
  const hits = (c: number) => blocked.some(([a, b]) => c + halfPlate > a && c - halfPlate < b);
  const valid = (c: number) => c >= edge && c <= doorHeight - edge && !hits(c);
  let moved = false;
  let ok = true;
  const positions = calcHingePositions(doorHeight, hingeCount, topBottomInset).map((c) => {
    if (!hits(c)) return c;
    // En yakın bant kenarının dışına: önce aşağı ve yukarı adaylar, en az kayan seçilir
    const candidates = blocked.flatMap(([a, b]) => [roundDown05(a - halfPlate), roundDown05(b + halfPlate)]).filter(valid);
    if (candidates.length === 0) { ok = false; return c; }
    moved = true;
    return candidates.reduce((best, v) => (Math.abs(v - c) < Math.abs(best - c) ? v : best));
  });
  return { positions, moved, ok };
}
