import type { CabinetState } from '../models/cabinet';
import type { CalculationTrace, ValidationWarning } from '../models/common';
import { roundDown05 } from '../utils/rounding';
import {
  calcSideHeight, calcSideDepth, calcBottomWidth, calcBottomDepth,
  calcRailWidth, calcRailDepth, calcBackWidth, calcBackHeight,
  calcInnerDepth, calcInnerWidth,
} from './cabinet-calc';
import {
  calcFullOverlayDoorWidth, calcFullOverlayDoorHeight,
  calcInsetDoorWidth, calcInsetDoorHeight, suggestDoorCount,
} from './door-calc';
import { calcAdjustableShelf, calcFixedShelf } from './shelf-calc';
import { calcHingeCount, calcHingePositions } from './hinge-calc';
import { calcDrawerBoxWidth, calcBestRailLength, calcDrawerFronts, calcDrawerBoxHeight } from './drawer-calc';
import { validateShelfDeflection, validateSheetSize } from './validation';

export type PartGroup = 'body' | 'door' | 'drawer' | 'shelf';

/** Parçanın kesileceği levha: gövde, arkalık (ince levha) veya ön yüz (kapak/klapa). */
export type PartMaterial = 'body' | 'back' | 'front';

/**
 * Kenar bandı kalınlıkları (mm, 0 = bant yok).
 * top/bottom bantları boy (length) boyunca, left/right bantları en (width) boyunca uzanır.
 */
export interface PartBands {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ComputedPart {
  id: string;
  code: string;
  name: string;
  group: PartGroup;
  material: PartMaterial;
  length: number;
  width: number;
  thickness: number;
  quantity: number;
  bands: PartBands;
  trace: CalculationTrace;
}

export type HardwareKey = 'hinge' | 'rail' | 'metal_drawer' | 'confirmat' | 'shelf_pin' | 'leg' | 'handle';

export interface ComputedHardware {
  key: HardwareKey;
  name: string;
  unit: 'adet' | 'çift' | 'takım';
  quantity: number;
  catalogVerified: boolean;
}

export interface ComputedCabinet {
  parts: ComputedPart[];
  hardware: ComputedHardware[];
  warnings: ValidationWarning[];
  innerWidth: number;
  innerDepth: number;
  innerHeight: number;
  doorWidth: number;
  doorHeight: number;
  doorCount: number;
  hingeCount: number;
  hingePositions: number[];
  shelfWidth: number;
  shelfDepth: number;
  drawerFrontHeights: number[];
  drawerFrontWidth: number;
  drawerBoxWidth: number;
  railLength: number;
}

export interface ComputeOptions {
  sheetWidth?: number;
  sheetHeight?: number;
  /** Gövde ön kenarları için bant kalınlığı (mm). */
  bodyBand?: number;
  /** Kapak ve klapalar için bant kalınlığı (mm). */
  frontBand?: number;
}

export const STANDARD_RAIL_LENGTHS = [250, 300, 350, 400, 450, 500, 550, 600];

const HINGE_COUNT_TABLE = [
  { minHeight: 0, maxHeight: 900, count: 2 },
  { minHeight: 901, maxHeight: 1600, count: 3 },
  { minHeight: 1601, maxHeight: 2000, count: 4 },
  { minHeight: 2001, maxHeight: Infinity, count: 5 },
];

const NO_BANDS: PartBands = { top: 0, bottom: 0, left: 0, right: 0 };

export function isFloorStanding(type: CabinetState['type']): boolean {
  return type === 'base' || type === 'drawer_base' || type === 'sink' || type === 'tall';
}

export function hasRails(cab: CabinetState): boolean {
  const isBase = cab.type === 'base' || cab.type === 'drawer_base' || cab.type === 'sink';
  return isBase && cab.railWidth > 0;
}

/** Bir dolabın tüm parça, hırdavat ve uyarılarını hesaplar. Saf fonksiyondur. */
export function computeCabinet(cab: CabinetState, opts: ComputeOptions = {}): ComputedCabinet {
  const sheetW = opts.sheetWidth ?? 2800;
  const sheetH = opts.sheetHeight ?? 2100;
  const bodyBand = opts.bodyBand ?? 0.8;
  const frontBand = opts.frontBand ?? 1;
  const frontOnly: PartBands = { ...NO_BANDS, top: bodyBand };
  const allAround: PartBands = { top: frontBand, bottom: frontBand, left: frontBand, right: frontBand };

  const { width: W, height: H, depth: D, bodyThickness: t } = cab;
  const parts: ComputedPart[] = [];
  const hardware: ComputedHardware[] = [];
  const warnings: ValidationWarning[] = [];

  const result: ComputedCabinet = {
    parts, hardware, warnings,
    innerWidth: 0, innerDepth: 0, innerHeight: 0,
    doorWidth: 0, doorHeight: 0, doorCount: 0,
    hingeCount: 0, hingePositions: [],
    shelfWidth: 0, shelfDepth: 0,
    drawerFrontHeights: [], drawerFrontWidth: 0, drawerBoxWidth: 0, railLength: 0,
  };

  if (W <= 0 || H <= 0 || D <= 0 || t <= 0) {
    warnings.push({
      id: `${cab.code}-invalid`, severity: 'error', ruleId: 'VAL_INVALID_DIMENSIONS',
      message: 'Genişlik, yükseklik, derinlik ve gövde kalınlığı sıfırdan büyük olmalı.',
    });
    return result;
  }

  // --- Dolgu paneli: tek parça ---
  if (cab.type === 'filler') {
    parts.push({
      id: 'filler', code: `${cab.code}-DOLGU`, name: 'Dolgu Paneli', group: 'door', material: 'front',
      length: roundDown05(H), width: roundDown05(W), thickness: t, quantity: 1, bands: allAround,
      trace: {
        formula: 'H × W', inputs: { H, W }, ruleId: 'RULE_FILLER',
        description: 'Dolgu paneli, iki dolap ya da dolap–duvar arasındaki boşluğu kapatır.',
      },
    });
    return result;
  }

  // --- Gövde ---
  const sideH = calcSideHeight(H);
  const sideD = calcSideDepth(D, cab.backType, cab.backThickness);
  parts.push({
    id: 'side-left', code: `${cab.code}-YAN-SOL`, name: 'Sol Yan Dikme', group: 'body', material: 'body',
    length: sideH.value, width: sideD.value, thickness: t, quantity: 1, bands: frontOnly, trace: sideH.trace,
  });
  parts.push({
    id: 'side-right', code: `${cab.code}-YAN-SAG`, name: 'Sağ Yan Dikme', group: 'body', material: 'body',
    length: sideH.value, width: sideD.value, thickness: t, quantity: 1, bands: frontOnly, trace: sideH.trace,
  });

  const bottomW = calcBottomWidth(W, t, cab.assemblyType);
  const bottomD = calcBottomDepth(D, cab.backType, cab.backThickness);
  parts.push({
    id: 'bottom', code: `${cab.code}-TABAN`, name: 'Taban', group: 'body', material: 'body',
    length: bottomW.value, width: bottomD.value, thickness: t, quantity: 1, bands: frontOnly, trace: bottomW.trace,
  });

  const withRails = hasRails(cab);
  let confirmatCount = 0;
  const confirmatPerEnd = D > 400 ? 3 : 2;
  confirmatCount += 2 * confirmatPerEnd; // taban

  if (withRails) {
    const rW = calcRailWidth(W, t, cab.assemblyType);
    const rD = calcRailDepth(cab.railWidth);
    parts.push({
      id: 'rail-front', code: `${cab.code}-KUSAK-ON`, name: 'Ön Kuşak', group: 'body', material: 'body',
      length: rW.value, width: rD.value, thickness: t, quantity: 1, bands: frontOnly, trace: rW.trace,
    });
    parts.push({
      id: 'rail-back', code: `${cab.code}-KUSAK-ARKA`, name: 'Arka Kuşak', group: 'body', material: 'body',
      length: rW.value, width: rD.value, thickness: t, quantity: 1, bands: NO_BANDS, trace: rW.trace,
    });
    confirmatCount += 2 * 2 * 2;
  } else {
    parts.push({
      id: 'top', code: `${cab.code}-TAVAN`, name: 'Üst Tabla', group: 'body', material: 'body',
      length: bottomW.value, width: bottomD.value, thickness: t, quantity: 1, bands: frontOnly, trace: bottomW.trace,
    });
    confirmatCount += 2 * confirmatPerEnd;
  }

  if (cab.hasBackPanel) {
    const backW = calcBackWidth(W, t, cab.backType, cab.backChannelDepth);
    const backH = calcBackHeight(H, t, cab.assemblyType, cab.backType, cab.backChannelDepth, withRails);
    parts.push({
      id: 'back', code: `${cab.code}-ARKALIK`, name: cab.backPanelCutout ? 'Arkalık (tesisat kesikli)' : 'Arkalık',
      group: 'body', material: 'back',
      length: backW.value, width: backH.value, thickness: cab.backThickness, quantity: 1, bands: NO_BANDS, trace: backW.trace,
    });
    if (cab.backPanelCutout) {
      warnings.push({
        id: `${cab.code}-sink-cutout`, severity: 'info', ruleId: 'INFO_SINK_CUTOUT',
        message: 'Evye dolabı: arkalıkta su ve gider tesisatı için kesik açılacak.',
        suggestion: 'Kesik yerini sahada tesisat konumuna göre işaretleyin.',
      });
    }
  }

  const iW = calcInnerWidth(W, t, cab.assemblyType).value;
  const iD = calcInnerDepth(D, cab.backChannelInset, cab.backThickness).value;
  const iH = roundDown05(H - 2 * t);
  result.innerWidth = iW;
  result.innerDepth = iD;
  result.innerHeight = iH;

  // --- Raflar ---
  if (cab.shelfCount > 0) {
    const adj = calcAdjustableShelf(W, t, iD, cab.frontPullback);
    result.shelfWidth = adj.width.value;
    result.shelfDepth = adj.depth.value;
    parts.push({
      id: 'adj-shelf', code: `${cab.code}-RAF`, name: 'Hareketli Raf', group: 'shelf', material: 'body',
      length: adj.width.value, width: adj.depth.value, thickness: t, quantity: cab.shelfCount, bands: frontOnly,
      trace: adj.width.trace,
    });
    const deflWarn = validateShelfDeflection(iW, t, adj.depth.value, 15, 2800, 300);
    if (deflWarn) warnings.push(deflWarn);
    hardware.push({ key: 'shelf_pin', name: 'Raf Pimi Ø5', unit: 'adet', quantity: cab.shelfCount * 4, catalogVerified: false });
  }
  if (cab.fixedShelfCount > 0) {
    const fix = calcFixedShelf(W, t, iD, cab.assemblyType);
    parts.push({
      id: 'fixed-shelf', code: `${cab.code}-SRAF`, name: 'Sabit Raf', group: 'shelf', material: 'body',
      length: fix.width.value, width: fix.depth.value, thickness: t, quantity: cab.fixedShelfCount, bands: frontOnly,
      trace: fix.width.trace,
    });
    confirmatCount += cab.fixedShelfCount * 2 * confirmatPerEnd;
  }

  // --- Kapaklar ---
  const hasDrawers = cab.drawerCount > 0;
  const wantsDoors = !cab.isOpenShelf && !hasDrawers;
  const dCount = !wantsDoors ? 0 : cab.doorAutoGenerated ? suggestDoorCount(W, 600).count : Math.max(0, Math.floor(cab.doorCount));
  let handleCount = 0;

  if (dCount > 0) {
    let dw: { value: number; trace: CalculationTrace };
    let dh: { value: number; trace: CalculationTrace };
    if (cab.doorOverlayType === 'inset') {
      dw = calcInsetDoorWidth(iW, cab.doorGap, dCount);
      dh = calcInsetDoorHeight(iH, cab.doorGap);
    } else if (cab.doorOverlayType === 'half') {
      // Yarım bindirme: kapak her yan dikmenin halfOverlayAmount kadarını örter.
      const covered = W - 2 * (t - cab.halfOverlayAmount);
      dw = {
        value: roundDown05(covered / dCount - cab.doorGap),
        trace: {
          formula: '(W - 2(t - a)) / n - d',
          inputs: { W, t, a: cab.halfOverlayAmount, n: dCount, d: cab.doorGap },
          ruleId: 'RULE_DOOR_HALF_WIDTH',
          description: 'Yarım bindirmede kapak, yan dikmenin yalnızca "a" kadarını örter.',
        },
      };
      dh = calcFullOverlayDoorHeight(H, cab.doorGap);
    } else {
      dw = calcFullOverlayDoorWidth(W, dCount, cab.doorGap);
      dh = calcFullOverlayDoorHeight(H, cab.doorGap);
    }

    result.doorWidth = dw.value;
    result.doorHeight = dh.value;
    result.doorCount = dCount;

    parts.push({
      id: 'door', code: `${cab.code}-KAPAK`, name: 'Kapak', group: 'door', material: 'front',
      length: dh.value, width: dw.value, thickness: t, quantity: dCount, bands: allAround, trace: dw.trace,
    });

    const hc = calcHingeCount(dh.value, dw.value, HINGE_COUNT_TABLE, 600);
    result.hingeCount = hc.value;
    result.hingePositions = calcHingePositions(dh.value, hc.value, 90);
    hardware.push({ key: 'hinge', name: 'Ø35 Menteşe (frenli)', unit: 'adet', quantity: hc.value * dCount, catalogVerified: false });
    handleCount += dCount;

    if (dw.value < 150) {
      warnings.push({
        id: `${cab.code}-narrow-door`, severity: 'warning', ruleId: 'VAL_NARROW_DOOR',
        message: `Kapak genişliği ${dw.value}mm çok dar.`,
        suggestion: 'Kapak sayısını azaltın ya da dolabı genişletin.',
      });
    }
    if (dw.value > 600) {
      warnings.push({
        id: `${cab.code}-wide-door`, severity: 'warning', ruleId: 'VAL_WIDE_DOOR',
        message: `Kapak genişliği ${dw.value}mm; 600mm üzeri kapaklar sarkabilir.`,
        suggestion: 'İki kapağa bölmeyi düşünün.',
      });
    }
  }

  // --- Çekmeceler ---
  if (hasDrawers) {
    const n = Math.max(1, Math.floor(cab.drawerCount));
    const ratios = cab.drawerRatios.length === n ? cab.drawerRatios : Array(n).fill(1);
    const fronts = calcDrawerFronts(H, ratios, cab.doorGap, n);
    const frontW = roundDown05(W - cab.doorGap);
    result.drawerFrontWidth = frontW;

    const dbw = calcDrawerBoxWidth(iW, cab.railWidthDeduction);
    const rl = calcBestRailLength(iD, STANDARD_RAIL_LENGTHS);
    result.drawerBoxWidth = dbw.value;
    result.railLength = rl.value;

    if (rl.value === 0) {
      warnings.push({
        id: `${cab.code}-rail`, severity: 'error', ruleId: 'VAL_RAIL_DEPTH',
        message: `İç derinlik ${iD}mm; standart ray boylarının hiçbiri sığmıyor.`,
        suggestion: 'Dolap derinliğini artırın.',
      });
    }

    fronts.heights.forEach((fh, i) => {
      result.drawerFrontHeights.push(fh.value);
      parts.push({
        id: `drawer-front-${i}`, code: `${cab.code}-KLAPA-${i + 1}`, name: `Çekmece Klapası ${i + 1}`,
        group: 'drawer', material: 'front',
        length: frontW, width: fh.value, thickness: t, quantity: 1, bands: allAround, trace: fh.trace,
      });

      const boxH = calcDrawerBoxHeight(fh.value);
      const boxHeight = Math.min(boxH.value, 250);
      if (rl.value > 0 && boxHeight >= 60) {
        if (cab.railType === 'metal_box') {
          parts.push({
            id: `drawer-bottom-${i}`, code: `${cab.code}-CK${i + 1}-TABAN`, name: `Çekmece ${i + 1} Tabanı`,
            group: 'drawer', material: 'back',
            length: roundDown05(iW - 75), width: roundDown05(rl.value - 10), thickness: cab.backThickness, quantity: 1,
            bands: NO_BANDS,
            trace: { formula: 'iW - 75', inputs: { iW }, ruleId: 'RULE_METAL_BOX_BOTTOM', description: 'Metal kutu tabanı (katalogdan doğrulayın).' },
          });
          parts.push({
            id: `drawer-back-${i}`, code: `${cab.code}-CK${i + 1}-ARKA`, name: `Çekmece ${i + 1} Arkası`,
            group: 'drawer', material: 'body',
            length: roundDown05(iW - 87), width: roundDown05(boxHeight - 20), thickness: t, quantity: 1,
            bands: { ...NO_BANDS, top: bodyBand },
            trace: { formula: 'iW - 87', inputs: { iW }, ruleId: 'RULE_METAL_BOX_BACK', description: 'Metal kutu arkalığı (katalogdan doğrulayın).' },
          });
        } else {
          parts.push({
            id: `drawer-side-${i}`, code: `${cab.code}-CK${i + 1}-YAN`, name: `Çekmece ${i + 1} Yanı`,
            group: 'drawer', material: 'body',
            length: rl.value, width: boxHeight, thickness: t, quantity: 2, bands: { ...NO_BANDS, top: bodyBand },
            trace: { formula: 'railLength × boxHeight', inputs: { railLength: rl.value, boxHeight }, ruleId: 'RULE_DRAWER_BOX_DEPTH', description: 'Çekmece yanı boyu ray boyuna eşittir.' },
          });
          parts.push({
            id: `drawer-fb-${i}`, code: `${cab.code}-CK${i + 1}-ONARKA`, name: `Çekmece ${i + 1} Ön/Arka`,
            group: 'drawer', material: 'body',
            length: roundDown05(dbw.value - 2 * t), width: boxHeight, thickness: t, quantity: 2, bands: { ...NO_BANDS, top: bodyBand },
            trace: { formula: 'boxWidth - 2t', inputs: { boxWidth: dbw.value, t }, ruleId: 'RULE_DRAWER_BOX_WIDTH', description: 'Çekmece ön/arka parçası, iki yan arasına girer.' },
          });
          parts.push({
            id: `drawer-bottom-${i}`, code: `${cab.code}-CK${i + 1}-TABAN`, name: `Çekmece ${i + 1} Tabanı`,
            group: 'drawer', material: 'back',
            length: dbw.value, width: rl.value, thickness: cab.backThickness, quantity: 1, bands: NO_BANDS,
            trace: { formula: 'boxWidth × railLength', inputs: { boxWidth: dbw.value, railLength: rl.value }, ruleId: 'RULE_DRAWER_BOTTOM', description: 'Çekmece tabanı kutunun altına çakılır.' },
          });
        }
      }
    });

    if (cab.railType === 'metal_box') {
      hardware.push({ key: 'metal_drawer', name: `Metal Çekmece Seti ${rl.value}mm`, unit: 'takım', quantity: n, catalogVerified: false });
      warnings.push({
        id: `${cab.code}-metal-box`, severity: 'info', ruleId: 'INFO_METAL_BOX',
        message: 'Metal kutu taban/arka ölçüleri genel formülle hesaplandı.',
        suggestion: 'Kullandığınız markanın kataloğundan doğrulayın.',
      });
    } else {
      const railName = cab.railType === 'undermount' ? 'Gizli Ray' : 'Bilyalı Ray';
      hardware.push({ key: 'rail', name: `${railName} ${rl.value}mm`, unit: 'çift', quantity: n, catalogVerified: false });
    }
    handleCount += n;
  }

  // --- Genel hırdavat ---
  hardware.push({ key: 'confirmat', name: 'Konfirmat 7×50', unit: 'adet', quantity: confirmatCount, catalogVerified: false });
  if (isFloorStanding(cab.type)) {
    hardware.push({ key: 'leg', name: 'Ayarlı Plastik Ayak', unit: 'adet', quantity: W > 1000 ? 6 : 4, catalogVerified: false });
  }
  if (handleCount > 0) {
    hardware.push({ key: 'handle', name: 'Kulp', unit: 'adet', quantity: handleCount, catalogVerified: false });
  }

  // --- Plaka ebadı kontrolü ---
  for (const p of parts) {
    const w = validateSheetSize(p.length, p.width, sheetW, sheetH, p.code);
    if (w) warnings.push(w);
  }

  return result;
}

/** Bir parçanın toplam kenar bandı uzunluğu (metre, adet dahil), kalınlığa göre. */
export function partBandMeters(part: Pick<ComputedPart, 'length' | 'width' | 'quantity' | 'bands'>): Map<number, number> {
  const out = new Map<number, number>();
  const add = (thickness: number, mm: number) => {
    if (thickness <= 0) return;
    out.set(thickness, (out.get(thickness) ?? 0) + (mm / 1000) * part.quantity);
  };
  add(part.bands.top, part.length);
  add(part.bands.bottom, part.length);
  add(part.bands.left, part.width);
  add(part.bands.right, part.width);
  return out;
}
