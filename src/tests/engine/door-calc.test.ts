import { describe, it, expect } from 'vitest';
import {
  calcFullOverlayDoorWidth,
  calcFullOverlayDoorHeight,
  calcInsetDoorWidth,
  calcInsetDoorHeight,
  calcHalfOverlayDoorWidth,
  suggestDoorCount,
  suggestOpenDirection,
} from '../../core/engine/door-calc';

describe('door-calc', () => {
  // Tam bindirme kapak genişliği (calcFullOverlayDoorWidth)
  describe('calcFullOverlayDoorWidth', () => {
    it('600mm tek kapak: 597', () => {
      const r = calcFullOverlayDoorWidth(600, 1, 3);
      expect(r.value).toBe(597);
      expect(r.trace.ruleId).toBe('RULE_DOOR_FULL_WIDTH');
      expect(r.trace.formula).toBe('W / doorCount - d');
    });

    it('800mm çift kapak: 397', () => {
      const r = calcFullOverlayDoorWidth(800, 2, 3);
      expect(r.value).toBe(397);
      expect(r.trace.ruleId).toBe('RULE_DOOR_FULL_WIDTH');
    });

    it('1000mm çift kapak: 497', () => {
      const r = calcFullOverlayDoorWidth(1000, 2, 3);
      expect(r.value).toBe(497);
      expect(r.trace.ruleId).toBe('RULE_DOOR_FULL_WIDTH');
    });

    it('900mm 3 kapaklı dolap', () => {
      // 900 / 3 - 3 = 297
      const r = calcFullOverlayDoorWidth(900, 3, 3);
      expect(r.value).toBe(297);
      expect(r.trace.ruleId).toBe('RULE_DOOR_FULL_WIDTH');
    });

    it('trace has correct ruleId', () => {
      expect(calcFullOverlayDoorWidth(600, 1, 3).trace.ruleId).toBe('RULE_DOOR_FULL_WIDTH');
    });

    it('derz boşluğu sıfır sınır durumu (d = 0)', () => {
      const r = calcFullOverlayDoorWidth(600, 1, 0);
      expect(r.value).toBe(600);
    });

    it('ondalıklı sonuçta 0.5mm aşağı yuvarlama kontrolü', () => {
      // 755 / 2 - 3 = 377.5 - 3 = 374.5
      const r = calcFullOverlayDoorWidth(755, 2, 3);
      expect(r.value).toBe(374.5);
    });
  });

  // Tam bindirme kapak yüksekliği (calcFullOverlayDoorHeight)
  describe('calcFullOverlayDoorHeight', () => {
    it('720mm gövde: 717', () => {
      const r = calcFullOverlayDoorHeight(720, 3);
      expect(r.value).toBe(717);
      expect(r.trace.ruleId).toBe('RULE_DOOR_FULL_HEIGHT');
      expect(r.trace.formula).toBe('H - d');
    });

    it('900mm gövde: 897', () => {
      const r = calcFullOverlayDoorHeight(900, 3);
      expect(r.value).toBe(897);
      expect(r.trace.ruleId).toBe('RULE_DOOR_FULL_HEIGHT');
    });

    it('2100mm boy dolap 4mm derz', () => {
      const r = calcFullOverlayDoorHeight(2100, 4);
      expect(r.value).toBe(2096);
      expect(r.trace.ruleId).toBe('RULE_DOOR_FULL_HEIGHT');
    });

    it('derz boşluğu sıfır sınır durumu', () => {
      const r = calcFullOverlayDoorHeight(720, 0);
      expect(r.value).toBe(720);
    });

    it('ondalıklı yükseklikte 0.5mm aşağı yuvarlama', () => {
      // 720.7 - 3 = 717.7 → roundDown05 = 717.5
      const r = calcFullOverlayDoorHeight(720.7, 3);
      expect(r.value).toBe(717.5);
    });
  });

  // Gömme kapak genişliği (calcInsetDoorWidth)
  describe('calcInsetDoorWidth', () => {
    it('764mm iç genişlik, tek kapak: 758', () => {
      // 764 / 1 - 2*3 = 758
      const r = calcInsetDoorWidth(764, 3, 1);
      expect(r.value).toBe(758);
      expect(r.trace.ruleId).toBe('RULE_DOOR_INSET_WIDTH');
      expect(r.trace.formula).toBe('innerWidth / doorCount - 2*d');
    });

    it('764mm iç genişlik, çift kapak: 376', () => {
      // 764 / 2 - 2*3 = 382 - 6 = 376
      const r = calcInsetDoorWidth(764, 3, 2);
      expect(r.value).toBe(376);
      expect(r.trace.ruleId).toBe('RULE_DOOR_INSET_WIDTH');
    });

    it('564mm iç genişlik, tek kapak, 2mm derz', () => {
      // 564 / 1 - 2*2 = 560
      const r = calcInsetDoorWidth(564, 2, 1);
      expect(r.value).toBe(560);
      expect(r.trace.ruleId).toBe('RULE_DOOR_INSET_WIDTH');
    });

    it('derz sıfır sınır durumu', () => {
      const r = calcInsetDoorWidth(764, 0, 1);
      expect(r.value).toBe(764);
    });
  });

  // Gömme kapak yüksekliği (calcInsetDoorHeight)
  describe('calcInsetDoorHeight', () => {
    it('684mm iç yükseklik: 678', () => {
      // 684 - 2*3 = 678
      const r = calcInsetDoorHeight(684, 3);
      expect(r.value).toBe(678);
      expect(r.trace.ruleId).toBe('RULE_DOOR_INSET_HEIGHT');
      expect(r.trace.formula).toBe('innerHeight - 2*d');
    });

    it('864mm iç yükseklik, 2mm derz: 860', () => {
      const r = calcInsetDoorHeight(864, 2);
      expect(r.value).toBe(860);
      expect(r.trace.ruleId).toBe('RULE_DOOR_INSET_HEIGHT');
    });

    it('2000mm iç yükseklik, 3mm derz', () => {
      // 2000 - 6 = 1994
      const r = calcInsetDoorHeight(2000, 3);
      expect(r.value).toBe(1994);
      expect(r.trace.ruleId).toBe('RULE_DOOR_INSET_HEIGHT');
    });

    it('derz sıfır sınır durumu', () => {
      const r = calcInsetDoorHeight(684, 0);
      expect(r.value).toBe(684);
    });
  });

  // Yarım bindirme kapak genişliği (calcHalfOverlayDoorWidth)
  describe('calcHalfOverlayDoorWidth', () => {
    it('800mm, d=3, overlay=9: 406', () => {
      // 800/2 - 3 + 9 = 400 - 3 + 9 = 406
      const r = calcHalfOverlayDoorWidth(800, 3, 9);
      expect(r.value).toBe(406);
      expect(r.trace.ruleId).toBe('RULE_DOOR_HALF_WIDTH');
      expect(r.trace.formula).toBe('W/2 - d + halfOverlayAmount');
    });

    it('600mm dolap, d=2, overlay=8', () => {
      // 600/2 - 2 + 8 = 300 - 2 + 8 = 306
      const r = calcHalfOverlayDoorWidth(600, 2, 8);
      expect(r.value).toBe(306);
      expect(r.trace.ruleId).toBe('RULE_DOOR_HALF_WIDTH');
    });

    it('overlayAmount = 0 sınır durumu', () => {
      // 800/2 - 3 + 0 = 397
      const r = calcHalfOverlayDoorWidth(800, 3, 0);
      expect(r.value).toBe(397);
    });

    it('ondalıklı genişlik 0.5mm aşağı yuvarlama kontrolü', () => {
      // 755/2 - 3 + 9 = 377.5 - 3 + 9 = 383.5
      const r = calcHalfOverlayDoorWidth(755, 3, 9);
      expect(r.value).toBe(383.5);
    });
  });

  // Kapak adedi önerisi (suggestDoorCount)
  describe('suggestDoorCount', () => {
    it('W<=600 → 1', () => {
      const res = suggestDoorCount(600, 600);
      expect(res.count).toBe(1);
      expect(res.reason).toBe('Genişlik tek kapak sınırında.');
    });

    it('W>600 → 2', () => {
      const res = suggestDoorCount(800, 600);
      expect(res.count).toBe(2);
      expect(res.reason).toBe('Genişlik çift kapak gerektiriyor.');
    });

    it('sınır değeri kontrolleri (599mm, 600mm, 601mm)', () => {
      expect(suggestDoorCount(599, 600).count).toBe(1);
      expect(suggestDoorCount(600, 600).count).toBe(1);
      expect(suggestDoorCount(601, 600).count).toBe(2);
    });

    it('farklı tek kapak maksimum genişlik eşiği (500mm)', () => {
      expect(suggestDoorCount(500, 500).count).toBe(1);
      expect(suggestDoorCount(550, 500).count).toBe(2);
    });
  });

  // Kapak açılış yönü önerisi (suggestOpenDirection)
  describe('suggestOpenDirection', () => {
    it('left side of wall → right', () => {
      expect(suggestOpenDirection(100, 3000)).toBe('right');
    });

    it('right side of wall → left', () => {
      expect(suggestOpenDirection(2000, 3000)).toBe('left');
    });

    it('duvarın tam ortası sınır durumu (moduleX === wallWidth / 2) → left döner', () => {
      // moduleX < wallWidth / 2 olmadığı için 'left'
      expect(suggestOpenDirection(1500, 3000)).toBe('left');
    });

    it('duvarın başlangıç noktası (0mm) → right döner', () => {
      expect(suggestOpenDirection(0, 3000)).toBe('right');
    });

    it('duvarın en sağı (3000mm) → left döner', () => {
      expect(suggestOpenDirection(3000, 3000)).toBe('left');
    });
  });
});
