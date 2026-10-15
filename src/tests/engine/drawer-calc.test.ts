import { describe, it, expect } from 'vitest';
import {
  calcDrawerBoxWidth,
  calcBestRailLength,
  calcDrawerFronts,
  calcDrawerBoxDepth,
  calcDrawerBoxHeight,
} from '../../core/engine/drawer-calc';

describe('drawer-calc', () => {
  describe('calcDrawerBoxWidth', () => {
    it('side mount: innerWidth - 25.4', () => {
      // 764 - 25.4 = 738.6, roundDown05 = 738.5
      const res = calcDrawerBoxWidth(764, 25.4);
      expect(res.value).toBe(738.5);
      expect(res.trace.ruleId).toBe('RULE_DRAWER_BOX_WIDTH');
    });

    it('farklı ray düşüm değeri ile hesaplama', () => {
      const res = calcDrawerBoxWidth(500, 26);
      expect(res.value).toBe(474);
      expect(res.trace.ruleId).toBe('RULE_DRAWER_BOX_WIDTH');
    });

    it('0.5mm aşağı yuvarlama kuralı', () => {
      // 600 - 25.1 = 574.9 → roundDown05 = 574.5
      const res = calcDrawerBoxWidth(600, 25.1);
      expect(res.value).toBe(574.5);
      expect(res.trace.ruleId).toBe('RULE_DRAWER_BOX_WIDTH');
    });
  });

  describe('calcBestRailLength', () => {
    const lengths = [250, 300, 350, 400, 450, 500, 550, 600];

    it('innerDepth 542 → ray 500', () => {
      const res = calcBestRailLength(542, lengths);
      expect(res.value).toBe(500);
      expect(res.trace.ruleId).toBe('RULE_BEST_RAIL_LENGTH');
    });

    it('innerDepth 600 → ray 600 (tam eşleşme)', () => {
      const res = calcBestRailLength(600, lengths);
      expect(res.value).toBe(600);
      expect(res.trace.ruleId).toBe('RULE_BEST_RAIL_LENGTH');
    });

    it('innerDepth 200 → ray 0 (hiçbir ray sığmıyor)', () => {
      const res = calcBestRailLength(200, lengths);
      expect(res.value).toBe(0);
      expect(res.trace.ruleId).toBe('RULE_BEST_RAIL_LENGTH');
    });

    it('boş standart ray listesi → ray 0 döner', () => {
      const res = calcBestRailLength(500, []);
      expect(res.value).toBe(0);
      expect(res.trace.ruleId).toBe('RULE_BEST_RAIL_LENGTH');
    });

    it('sırasız ray listesi verildiğinde de en büyük uygun rayı seçer', () => {
      const unsorted = [500, 250, 450, 350, 600, 300, 400];
      const res = calcBestRailLength(470, unsorted);
      expect(res.value).toBe(450);
      expect(res.trace.ruleId).toBe('RULE_BEST_RAIL_LENGTH');
    });
  });

  describe('calcDrawerFronts', () => {
    it('equal ratios: 3 çekmece, eşit oranlar', () => {
      // 3 drawers, equal ratios, H=720, d=3
      // totalGap = 3 * 3 = 9
      // available = 720 - 9 = 711
      // each = 711/3 = 237
      const r = calcDrawerFronts(720, [1, 1, 1], 3, 3);
      expect(r.heights.length).toBe(3);
      expect(r.heights[0].value).toBe(237);
      expect(r.heights[1].value).toBe(237);
      expect(r.heights[2].value).toBe(237);
      expect(r.heights[0].trace.ruleId).toBe('RULE_DRAWER_FRONT_HEIGHT');
      expect(r.frontWidth.trace.ruleId).toBe('RULE_FRONT_WIDTH');
    });

    it('farklı oranlar: 1:2 oranıyla 2 çekmece', () => {
      // H=720, ratios=[1, 2], d=3, doorCount=2
      // totalGap = 2 * 3 = 6
      // available = 720 - 6 = 714
      // sumRatios = 3
      // front 1 = (1/3) * 714 = 238
      // front 2 = (2/3) * 714 = 476
      const r = calcDrawerFronts(720, [1, 2], 3, 2);
      expect(r.heights.length).toBe(2);
      expect(r.heights[0].value).toBe(238);
      expect(r.heights[1].value).toBe(476);
      expect(r.heights[0].trace.ruleId).toBe('RULE_DRAWER_FRONT_HEIGHT');
      expect(r.heights[1].trace.ruleId).toBe('RULE_DRAWER_FRONT_HEIGHT');
    });

    it('tek çekmece klapası hesabı', () => {
      // H=400, ratios=[1], d=3, doorCount=1
      // available = 400 - 3 = 397
      const r = calcDrawerFronts(400, [1], 3, 1);
      expect(r.heights.length).toBe(1);
      expect(r.heights[0].value).toBe(397);
    });
  });

  describe('calcDrawerBoxDepth', () => {
    it('equals rail length', () => {
      const res = calcDrawerBoxDepth(500);
      expect(res.value).toBe(500);
      expect(res.trace.ruleId).toBe('RULE_DRAWER_BOX_DEPTH');
    });

    it('ondalıklı ray boyu 0.5mm aşağı yuvarlanır', () => {
      const res = calcDrawerBoxDepth(450.7);
      expect(res.value).toBe(450.5);
      expect(res.trace.ruleId).toBe('RULE_DRAWER_BOX_DEPTH');
    });
  });

  describe('calcDrawerBoxHeight', () => {
    it('frontHeight - 25', () => {
      const res = calcDrawerBoxHeight(237);
      expect(res.value).toBe(212);
      expect(res.trace.ruleId).toBe('RULE_DRAWER_BOX_HEIGHT');
    });

    it('ondalıklı klapa yüksekliğinde 0.5mm aşağı yuvarlama', () => {
      // 200.4 - 25 = 175.4 → roundDown05 = 175.0
      const res = calcDrawerBoxHeight(200.4);
      expect(res.value).toBe(175);
      expect(res.trace.ruleId).toBe('RULE_DRAWER_BOX_HEIGHT');
    });
  });
});
