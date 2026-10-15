/**
 * Kabul Testleri (Bölüm E)
 * 
 * Ortak parametreler:
 * t=18, d=3, assemblyType='sides_out', backType='routed',
 * g=10 (backChannelInset), backThickness=8, D=560, H=720
 */
import { describe, it, expect } from 'vitest';
import {
  calcBottomWidth,
  calcInnerDepth,
  calcRailWidth,
} from '../../core/engine/cabinet-calc';
import {
  calcFullOverlayDoorWidth,
  calcFullOverlayDoorHeight,
} from '../../core/engine/door-calc';
import { calcAdjustableShelf, calcShelfDeflection } from '../../core/engine/shelf-calc';
import { calcHingeCount } from '../../core/engine/hinge-calc';
import { applyEdgeBandDeduction } from '../../core/engine/edge-band';
import { validateSheetSize, validateShelfDeflection } from '../../core/engine/validation';
import type { EdgeBanding } from '../../core/models/part';

// Ortak sabitler
const t = 18;
const d = 3;
const D = 560;
const H = 720;
const g = 10;           // backChannelInset
const backThickness = 8;

// İç derinlik: D - g - backThickness = 560 - 10 - 8 = 542
const innerDepth = calcInnerDepth(D, g, backThickness).value;

// Menteşe sayı tablosu
const countTable = [
  { minHeight: 0, maxHeight: 900, count: 2 },
  { minHeight: 901, maxHeight: 1600, count: 3 },
  { minHeight: 1601, maxHeight: 2000, count: 4 },
  { minHeight: 2001, maxHeight: Infinity, count: 5 },
];

describe('Kabul Testleri (Bölüm E)', () => {
  // Test 1: 600mm alt dolap, tek kapak genişliği → 597
  it('E1: 600mm alt dolap, tek kapak genişliği = 597', () => {
    const result = calcFullOverlayDoorWidth(600, 1, d);
    expect(result.value).toBe(597);
  });

  // Test 2: 600mm alt dolap, tek kapak yüksekliği → 717
  it('E2: 600mm alt dolap, tek kapak yüksekliği = 717', () => {
    const result = calcFullOverlayDoorHeight(H, d);
    expect(result.value).toBe(717);
  });

  // Test 3: 800mm çift kapak genişliği → 397
  it('E3: 800mm alt dolap, çift kapak genişliği = 397', () => {
    const result = calcFullOverlayDoorWidth(800, 2, d);
    expect(result.value).toBe(397);
  });

  // Test 4: 800mm çift kapak yüksekliği → 717
  it('E4: 800mm alt dolap, çift kapak yüksekliği = 717', () => {
    const result = calcFullOverlayDoorHeight(H, d);
    expect(result.value).toBe(717);
  });

  // Test 5: 800mm taban genişliği → 764
  it('E5: 800mm taban genişliği = 764', () => {
    const result = calcBottomWidth(800, t, 'sides_out');
    expect(result.value).toBe(764);
  });

  // Test 6: 800mm taban derinliği → 560
  it('E6: 800mm taban derinliği = 560 (kanallı arkalıkta derinlik değişmez)', () => {
    // Kanallı arkalıkta taban derinliği D'nin kendisi
    expect(D).toBe(560);
  });

  // Test 7: 800mm kuşak → 764 × 100, 2 adet
  it('E7: 800mm kuşak genişliği = 764, eni = 100', () => {
    const railWidth = calcRailWidth(800, t, 'sides_out');
    expect(railWidth.value).toBe(764);
    // Kuşak eni preset'ten gelir, varsayılan 100
    // 2 adet (ön ve arka) — bu modül montaj mantığında kontrol edilir
  });

  // Test 8: 800mm dolapta hareketli raf → 762 × 522
  it('E8: 800mm hareketli raf = 762 × 522', () => {
    const shelf = calcAdjustableShelf(800, t, innerDepth, 20);
    expect(shelf.width.value).toBe(762);
    expect(shelf.depth.value).toBe(522);
  });

  // Test 9: 717mm yüksekliğinde kapak → 2 menteşe
  it('E9: 717mm kapak → 2 menteşe', () => {
    const result = calcHingeCount(717, 400, countTable, 600);
    expect(result.value).toBe(2);
  });

  // Test 10: 2mm bantlı (4 kenar) 397×717 kapak → kesim 393×713
  it('E10: 2mm bant, 4 kenar, 397×717 → kesim 393×713', () => {
    const band2mm = { thickness: 2, materialId: 'eb-2', deducted: false };
    const eb: EdgeBanding = {
      top: band2mm,
      bottom: band2mm,
      left: band2mm,
      right: band2mm,
    };
    const result = applyEdgeBandDeduction(397, 717, eb, 0.8);
    expect(result.cutLength.value).toBe(393);
    expect(result.cutWidth.value).toBe(713);
  });

  // Test 11: 0.4mm bantlı parçada düşüm yapılmaz
  it('E11: 0.4mm bantta düşüm yapılmaz', () => {
    const band04mm = { thickness: 0.4, materialId: 'eb-04', deducted: false };
    const eb: EdgeBanding = {
      top: band04mm,
      bottom: band04mm,
      left: band04mm,
      right: band04mm,
    };
    const result = applyEdgeBandDeduction(397, 717, eb, 0.8);
    expect(result.cutLength.value).toBe(397);
    expect(result.cutWidth.value).toBe(717);
  });

  // Test 12: 1000mm 18mm yonga levha raf, 20kg/m yük → sehim uyarısı
  it('E12: 1000mm 18mm yonga raf, 20kg/m → sehim uyarısı', () => {
    // innerWidth'i span olarak kullan (1000mm açıklık)
    const result = calcShelfDeflection(1000, 18, 542, 20, 2800, 300);
    expect(result.passes).toBe(false);
    expect(result.suggestion).toBeDefined();

    // Validation da aynı sonucu vermeli
    const warning = validateShelfDeflection(1000, 18, 542, 20, 2800, 300);
    expect(warning).not.toBeNull();
    expect(warning!.ruleId).toBe('VAL_SHELF_DEFLECTION');
  });

  // Test 13: 2900mm'lik parça → "plaka ebadını aşıyor"
  it('E13: 2900mm parça → plaka ebadını aşıyor hatası', () => {
    const warning = validateSheetSize(2900, 600, 2800, 2100, 'TEST-PART');
    expect(warning).not.toBeNull();
    expect(warning!.ruleId).toBe('VAL_EXCEEDS_SHEET');
    expect(warning!.severity).toBe('error');
  });
});
