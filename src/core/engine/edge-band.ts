import type { CalcResult } from '../models/common';
import type { EdgeBanding, EdgeBandSpec } from '../models/part';
import { roundDown05 } from '../utils/rounding';

function bandDeduction(spec: EdgeBandSpec | null, thresholdMm: number): number {
  if (!spec) return 0;
  return spec.thickness >= thresholdMm ? spec.thickness : 0;
}

/**
 * Bant düşme kuralı:
 * - top/bottom bantları LENGTH boyunca (uzun kenar)
 * - left/right bantları WIDTH boyunca (kısa kenar)
 * - cutLength = netLength - left_deduction - right_deduction
 * - cutWidth  = netWidth  - top_deduction  - bottom_deduction
 */
export function applyEdgeBandDeduction(
  netLength: number,
  netWidth: number,
  edgeBanding: EdgeBanding,
  thresholdMm: number
): { cutLength: CalcResult; cutWidth: CalcResult } {

  const dedLeft = bandDeduction(edgeBanding.left, thresholdMm);
  const dedRight = bandDeduction(edgeBanding.right, thresholdMm);
  const dedTop = bandDeduction(edgeBanding.top, thresholdMm);
  const dedBottom = bandDeduction(edgeBanding.bottom, thresholdMm);

  const cutL = netLength - dedLeft - dedRight;
  const cutW = netWidth - dedTop - dedBottom;

  return {
    cutLength: {
      value: roundDown05(cutL),
      trace: {
        formula: 'netLength - left_deduction - right_deduction',
        inputs: { netLength, dedLeft, dedRight, thresholdMm },
        ruleId: 'RULE_EDGE_BAND_DEDUCTION',
        description: 'Bant kalınlığı eşik değerin üzerindeyse kesim ölçüsünden düşülür.',
      },
    },
    cutWidth: {
      value: roundDown05(cutW),
      trace: {
        formula: 'netWidth - top_deduction - bottom_deduction',
        inputs: { netWidth, dedTop, dedBottom, thresholdMm },
        ruleId: 'RULE_EDGE_BAND_DEDUCTION',
        description: 'Bant kalınlığı eşik değerin üzerindeyse kesim ölçüsünden düşülür.',
      },
    },
  };
}

/**
 * Bant toplamı: kalınlık+malzeme bazında toplam metre + fire payı
 */
export function calcTotalBandMeters(
  parts: Array<{
    length: number;
    width: number;
    edgeBanding: EdgeBanding;
    quantity: number;
  }>,
  firePercent: number
): Map<string, { thickness: number; totalMeters: number; withFire: number }> {
  const map = new Map<string, { thickness: number; totalMeters: number; withFire: number }>();

  function addBand(spec: EdgeBandSpec | null, edgeLengthMm: number, qty: number) {
    if (!spec) return;
    const key = `${spec.thickness}-${spec.materialId}`;
    const existing = map.get(key);
    const meters = (edgeLengthMm / 1000) * qty;
    if (existing) {
      existing.totalMeters += meters;
      existing.withFire = existing.totalMeters * (1 + firePercent / 100);
    } else {
      const total = meters;
      map.set(key, {
        thickness: spec.thickness,
        totalMeters: total,
        withFire: total * (1 + firePercent / 100),
      });
    }
  }

  for (const part of parts) {
    // top/bottom bands run along the length
    addBand(part.edgeBanding.top, part.length, part.quantity);
    addBand(part.edgeBanding.bottom, part.length, part.quantity);
    // left/right bands run along the width
    addBand(part.edgeBanding.left, part.width, part.quantity);
    addBand(part.edgeBanding.right, part.width, part.quantity);
  }

  return map;
}
