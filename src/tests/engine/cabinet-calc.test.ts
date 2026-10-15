import { describe, it, expect } from 'vitest';
import {
  calcSideHeight,
  calcSideDepth,
  calcBottomWidth,
  calcBottomDepth,
  calcTopWidth,
  calcTopDepth,
  calcRailWidth,
  calcRailDepth,
  calcBackWidth,
  calcBackHeight,
  calcInnerDepth,
  calcInnerWidth,
} from '../../core/engine/cabinet-calc';

describe('cabinet-calc', () => {
  // Yan dikme yüksekliği (calcSideHeight)
  describe('calcSideHeight', () => {
    it('should return H directly', () => {
      const r = calcSideHeight(720);
      expect(r.value).toBe(720);
      expect(r.trace.ruleId).toBe('RULE_SIDE_HEIGHT');
    });

    it('farklı standart gövde yükseklikleri (900mm, 2100mm)', () => {
      const r900 = calcSideHeight(900);
      expect(r900.value).toBe(900);
      expect(r900.trace.ruleId).toBe('RULE_SIDE_HEIGHT');
      expect(r900.trace.formula).toBe('H');

      const r2100 = calcSideHeight(2100);
      expect(r2100.value).toBe(2100);
      expect(r2100.trace.ruleId).toBe('RULE_SIDE_HEIGHT');
    });

    it('ondalıklı yükseklik 0.5mm aşağı yuvarlanır', () => {
      const r = calcSideHeight(720.7);
      expect(r.value).toBe(720.5);
      expect(r.trace.ruleId).toBe('RULE_SIDE_HEIGHT');

      const r2 = calcSideHeight(720.4);
      expect(r2.value).toBe(720);
    });

    it('sıfır yükseklik sınır durumu', () => {
      const r = calcSideHeight(0);
      expect(r.value).toBe(0);
      expect(r.trace.ruleId).toBe('RULE_SIDE_HEIGHT');
    });
  });

  // Yan dikme derinliği (calcSideDepth)
  describe('calcSideDepth', () => {
    it('routed: depth = D (unchanged)', () => {
      const r = calcSideDepth(560, 'routed', 8);
      expect(r.value).toBe(560);
      expect(r.trace.ruleId).toBe('RULE_SIDE_DEPTH_ROUTED');
      expect(r.trace.formula).toBe('D');
    });

    it('nailed: depth = D - backThickness', () => {
      const r = calcSideDepth(560, 'nailed', 3);
      expect(r.value).toBe(557);
      expect(r.trace.ruleId).toBe('RULE_SIDE_DEPTH_NAILED');
      expect(r.trace.formula).toBe('D - backThickness');
    });

    it('çakma arkalık farklı kalınlık (8mm arkalık)', () => {
      const r = calcSideDepth(560, 'nailed', 8);
      expect(r.value).toBe(552);
      expect(r.trace.ruleId).toBe('RULE_SIDE_DEPTH_NAILED');
    });

    it('çakma arkalıkta ondalıklı sonuç 0.5mm aşağı yuvarlanır', () => {
      // 560 - 3.2 = 556.8 → roundDown05 = 556.5
      const r = calcSideDepth(560, 'nailed', 3.2);
      expect(r.value).toBe(556.5);
      expect(r.trace.ruleId).toBe('RULE_SIDE_DEPTH_NAILED');
    });

    it('arkalık kalınlığı 0mm sınır durumu', () => {
      const r = calcSideDepth(560, 'nailed', 0);
      expect(r.value).toBe(560);
      expect(r.trace.ruleId).toBe('RULE_SIDE_DEPTH_NAILED');
    });
  });

  // Taban genişliği (calcBottomWidth)
  describe('calcBottomWidth', () => {
    it('sides_out: W - 2t', () => {
      const r = calcBottomWidth(800, 18, 'sides_out');
      expect(r.value).toBe(764);
      expect(r.trace.ruleId).toBe('RULE_BOTTOM_WIDTH_SIDES_OUT');
      expect(r.trace.formula).toBe('W - 2t');
    });

    it('sides_out 600mm', () => {
      const r = calcBottomWidth(600, 18, 'sides_out');
      expect(r.value).toBe(564);
      expect(r.trace.ruleId).toBe('RULE_BOTTOM_WIDTH_SIDES_OUT');
    });

    it('sides_in: W (full width)', () => {
      const r = calcBottomWidth(800, 18, 'sides_in');
      expect(r.value).toBe(800);
      expect(r.trace.ruleId).toBe('RULE_BOTTOM_WIDTH_SIDES_IN');
      expect(r.trace.formula).toBe('W');
    });

    it('ruleId for sides_out', () => {
      expect(calcBottomWidth(800, 18, 'sides_out').trace.ruleId).toBe('RULE_BOTTOM_WIDTH_SIDES_OUT');
    });

    it('ruleId for sides_in', () => {
      expect(calcBottomWidth(800, 18, 'sides_in').trace.ruleId).toBe('RULE_BOTTOM_WIDTH_SIDES_IN');
    });

    it('farklı gövde et kalınlıkları (16mm ve 19mm)', () => {
      // 16mm: 800 - 32 = 768
      expect(calcBottomWidth(800, 16, 'sides_out').value).toBe(768);
      // 19mm: 800 - 38 = 762
      expect(calcBottomWidth(800, 19, 'sides_out').value).toBe(762);
    });

    it('ondalıklı genişlikte 0.5mm aşağı yuvarlama', () => {
      // 750.7 - 36 = 714.7 → 714.5
      expect(calcBottomWidth(750.7, 18, 'sides_out').value).toBe(714.5);
    });
  });

  // Taban derinliği (calcBottomDepth)
  describe('calcBottomDepth', () => {
    it('routed: same as D', () => {
      const r = calcBottomDepth(560, 'routed', 8);
      expect(r.value).toBe(560);
      expect(r.trace.ruleId).toBe('RULE_SIDE_DEPTH_ROUTED');
    });

    it('nailed: D - backThickness', () => {
      const r = calcBottomDepth(560, 'nailed', 3);
      expect(r.value).toBe(557);
      expect(r.trace.ruleId).toBe('RULE_SIDE_DEPTH_NAILED');
    });

    it('sığ gövde derinliği (300mm çakma arkalık)', () => {
      const r = calcBottomDepth(300, 'nailed', 4);
      expect(r.value).toBe(296);
      expect(r.trace.ruleId).toBe('RULE_SIDE_DEPTH_NAILED');
    });
  });

  // Tepe / Üst tabla genişliği (calcTopWidth)
  describe('calcTopWidth', () => {
    it('sides_out: W - 2t', () => {
      const r = calcTopWidth(800, 18, 'sides_out');
      expect(r.value).toBe(764);
      expect(r.trace.ruleId).toBe('RULE_BOTTOM_WIDTH_SIDES_OUT');
    });

    it('sides_in: W', () => {
      const r = calcTopWidth(800, 18, 'sides_in');
      expect(r.value).toBe(800);
      expect(r.trace.ruleId).toBe('RULE_BOTTOM_WIDTH_SIDES_IN');
    });
  });

  // Tepe / Üst tabla derinliği (calcTopDepth)
  describe('calcTopDepth', () => {
    it('routed: same as D', () => {
      const r = calcTopDepth(560, 'routed', 8);
      expect(r.value).toBe(560);
      expect(r.trace.ruleId).toBe('RULE_SIDE_DEPTH_ROUTED');
    });

    it('nailed: D - backThickness', () => {
      const r = calcTopDepth(560, 'nailed', 3);
      expect(r.value).toBe(557);
      expect(r.trace.ruleId).toBe('RULE_SIDE_DEPTH_NAILED');
    });
  });

  // Kuşak genişliği (calcRailWidth)
  describe('calcRailWidth', () => {
    it('sides_out: W - 2t', () => {
      const r = calcRailWidth(800, 18, 'sides_out');
      expect(r.value).toBe(764);
      expect(r.trace.ruleId).toBe('RULE_RAIL_WIDTH');
      expect(r.trace.formula).toBe('W - 2t');
    });

    it('sides_in: W', () => {
      const r = calcRailWidth(800, 18, 'sides_in');
      expect(r.value).toBe(800);
      expect(r.trace.ruleId).toBe('RULE_RAIL_WIDTH');
      expect(r.trace.formula).toBe('W');
    });

    it('600mm gövde sides_out kuşak genişliği', () => {
      const r = calcRailWidth(600, 18, 'sides_out');
      expect(r.value).toBe(564);
      expect(r.trace.ruleId).toBe('RULE_RAIL_WIDTH');
    });
  });

  // Kuşak derinliği / eni (calcRailDepth)
  describe('calcRailDepth', () => {
    it('returns railWidth as depth', () => {
      const r = calcRailDepth(100);
      expect(r.value).toBe(100);
      expect(r.trace.ruleId).toBe('RULE_RAIL_DEPTH');
      expect(r.trace.formula).toBe('railWidth');
    });

    it('farklı kuşak eni (80mm)', () => {
      const r = calcRailDepth(80);
      expect(r.value).toBe(80);
      expect(r.trace.ruleId).toBe('RULE_RAIL_DEPTH');
    });

    it('ondalıklı kuşak eni 0.5mm aşağı yuvarlanır', () => {
      const r = calcRailDepth(99.8);
      expect(r.value).toBe(99.5);
      expect(r.trace.ruleId).toBe('RULE_RAIL_DEPTH');
    });
  });

  // Arkalık genişliği (calcBackWidth)
  describe('calcBackWidth', () => {
    it('routed: W - 2t + 2*(k-1)', () => {
      // W=800, t=18, k=9 => 800 - 36 + 2*8 = 780
      const r = calcBackWidth(800, 18, 'routed', 9);
      expect(r.value).toBe(780);
      expect(r.trace.ruleId).toBe('RULE_BACK_WIDTH_ROUTED');
      expect(r.trace.formula).toBe('W - 2t + 2*(k-1)');
    });

    it('routed farklı kanal derinliği (k=8mm)', () => {
      // W=800, t=18, k=8 => 800 - 36 + 2*7 = 778
      const r = calcBackWidth(800, 18, 'routed', 8);
      expect(r.value).toBe(778);
      expect(r.trace.ruleId).toBe('RULE_BACK_WIDTH_ROUTED');
    });

    it('routed sınır durumu: k=1mm kanal derinliği', () => {
      // W=800, t=18, k=1 => 800 - 36 + 2*(0) = 764
      const r = calcBackWidth(800, 18, 'routed', 1);
      expect(r.value).toBe(764);
      expect(r.trace.ruleId).toBe('RULE_BACK_WIDTH_ROUTED');
    });

    it('nailed: W - 2t', () => {
      const r = calcBackWidth(800, 18, 'nailed', 0);
      expect(r.value).toBe(764);
      expect(r.trace.ruleId).toBe('RULE_BACK_WIDTH_NAILED');
      expect(r.trace.formula).toBe('W - 2t');
    });

    it('nailed 600mm dolap', () => {
      const r = calcBackWidth(600, 18, 'nailed', 0);
      expect(r.value).toBe(564);
      expect(r.trace.ruleId).toBe('RULE_BACK_WIDTH_NAILED');
    });
  });

  // Arkalık yüksekliği (calcBackHeight)
  describe('calcBackHeight', () => {
    it('routed, sides_out: H - 2t + 2*(k-1)', () => {
      // H=720, t=18, k=9 => 720 - 36 + 16 = 700
      const r = calcBackHeight(720, 18, 'sides_out', 'routed', 9, false);
      expect(r.value).toBe(700);
      expect(r.trace.ruleId).toBe('RULE_BACK_HEIGHT');
      expect(r.trace.formula).toBe('H - 2t + 2*(k-1)');
    });

    it('routed, sides_in: H - 2t + 2*(k-1)', () => {
      // H=720, t=18, k=9 => 720 - 36 + 16 = 700
      const r = calcBackHeight(720, 18, 'sides_in', 'routed', 9, false);
      expect(r.value).toBe(700);
      expect(r.trace.ruleId).toBe('RULE_BACK_HEIGHT');
      expect(r.trace.formula).toBe('H - 2t + 2*(k-1)');
    });

    it('nailed, sides_out: H - 2t', () => {
      const r = calcBackHeight(720, 18, 'sides_out', 'nailed', 0, false);
      expect(r.value).toBe(684);
      expect(r.trace.ruleId).toBe('RULE_BACK_HEIGHT');
      expect(r.trace.formula).toBe('H - 2t');
    });

    it('nailed, sides_in: H', () => {
      const r = calcBackHeight(720, 18, 'sides_in', 'nailed', 0, false);
      expect(r.value).toBe(720);
      expect(r.trace.ruleId).toBe('RULE_BACK_HEIGHT');
      expect(r.trace.formula).toBe('H');
    });

    it('isBaseWithRails parametresi trace içine doğru aktarılır', () => {
      const r = calcBackHeight(720, 18, 'sides_out', 'routed', 9, true);
      expect(r.value).toBe(700);
      expect(r.trace.inputs.isBaseWithRails).toBe(true);
    });
  });

  // Gövde iç derinliği (calcInnerDepth)
  describe('calcInnerDepth', () => {
    it('D - g - backThickness', () => {
      // D=560, g=10, back=8 => 542
      const r = calcInnerDepth(560, 10, 8);
      expect(r.value).toBe(542);
      expect(r.trace.ruleId).toBe('RULE_INNER_DEPTH');
      expect(r.trace.formula).toBe('D - g - backThickness');
    });

    it('farklı kanal mesafesi ve arkalık kalınlığı (D=350, g=15, back=3)', () => {
      // 350 - 15 - 3 = 332
      const r = calcInnerDepth(350, 15, 3);
      expect(r.value).toBe(332);
      expect(r.trace.ruleId).toBe('RULE_INNER_DEPTH');
    });

    it('sıfır pay sınır durumu (g=0, back=0)', () => {
      const r = calcInnerDepth(560, 0, 0);
      expect(r.value).toBe(560);
      expect(r.trace.ruleId).toBe('RULE_INNER_DEPTH');
    });

    it('ondalıklı değerlerde 0.5mm aşağı yuvarlama', () => {
      // 560 - 10.3 - 8 = 541.7 → 541.5
      const r = calcInnerDepth(560, 10.3, 8);
      expect(r.value).toBe(541.5);
      expect(r.trace.ruleId).toBe('RULE_INNER_DEPTH');
    });
  });

  // Gövde iç genişliği (calcInnerWidth)
  describe('calcInnerWidth', () => {
    it('W - 2t', () => {
      const r = calcInnerWidth(800, 18, 'sides_out');
      expect(r.value).toBe(764);
      expect(r.trace.ruleId).toBe('RULE_INNER_WIDTH');
      expect(r.trace.formula).toBe('W - 2t');
    });

    it('sides_in: also W - 2t', () => {
      const r = calcInnerWidth(800, 18, 'sides_in');
      expect(r.value).toBe(764);
      expect(r.trace.ruleId).toBe('RULE_INNER_WIDTH');
    });

    it('600mm dolap 18mm malzeme', () => {
      const r = calcInnerWidth(600, 18, 'sides_out');
      expect(r.value).toBe(564);
      expect(r.trace.ruleId).toBe('RULE_INNER_WIDTH');
    });

    it('16mm gövde et kalınlığı', () => {
      // 600 - 32 = 568
      const r = calcInnerWidth(600, 16, 'sides_out');
      expect(r.value).toBe(568);
      expect(r.trace.ruleId).toBe('RULE_INNER_WIDTH');
    });
  });
});
