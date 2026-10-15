import type { CalcResult } from '../models/common';
import type { AssemblyType } from '../models/construction';
import { roundDown05 } from '../utils/rounding';

export function calcAdjustableShelf(
  W: number, t: number, innerDepth: number, frontPullback: number
): { width: CalcResult; depth: CalcResult } {
  const widthVal = W - 2 * t - 2;
  const depthVal = innerDepth - frontPullback;
  return {
    width: {
      value: roundDown05(widthVal),
      trace: {
        formula: 'W - 2t - 2',
        inputs: { W, t },
        ruleId: 'RULE_ADJ_SHELF_WIDTH',
        description: 'Hareketli raf = iç genişlik − 2mm oyun payı.'
      }
    },
    depth: {
      value: roundDown05(depthVal),
      trace: {
        formula: 'innerDepth - frontPullback',
        inputs: { innerDepth, frontPullback },
        ruleId: 'RULE_ADJ_SHELF_DEPTH',
        description: 'Hareketli raf derinliği = iç derinlik − öne çekme payı (varsayılan 20mm).'
      }
    }
  };
}

export function calcFixedShelf(
  W: number, t: number, innerDepth: number, assemblyType: AssemblyType
): { width: CalcResult; depth: CalcResult } {
  const widthVal = W - 2 * t;
  return {
    width: {
      value: roundDown05(widthVal),
      trace: {
        formula: 'W - 2t',
        inputs: { W, t, assemblyType },
        ruleId: 'RULE_FIXED_SHELF_WIDTH',
        description: 'Sabit raf = iç genişlik (oyun payı yok, sıkı oturur).'
      }
    },
    depth: {
      value: roundDown05(innerDepth),
      trace: {
        formula: 'innerDepth',
        inputs: { innerDepth },
        ruleId: 'RULE_FIXED_SHELF_DEPTH',
        description: 'Sabit raf derinliği = iç derinlik.'
      }
    }
  };
}

export function calcShelfDeflection(
  spanMm: number,
  thicknessMm: number,
  depthMm: number,
  loadKgPerM: number,
  elasticModulusMPa: number,
  limitRatio: number
): { deflection: number; limit: number; passes: boolean; suggestion?: string } {
  const w = (loadKgPerM * 9.81) / 1000;
  const I = (depthMm * Math.pow(thicknessMm, 3)) / 12;
  const deflection = (5 * w * Math.pow(spanMm, 4)) / (384 * elasticModulusMPa * I);
  const limit = spanMm / limitRatio;
  const passes = deflection <= limit;
  let suggestion;
  if (!passes) {
    suggestion = 'Orta dikme ekleyin, 25mm raf kullanın veya önden kuşak ekleyin';
  }
  return { deflection, limit, passes, suggestion };
}
