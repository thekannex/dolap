import { describe, it, expect } from 'vitest';
import {
  calcSideMountDrawerWidth,
  findBestRailLength,
  checkRailFit,
} from '../../core/engine/rail-calc';

describe('rail-calc', () => {
  describe('calcSideMountDrawerWidth', () => {
    it('764 - 25.4 = 738.5', () => {
      const res = calcSideMountDrawerWidth(764, 25.4);
      expect(res.value).toBe(738.5);
      expect(res.trace.ruleId).toBe('RULE_DRAWER_BOX_WIDTH');
    });

    it('farklı düşüm değeri ile çekmece kutu genişliği', () => {
      const res = calcSideMountDrawerWidth(500, 26);
      expect(res.value).toBe(474);
      expect(res.trace.ruleId).toBe('RULE_DRAWER_BOX_WIDTH');
    });

    it('0.5mm aşağı yuvarlama kontrolü', () => {
      // 550 - 25.2 = 524.8 → roundDown05 = 524.5
      const res = calcSideMountDrawerWidth(550, 25.2);
      expect(res.value).toBe(524.5);
      expect(res.trace.ruleId).toBe('RULE_DRAWER_BOX_WIDTH');
    });
  });

  describe('findBestRailLength', () => {
    const standardLengths = [250, 300, 350, 400, 450, 500, 550, 600];

    it('innerDepth 542 → ray 500', () => {
      const res = findBestRailLength(542, standardLengths);
      expect(res.value).toBe(500);
      expect(res.trace.ruleId).toBe('RULE_BEST_RAIL_LENGTH');
    });

    it('innerDepth 600 → ray 600 (tam sınır değeri)', () => {
      const res = findBestRailLength(600, standardLengths);
      expect(res.value).toBe(600);
      expect(res.trace.ruleId).toBe('RULE_BEST_RAIL_LENGTH');
    });

    it('innerDepth 200 → ray 0 (hiçbir ray sığmıyor)', () => {
      const res = findBestRailLength(200, standardLengths);
      expect(res.value).toBe(0);
      expect(res.trace.ruleId).toBe('RULE_BEST_RAIL_LENGTH');
    });

    it('karışık sıralı standart ray listesi verildiğinde en uygun rayı seçer', () => {
      const unsorted = [600, 350, 500, 250, 450, 300, 400];
      const res = findBestRailLength(480, unsorted);
      expect(res.value).toBe(450);
      expect(res.trace.ruleId).toBe('RULE_BEST_RAIL_LENGTH');
    });
  });

  describe('checkRailFit', () => {
    it('rail fits: ray boyu iç derinlikten küçük olduğunda uyar', () => {
      const res = checkRailFit(542, 500);
      expect(res.fits).toBe(true);
      expect(res.message).toBe('Ray sığıyor.');
    });

    it('rail does not fit: ray boyu iç derinlikten büyük olduğunda sığmaz', () => {
      const res = checkRailFit(400, 500);
      expect(res.fits).toBe(false);
      expect(res.message).toBe('Ray boyu iç derinliği aşıyor.');
    });

    it('sınır durumu: ray boyu iç derinliğe tam eşit olduğunda sığar', () => {
      const res = checkRailFit(500, 500);
      expect(res.fits).toBe(true);
      expect(res.message).toBe('Ray sığıyor.');
    });
  });
});
