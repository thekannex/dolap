import { describe, it, expect } from 'vitest';
import {
  calcAdjustableShelf,
  calcFixedShelf,
  calcShelfDeflection,
} from '../../core/engine/shelf-calc';

describe('shelf-calc', () => {
  // Hareketli raf hesabı (calcAdjustableShelf)
  describe('calcAdjustableShelf', () => {
    it('800mm dolap: genişlik 762, derinlik 522', () => {
      // W=800, t=18, innerDepth=542, frontPullback=20
      const r = calcAdjustableShelf(800, 18, 542, 20);
      expect(r.width.value).toBe(762);
      expect(r.depth.value).toBe(522);
    });

    it('600mm dolap: genişlik 562', () => {
      const r = calcAdjustableShelf(600, 18, 542, 20);
      expect(r.width.value).toBe(562);
      expect(r.depth.value).toBe(522);
    });

    it('trace ruleId', () => {
      const r = calcAdjustableShelf(800, 18, 542, 20);
      expect(r.width.trace.ruleId).toBe('RULE_ADJ_SHELF_WIDTH');
      expect(r.width.trace.formula).toBe('W - 2t - 2');
      expect(r.depth.trace.ruleId).toBe('RULE_ADJ_SHELF_DEPTH');
      expect(r.depth.trace.formula).toBe('innerDepth - frontPullback');
    });

    it('farklı gövde et kalınlığı (16mm)', () => {
      // 800 - 32 - 2 = 766
      const r = calcAdjustableShelf(800, 16, 542, 20);
      expect(r.width.value).toBe(766);
    });

    it('öne çekme payı sıfır sınır durumu (frontPullback = 0)', () => {
      const r = calcAdjustableShelf(800, 18, 542, 0);
      expect(r.depth.value).toBe(542);
    });

    it('ondalıklı genişlikte 0.5mm aşağı yuvarlama kontrolü', () => {
      // 750.7 - 36 - 2 = 712.7 → roundDown05 = 712.5
      const r = calcAdjustableShelf(750.7, 18, 542, 20);
      expect(r.width.value).toBe(712.5);
    });
  });

  // Sabit raf hesabı (calcFixedShelf)
  describe('calcFixedShelf', () => {
    it('800mm dolap: genişlik 764', () => {
      const r = calcFixedShelf(800, 18, 542, 'sides_out');
      expect(r.width.value).toBe(764);
      expect(r.depth.value).toBe(542);
      expect(r.width.trace.ruleId).toBe('RULE_FIXED_SHELF_WIDTH');
      expect(r.width.trace.formula).toBe('W - 2t');
      expect(r.depth.trace.ruleId).toBe('RULE_FIXED_SHELF_DEPTH');
      expect(r.depth.trace.formula).toBe('innerDepth');
    });

    it('sides_in montaj tipi: iç genişlik aynı kalır', () => {
      const r = calcFixedShelf(800, 18, 542, 'sides_in');
      expect(r.width.value).toBe(764);
      expect(r.depth.value).toBe(542);
    });

    it('600mm dolap 500mm derinlik', () => {
      const r = calcFixedShelf(600, 18, 500, 'sides_out');
      expect(r.width.value).toBe(564);
      expect(r.depth.value).toBe(500);
    });

    it('ondalıklı genişlikte 0.5mm aşağı yuvarlama', () => {
      // 750.7 - 36 = 714.7 → 714.5
      const r = calcFixedShelf(750.7, 18, 542, 'sides_out');
      expect(r.width.value).toBe(714.5);
    });
  });

  // Raf sehimi hesabı (calcShelfDeflection)
  describe('calcShelfDeflection', () => {
    it('1000mm 18mm yonga, 20kg/m → sehim uyarısı', () => {
      // span=1000, t=18, depth=542, load=20, E=2800, limit=300
      const r = calcShelfDeflection(1000, 18, 542, 20, 2800, 300);
      expect(r.passes).toBe(false);
      expect(r.suggestion).toBeDefined();
      expect(r.suggestion).toBe('Orta dikme ekleyin, 25mm raf kullanın veya önden kuşak ekleyin');
      expect(r.deflection).toBeGreaterThan(r.limit);
    });

    it('short span should pass', () => {
      const r = calcShelfDeflection(400, 18, 542, 20, 2800, 300);
      expect(r.passes).toBe(true);
      expect(r.suggestion).toBeUndefined();
      expect(r.deflection).toBeLessThanOrEqual(r.limit);
    });

    it('deflection formula is correct', () => {
      // Manual calculation: w = 20*9.81/1000 = 0.1962 N/mm
      // I = 542 * 18^3 / 12 = 542 * 5832 / 12 = 263412
      // delta = 5 * 0.1962 * 1000^4 / (384 * 2800 * 263412)
      // = 981000000000 / (283336396800) = 3.46...
      // limit = 1000/300 = 3.33...
      const r = calcShelfDeflection(1000, 18, 542, 20, 2800, 300);
      expect(r.deflection).toBeCloseTo(3.46, 1);
      expect(r.limit).toBeCloseTo(3.33, 1);
    });

    it('25mm raf kalınlığı kullanıldığında sehim sınırını geçer (passes: true)', () => {
      // 1000mm açıklıkta 25mm kalınlık sehimi kurtarır
      const r = calcShelfDeflection(1000, 25, 542, 20, 2800, 300);
      expect(r.passes).toBe(true);
      expect(r.suggestion).toBeUndefined();
    });

    it('sıfır yük sınır durumu (loadKgPerM = 0)', () => {
      const r = calcShelfDeflection(1000, 18, 542, 0, 2800, 300);
      expect(r.deflection).toBe(0);
      expect(r.passes).toBe(true);
      expect(r.suggestion).toBeUndefined();
    });
  });
});
