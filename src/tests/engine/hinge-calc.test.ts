import { describe, it, expect } from 'vitest';
import {
  calcHingeCount,
  calcHingePositions,
  getHingeType,
  checkHingeRailClash,
} from '../../core/engine/hinge-calc';

const defaultCountTable = [
  { minHeight: 0, maxHeight: 900, count: 2 },
  { minHeight: 901, maxHeight: 1600, count: 3 },
  { minHeight: 1601, maxHeight: 2000, count: 4 },
  { minHeight: 2001, maxHeight: Infinity, count: 5 },
];

describe('hinge-calc', () => {
  // Menteşe adedi hesabı (calcHingeCount)
  describe('calcHingeCount', () => {
    it('717mm kapak → 2 menteşe', () => {
      expect(calcHingeCount(717, 400, defaultCountTable, 600).value).toBe(2);
    });

    it('900mm kapak → 2 menteşe', () => {
      expect(calcHingeCount(900, 400, defaultCountTable, 600).value).toBe(2);
    });

    it('1000mm kapak → 3 menteşe', () => {
      expect(calcHingeCount(1000, 400, defaultCountTable, 600).value).toBe(3);
    });

    it('1800mm kapak → 4 menteşe', () => {
      expect(calcHingeCount(1800, 400, defaultCountTable, 600).value).toBe(4);
    });

    it('2100mm kapak → 5 menteşe', () => {
      expect(calcHingeCount(2100, 400, defaultCountTable, 600).value).toBe(5);
    });

    it('tablo sınır değerleri (901mm, 1600mm, 1601mm, 2000mm, 2001mm)', () => {
      expect(calcHingeCount(901, 400, defaultCountTable, 600).value).toBe(3);
      expect(calcHingeCount(1600, 400, defaultCountTable, 600).value).toBe(3);
      expect(calcHingeCount(1601, 400, defaultCountTable, 600).value).toBe(4);
      expect(calcHingeCount(2000, 400, defaultCountTable, 600).value).toBe(4);
      expect(calcHingeCount(2001, 400, defaultCountTable, 600).value).toBe(5);
    });

    it('geniş kapak (>600mm) → +1', () => {
      expect(calcHingeCount(717, 700, defaultCountTable, 600).value).toBe(3);
    });

    it('genişlik tam eşik değerinde (600mm) ilave menteşe eklenmez', () => {
      expect(calcHingeCount(717, 600, defaultCountTable, 600).value).toBe(2);
    });

    it('genişlik eşiği 1mm aşıldığında (601mm) ilave menteşe eklenir', () => {
      expect(calcHingeCount(717, 601, defaultCountTable, 600).value).toBe(3);
    });

    it('trace ruleId ve formül kontrolü', () => {
      const res = calcHingeCount(717, 400, defaultCountTable, 600);
      expect(res.trace.ruleId).toBe('RULE_HINGE_COUNT');
      expect(res.trace.formula).toBe('lookup(countTable) + (doorWidth > extraHingeWidthMm ? 1 : 0)');
    });
  });

  // Menteşe pozisyonları hesabı (calcHingePositions)
  describe('calcHingePositions', () => {
    it('2 menteşe: üst ve alt', () => {
      const pos = calcHingePositions(717, 2, 90);
      expect(pos.length).toBe(2);
      expect(pos[0]).toBe(90);
      expect(pos[1]).toBe(627);
    });

    it('3 menteşe: eşit dağılım', () => {
      const pos = calcHingePositions(1200, 3, 90);
      expect(pos.length).toBe(3);
      expect(pos[0]).toBe(90);
      expect(pos[2]).toBe(1110);
      // orta menteşe tam ortada
      expect(pos[1]).toBe(600);
    });

    it('4 menteşe: eşit aralıklı dağılım', () => {
      // doorHeight=2000, inset=100 → start=100, end=1900, step=600
      const pos = calcHingePositions(2000, 4, 100);
      expect(pos.length).toBe(4);
      expect(pos[0]).toBe(100);
      expect(pos[1]).toBe(700);
      expect(pos[2]).toBe(1300);
      expect(pos[3]).toBe(1900);
    });

    it('tek menteşe veya <2 durumu: kapağın tam ortasında tek pozisyon döner', () => {
      const pos1 = calcHingePositions(600, 1, 90);
      expect(pos1).toEqual([300]);

      const pos0 = calcHingePositions(600, 0, 90);
      expect(pos0).toEqual([300]);
    });

    it('ondalıklı ara pozisyonlar 0.5mm aşağı yuvarlanır', () => {
      // 717mm kapak, 3 menteşe, inset 90 → start=90, end=627, mid=90 + 268.5 = 358.5
      const pos = calcHingePositions(717, 3, 90);
      expect(pos.length).toBe(3);
      expect(pos[0]).toBe(90);
      expect(pos[1]).toBe(358.5);
      expect(pos[2]).toBe(627);
    });
  });

  // Menteşe tipi adı (getHingeType)
  describe('getHingeType', () => {
    it('full → Düz', () => {
      expect(getHingeType('full')).toBe('Düz (Tam Bindirme)');
      expect(getHingeType('full')).toContain('Tam Bindirme');
    });

    it('half → Yarım', () => {
      expect(getHingeType('half')).toBe('Yarım Çıkma');
      expect(getHingeType('half')).toContain('Yarım');
    });

    it('inset → Gömme', () => {
      expect(getHingeType('inset')).toBe('Gömme');
      expect(getHingeType('inset')).toContain('Gömme');
    });
  });

  // Menteşe ve çekmece rayı çakışma kontrolü (checkHingeRailClash)
  describe('checkHingeRailClash', () => {
    it('no clash when positions are far apart', () => {
      const r = checkHingeRailClash([90, 627], [200], 720, 50);
      expect(r.clashes).toBe(false);
      expect(r.details.length).toBe(0);
    });

    it('clash when positions are close', () => {
      // hinge at 90 from top = 720-90=630 from bottom, drawer at 620 from bottom
      const r = checkHingeRailClash([90], [630], 720, 50);
      expect(r.clashes).toBe(true);
      expect(r.details.length).toBeGreaterThan(0);
      expect(r.details[0]).toBe('Menteşe (Y: 630) ile Ray (Y: 630) çakışıyor.');
    });

    it('tolerans sınır durumu: tam tolerans mesafesinde (|hY - dY| === tolerance) çakışma algılanır', () => {
      // hY = 720 - 90 = 630. dY = 580. Fark: 50 <= 50
      const r = checkHingeRailClash([90], [580], 720, 50);
      expect(r.clashes).toBe(true);
      expect(r.details.length).toBe(1);
    });

    it('toleransın 1mm dışında (|hY - dY| > tolerance) çakışma algılanmaz', () => {
      // hY = 720 - 90 = 630. dY = 579. Fark: 51 > 50
      const r = checkHingeRailClash([90], [579], 720, 50);
      expect(r.clashes).toBe(false);
      expect(r.details.length).toBe(0);
    });

    it('birden fazla menteşe ve çekmece rayı çakıştığında tüm çakışmaları raporlar', () => {
      // hY: 720 - 90 = 630, 720 - 627 = 93
      // drawerY: 630 ve 95 (tolerance: 20)
      const r = checkHingeRailClash([90, 627], [630, 95], 720, 20);
      expect(r.clashes).toBe(true);
      expect(r.details.length).toBe(2);
      expect(r.details[0]).toContain('Menteşe (Y: 630) ile Ray (Y: 630) çakışıyor.');
      expect(r.details[1]).toContain('Menteşe (Y: 93) ile Ray (Y: 95) çakışıyor.');
    });
  });
});
