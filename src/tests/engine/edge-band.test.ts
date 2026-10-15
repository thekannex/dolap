import { describe, it, expect } from 'vitest';
import { applyEdgeBandDeduction, calcTotalBandMeters } from '../../core/engine/edge-band';
import type { EdgeBanding } from '../../core/models/part';

const band2mm = (deducted = false) => ({ thickness: 2, materialId: 'eb-2', deducted });
const band04mm = (deducted = false) => ({ thickness: 0.4, materialId: 'eb-04', deducted });
const band08mm = (deducted = false) => ({ thickness: 0.8, materialId: 'eb-08', deducted });
const band1mm = (deducted = false) => ({ thickness: 1, materialId: 'eb-1', deducted });

describe('edge-band', () => {
  describe('applyEdgeBandDeduction', () => {
    it('2mm bant, 4 kenar, 397×717 → kesim 393×713', () => {
      const eb: EdgeBanding = {
        top: band2mm(),
        bottom: band2mm(),
        left: band2mm(),
        right: band2mm(),
      };
      const r = applyEdgeBandDeduction(397, 717, eb, 0.8);
      expect(r.cutLength.value).toBe(393);
      expect(r.cutWidth.value).toBe(713);
      expect(r.cutLength.trace.ruleId).toBe('RULE_EDGE_BAND_DEDUCTION');
      expect(r.cutWidth.trace.ruleId).toBe('RULE_EDGE_BAND_DEDUCTION');
    });

    it('0.4mm bantta düşüm yapılmaz', () => {
      const eb: EdgeBanding = {
        top: band04mm(),
        bottom: band04mm(),
        left: band04mm(),
        right: band04mm(),
      };
      const r = applyEdgeBandDeduction(397, 717, eb, 0.8);
      expect(r.cutLength.value).toBe(397);
      expect(r.cutWidth.value).toBe(717);
      expect(r.cutLength.trace.ruleId).toBe('RULE_EDGE_BAND_DEDUCTION');
      expect(r.cutWidth.trace.ruleId).toBe('RULE_EDGE_BAND_DEDUCTION');
    });

    it('0.8mm bant: eşik değerin kendisi → düşüm uygulanır', () => {
      const eb: EdgeBanding = {
        top: band08mm(),
        bottom: band08mm(),
        left: band08mm(),
        right: band08mm(),
      };
      const r = applyEdgeBandDeduction(400, 700, eb, 0.8);
      // cutLength = 400 - 0.8 - 0.8 = 398.4 → roundDown05(398.4) = 398.0
      // cutWidth = 700 - 0.8 - 0.8 = 698.4 → roundDown05(698.4) = 698.0
      expect(r.cutLength.value).toBe(398);
      expect(r.cutWidth.value).toBe(698);
      expect(r.cutLength.trace.ruleId).toBe('RULE_EDGE_BAND_DEDUCTION');
      expect(r.cutWidth.trace.ruleId).toBe('RULE_EDGE_BAND_DEDUCTION');
    });

    it('karışık bant kalınlıkları', () => {
      const eb: EdgeBanding = {
        top: band2mm(),     // cutWidth'den düşülür
        bottom: band04mm(), // cutWidth'den düşülmez (0.4 < 0.8)
        left: band2mm(),    // cutLength'den düşülür
        right: null,        // bant yok
      };
      const r = applyEdgeBandDeduction(500, 800, eb, 0.8);
      // cutLength = 500 - 2 (left) - 0 (right null) = 498
      expect(r.cutLength.value).toBe(498);
      // cutWidth = 800 - 2 (top) - 0 (bottom 0.4 < 0.8) = 798
      expect(r.cutWidth.value).toBe(798);
      expect(r.cutLength.trace.ruleId).toBe('RULE_EDGE_BAND_DEDUCTION');
      expect(r.cutWidth.trace.ruleId).toBe('RULE_EDGE_BAND_DEDUCTION');
    });

    it('bant yok → düşüm yok', () => {
      const eb: EdgeBanding = {
        top: null,
        bottom: null,
        left: null,
        right: null,
      };
      const r = applyEdgeBandDeduction(500, 800, eb, 0.8);
      expect(r.cutLength.value).toBe(500);
      expect(r.cutWidth.value).toBe(800);
      expect(r.cutLength.trace.ruleId).toBe('RULE_EDGE_BAND_DEDUCTION');
      expect(r.cutWidth.trace.ruleId).toBe('RULE_EDGE_BAND_DEDUCTION');
    });

    it('eşik değer bant kalınlığından büyük olduğunda düşüm yapılmaz', () => {
      const eb: EdgeBanding = {
        top: band08mm(),
        bottom: band08mm(),
        left: band08mm(),
        right: band08mm(),
      };
      const r = applyEdgeBandDeduction(400, 700, eb, 1.0);
      // 0.8 < 1.0 olduğu için düşüm uygulanmaz
      expect(r.cutLength.value).toBe(400);
      expect(r.cutWidth.value).toBe(700);
    });

    it('tek kenarda bant olduğunda doğru düşüm yapılır', () => {
      const eb: EdgeBanding = {
        top: null,
        bottom: null,
        left: null,
        right: band1mm(),
      };
      const r = applyEdgeBandDeduction(600, 400, eb, 0.8);
      expect(r.cutLength.value).toBe(599);
      expect(r.cutWidth.value).toBe(400);
    });

    it('trace ruleId ve inputs doğruluğu', () => {
      const eb: EdgeBanding = {
        top: band2mm(),
        bottom: band2mm(),
        left: band2mm(),
        right: band2mm(),
      };
      const r = applyEdgeBandDeduction(397, 717, eb, 0.8);
      expect(r.cutLength.trace.ruleId).toBe('RULE_EDGE_BAND_DEDUCTION');
      expect(r.cutLength.trace.formula).toBe('netLength - left_deduction - right_deduction');
      expect(r.cutWidth.trace.ruleId).toBe('RULE_EDGE_BAND_DEDUCTION');
      expect(r.cutWidth.trace.formula).toBe('netWidth - top_deduction - bottom_deduction');
    });
  });

  describe('calcTotalBandMeters', () => {
    it('fire payı ile birlikte toplam bant metresi hesaplar', () => {
      const eb: EdgeBanding = {
        top: band2mm(),
        bottom: band2mm(),
        left: band2mm(),
        right: band2mm(),
      };
      const parts = [
        { length: 1000, width: 500, edgeBanding: eb, quantity: 2 },
      ];
      const result = calcTotalBandMeters(parts, 10);
      // top and bottom: each 1000mm * 2 qty = 2m each = 4m for top+bottom
      // left and right: each 500mm * 2 qty = 1m each = 2m for left+right
      // total for 2mm band: 6m
      // with 10% fire: 6.6m
      const entry = result.get('2-eb-2');
      expect(entry).toBeDefined();
      expect(entry!.thickness).toBe(2);
      expect(entry!.totalMeters).toBeCloseTo(6, 1);
      expect(entry!.withFire).toBeCloseTo(6.6, 1);
    });

    it('boş parça listesi → boş harita döner', () => {
      const result = calcTotalBandMeters([], 10);
      expect(result.size).toBe(0);
    });

    it('farklı bant türlerini ayrı gruplar', () => {
      const eb1: EdgeBanding = {
        top: band2mm(),
        bottom: band2mm(),
        left: null,
        right: null,
      };
      const eb2: EdgeBanding = {
        top: null,
        bottom: null,
        left: band04mm(),
        right: band04mm(),
      };
      const parts = [
        { length: 1000, width: 500, edgeBanding: eb1, quantity: 1 },
        { length: 1000, width: 500, edgeBanding: eb2, quantity: 2 },
      ];
      const result = calcTotalBandMeters(parts, 0);

      expect(result.size).toBe(2);
      const entry2mm = result.get('2-eb-2');
      expect(entry2mm).toBeDefined();
      expect(entry2mm!.totalMeters).toBeCloseTo(2, 1); // 2 * 1000mm * 1 qty = 2m
      expect(entry2mm!.withFire).toBeCloseTo(2, 1);

      const entry04mm = result.get('0.4-eb-04');
      expect(entry04mm).toBeDefined();
      expect(entry04mm!.totalMeters).toBeCloseTo(2, 1); // 2 * 500mm * 2 qty = 2m
      expect(entry04mm!.withFire).toBeCloseTo(2, 1);
    });

    it('aynı banta sahip birden fazla parçayı biriktirir', () => {
      const eb: EdgeBanding = {
        top: band2mm(),
        bottom: null,
        left: null,
        right: null,
      };
      const parts = [
        { length: 1000, width: 500, edgeBanding: eb, quantity: 1 },
        { length: 2000, width: 500, edgeBanding: eb, quantity: 2 },
      ];
      const result = calcTotalBandMeters(parts, 5);
      const entry = result.get('2-eb-2');
      // part 1: 1000mm * 1 = 1m
      // part 2: 2000mm * 2 = 4m
      // total: 5m, with 5% fire: 5.25m
      expect(entry).toBeDefined();
      expect(entry!.totalMeters).toBeCloseTo(5, 2);
      expect(entry!.withFire).toBeCloseTo(5.25, 2);
    });

    it('hiçbir kenarında bant olmayan parçalar haritaya eklenmez', () => {
      const noBand: EdgeBanding = { top: null, bottom: null, left: null, right: null };
      const parts = [{ length: 1000, width: 500, edgeBanding: noBand, quantity: 3 }];
      const result = calcTotalBandMeters(parts, 10);
      expect(result.size).toBe(0);
    });
  });
});
