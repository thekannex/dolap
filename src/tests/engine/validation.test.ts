import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateShelfDeflection,
  validateSheetSize,
  validateGrainDirection,
  validateHingeCount,
  validateRailDepth,
  validateObstacleClash,
  validateCornerClash,
  validateCooktopHoodGap,
  resetWarningCounter,
} from '../../core/engine/validation';

const defaultCountTable = [
  { minHeight: 0, maxHeight: 900, count: 2 },
  { minHeight: 901, maxHeight: 1600, count: 3 },
  { minHeight: 1601, maxHeight: 2000, count: 4 },
  { minHeight: 2001, maxHeight: Infinity, count: 5 },
];

describe('validation', () => {
  beforeEach(() => {
    resetWarningCounter();
  });

  describe('resetWarningCounter', () => {
    it('uyarı sayacını sıfırlar ve warn-1 ile başlatır', () => {
      const w1 = validateRailDepth(600, 500, 'RAIL-1');
      expect(w1?.id).toBe('warn-1');
      const w2 = validateRailDepth(600, 500, 'RAIL-2');
      expect(w2?.id).toBe('warn-2');

      resetWarningCounter();
      const w3 = validateRailDepth(600, 500, 'RAIL-3');
      expect(w3?.id).toBe('warn-1');
    });
  });

  describe('validateShelfDeflection', () => {
    it('1000mm 18mm yonga, 20kg/m → uyarı', () => {
      const w = validateShelfDeflection(1000, 18, 542, 20, 2800, 300);
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_SHELF_DEFLECTION');
      expect(w!.severity).toBe('warning');
      expect(w!.suggestion).toBeDefined();
    });

    it('kısa raf → geçer', () => {
      expect(validateShelfDeflection(400, 18, 542, 20, 2800, 300)).toBeNull();
    });

    it('daha kalın raf (25mm) sehim sınırını aşmaz → geçer', () => {
      expect(validateShelfDeflection(1000, 25, 542, 20, 2800, 300)).toBeNull();
    });
  });

  describe('validateSheetSize', () => {
    it('2900mm parça → hata', () => {
      const w = validateSheetSize(2900, 600, 2800, 2100, 'TEST-001');
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_EXCEEDS_SHEET');
      expect(w!.severity).toBe('error');
    });

    it('normal parça → null', () => {
      expect(validateSheetSize(800, 560, 2800, 2100, 'TEST-002')).toBeNull();
    });

    it('parça döndürülünce sığar → null', () => {
      // 2500×600 sığar (2500 <= 2800, 600 <= 2100)
      expect(validateSheetSize(2500, 600, 2800, 2100, 'TEST-003')).toBeNull();
      // 600×2500 döndürülünce (600 <= 2100 && 2500 <= 2800) sığar
      expect(validateSheetSize(600, 2500, 2800, 2100, 'TEST-003B')).toBeNull();
    });

    it('her iki yönde de plakayı aşan parça → hata', () => {
      const w = validateSheetSize(2200, 2200, 2800, 2100, 'TEST-004');
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_EXCEEDS_SHEET');
      expect(w!.severity).toBe('error');
    });

    it('tam plaka ebadında parça → sığar', () => {
      expect(validateSheetSize(2800, 2100, 2800, 2100, 'TEST-005')).toBeNull();
    });
  });

  describe('validateGrainDirection', () => {
    it('damar yok → null', () => {
      expect(validateGrainDirection(2000, 600, 'none', 2800, 2100, 'TEST')).toBeNull();
    });

    it('damar length, parça sığıyor → null', () => {
      expect(validateGrainDirection(2000, 600, 'length', 2800, 2100, 'TEST')).toBeNull();
    });

    it('damar length, boy sığmıyor → uyarı', () => {
      const w = validateGrainDirection(3000, 600, 'length', 2800, 2100, 'TEST');
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_GRAIN_VIOLATION');
      expect(w!.severity).toBe('warning');
    });

    it('damar length, en plaka kısa kenarını aşıyor → uyarı', () => {
      const w = validateGrainDirection(2000, 2200, 'length', 2800, 2100, 'TEST');
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_GRAIN_VIOLATION');
      expect(w!.severity).toBe('warning');
    });

    it('damar width, parça sığıyor → null', () => {
      // en (partWidth) <= sheetWidth (2800) ve boy (partLength) <= sheetHeight (2100)
      expect(validateGrainDirection(600, 2000, 'width', 2800, 2100, 'TEST')).toBeNull();
    });

    it('damar width, parça eni plaka uzun kenarını aşıyor → uyarı', () => {
      const w = validateGrainDirection(500, 2900, 'width', 2800, 2100, 'TEST');
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_GRAIN_VIOLATION');
      expect(w!.severity).toBe('warning');
    });

    it('damar width, parça boyu plaka kısa kenarını aşıyor → uyarı', () => {
      const w = validateGrainDirection(2200, 500, 'width', 2800, 2100, 'TEST');
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_GRAIN_VIOLATION');
      expect(w!.severity).toBe('warning');
    });
  });

  describe('validateHingeCount', () => {
    it('yeterli menteşe → null', () => {
      expect(validateHingeCount(717, 400, 5, 2, defaultCountTable, 600, 15, 'DOOR-1')).toBeNull();
    });

    it('yetersiz menteşe → uyarı', () => {
      const w = validateHingeCount(1200, 400, 5, 1, defaultCountTable, 600, 15, 'DOOR-2');
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_HINGE_INSUFFICIENT');
      expect(w!.severity).toBe('warning');
      expect(w!.suggestion).toContain('3');
    });

    it('kapak genişliği eşiği aştığında ek menteşe gerekir', () => {
      // 717mm boy normalde 2 menteşe, ancak eni 650 > 600 olduğu için 3 gerekir
      const w = validateHingeCount(717, 650, 5, 2, defaultCountTable, 600, 15, 'DOOR-WIDE');
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_HINGE_INSUFFICIENT');
    });

    it('kapak ağırlığı eşiği aştığında ek menteşe gerekir', () => {
      // 717mm boy, 400mm en normalde 2 menteşe, ağırlık 18kg > 15kg olduğu için 3 gerekir
      const w = validateHingeCount(717, 400, 18, 2, defaultCountTable, 600, 15, 'DOOR-HEAVY');
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_HINGE_INSUFFICIENT');
    });

    it('hem genişlik hem ağırlık aşıldığında 2 ek menteşe gerekir', () => {
      // 717mm boy (tablo: 2), en 650 (+1), ağırlık 18 (+1) = 4 menteşe gerekli
      const w = validateHingeCount(717, 650, 18, 3, defaultCountTable, 600, 15, 'DOOR-WIDE-HEAVY');
      expect(w).not.toBeNull();
      expect(w!.suggestion).toContain('4');
    });
  });

  describe('validateRailDepth', () => {
    it('ray sığıyor → null', () => {
      expect(validateRailDepth(500, 542, 'RAIL-1')).toBeNull();
    });

    it('ray sığmıyor → hata', () => {
      const w = validateRailDepth(600, 500, 'RAIL-2');
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_RAIL_EXCEEDS_DEPTH');
      expect(w!.severity).toBe('error');
    });

    it('sınır durumu: ray boyu iç derinliğe eşit → null', () => {
      expect(validateRailDepth(500, 500, 'RAIL-3')).toBeNull();
    });
  });

  describe('validateObstacleClash', () => {
    it('çakışma var', () => {
      const obstacles = [{ x: 100, y: 0, width: 200, height: 300, type: 'outlet' }];
      const w = validateObstacleClash(150, 0, 600, 720, obstacles);
      expect(w.length).toBeGreaterThan(0);
      expect(w[0].ruleId).toBe('VAL_OBSTACLE_CLASH');
      expect(w[0].severity).toBe('error');
    });

    it('çakışma yok', () => {
      const obstacles = [{ x: 1000, y: 0, width: 100, height: 100, type: 'outlet' }];
      const w = validateObstacleClash(0, 0, 600, 720, obstacles);
      expect(w.length).toBe(0);
    });

    it('birden fazla engelden biriyle çakışma', () => {
      const obstacles = [
        { x: 1000, y: 0, width: 100, height: 100, type: 'outlet' },
        { x: 200, y: 100, width: 100, height: 100, type: 'pipe' },
      ];
      const w = validateObstacleClash(100, 50, 300, 400, obstacles);
      expect(w.length).toBe(1);
      expect(w[0].ruleId).toBe('VAL_OBSTACLE_CLASH');
      expect(w[0].message).toContain('pipe');
    });

    it('birden fazla engelin ikisiyle de çakışma', () => {
      const obstacles = [
        { x: 100, y: 100, width: 50, height: 50, type: 'outlet' },
        { x: 200, y: 100, width: 50, height: 50, type: 'pipe' },
      ];
      const w = validateObstacleClash(0, 0, 500, 500, obstacles);
      expect(w.length).toBe(2);
    });

    it('boş engel listesi → boş dizi döner', () => {
      expect(validateObstacleClash(0, 0, 600, 720, [])).toEqual([]);
    });

    it('kenarları teğet (sadece temas eden) modül ve engel çakışmaz', () => {
      const obstacles = [{ x: 600, y: 0, width: 100, height: 100, type: 'outlet' }];
      const w = validateObstacleClash(0, 0, 600, 720, obstacles);
      expect(w.length).toBe(0);
    });
  });

  describe('validateCornerClash', () => {
    it('dolgu yetersiz ve süpürme modülü aşıyor → hata', () => {
      // moduleWidth=400, doorWidth=400, handleLength=50 (swingRadius=450 > 400), filler=30 < min=50
      const w = validateCornerClash(400, 400, 50, 30, 50);
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_CORNER_CLASH');
      expect(w!.severity).toBe('error');
      expect(w!.suggestion).toBeDefined();
    });

    it('dolgu yeterli → null', () => {
      // fillerWidth (60) >= minClearance (50)
      const w = validateCornerClash(400, 400, 50, 60, 50);
      expect(w).toBeNull();
    });

    it('süpürme dairesi modül genişliğini aşmıyor → null', () => {
      // swingRadius = 300 + 40 = 340 <= moduleWidth (400)
      const w = validateCornerClash(400, 300, 40, 20, 50);
      expect(w).toBeNull();
    });
  });

  describe('validateCooktopHoodGap', () => {
    it('mesafe yeterli → null', () => {
      expect(validateCooktopHoodGap(900, 1600, 650)).toBeNull();
    });

    it('mesafe yetersiz → uyarı', () => {
      const w = validateCooktopHoodGap(900, 1400, 650);
      expect(w).not.toBeNull();
      expect(w!.ruleId).toBe('VAL_COOKTOP_HOOD_GAP');
      expect(w!.severity).toBe('warning');
      expect(w!.suggestion).toBeDefined();
    });

    it('mesafe tam minimum sınırda → null', () => {
      expect(validateCooktopHoodGap(900, 1550, 650)).toBeNull();
    });
  });
});
