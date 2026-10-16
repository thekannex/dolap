import type { CabinetState } from '../models/cabinet';
import type { CalculationTrace, ValidationWarning } from '../models/common';
import { roundDown05 } from '../utils/rounding';
import {
  calcSideDepth, calcBottomDepth,
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
import { computeSinkLayout } from './sink';
import { layoutInterior, cellLabel } from './interior';
import type { InteriorGeometry } from './interior';
import type { SinkLayout } from './sink';
import { COUNTERTOP_OVERHANG } from '../layout/scene-layout';

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

export type HardwareKey =
  | 'hinge' | 'rail' | 'metal_drawer' | 'confirmat' | 'shelf_pin' | 'leg' | 'handle'
  | 'gas_strut' | 'lift_system' | 'hanger_rod';

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
  /** Evye varsa tezgâh üstündeki yerleşimi. */
  sink: SinkLayout | null;
  /** Bölmeli iç düzenin geometrisi (gövde koordinatlarında). */
  interior: InteriorGeometry | null;
  /** Ayak yüksekliği; gövde bu yükseklikten başlar. */
  legHeight: number;
}

export interface ComputeOptions {
  sheetWidth?: number;
  sheetHeight?: number;
  /** Gövde ön kenarları için bant kalınlığı (mm). */
  bodyBand?: number;
  /** Kapak ve klapalar için bant kalınlığı (mm). */
  frontBand?: number;
  /** Sol dikme soldaki kutuyla ortak: bu kutuda kesilmez, iç ölçüler bir dikme kalınlığı büyür. */
  omitLeftSide?: boolean;
  /** Taban alttaki kutunun üst tablasıyla ortak: bu kutuda kesilmez. */
  omitBottom?: boolean;
  /** Kutu yerden yükseltilmiş (başka kutunun üstünde ya da duvara asılı): ayak eklenmez. */
  raised?: boolean;
}

/** Tek parça kalkar kapağın önerilen en büyük yüksekliği (mm); üstünde katlanır kapak önerilir. */
export const LIFT_SINGLE_MAX = 600;

export const STANDARD_RAIL_LENGTHS = [250, 300, 350, 400, 450, 500, 550, 600];

export const HINGE_COUNT_TABLE = [
  { minHeight: 0, maxHeight: 900, count: 2 },
  { minHeight: 901, maxHeight: 1600, count: 3 },
  { minHeight: 1601, maxHeight: 2000, count: 4 },
  { minHeight: 2001, maxHeight: Infinity, count: 5 },
];

const NO_BANDS: PartBands = { top: 0, bottom: 0, left: 0, right: 0 };

export function isFloorStanding(type: CabinetState['type']): boolean {
  return type !== 'wall' && type !== 'open_shelf' && type !== 'filler';
}

/**
 * Tablaların dikmelerle birleşimi. "over": tabla dikmelerin üstünde/altında, tam en; dikme aradan kısalır.
 * "between": tabla dikmelerin arasında; dikme tam boy. Alan yoksa eski montaj tipinden çıkarılır.
 */
export function jointsOf(cab: Pick<CabinetState, 'assemblyType' | 'topJoint' | 'bottomJoint'>): { topOver: boolean; bottomOver: boolean } {
  const legacyIn = cab.assemblyType === 'sides_in';
  return {
    topOver: cab.topJoint ? cab.topJoint === 'over' : legacyIn,
    bottomOver: cab.bottomJoint ? cab.bottomJoint === 'over' : legacyIn,
  };
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
    sink: null,
    interior: null,
    legHeight: 0,
  };

  if (W <= 0 || H <= 0 || D <= 0 || t <= 0) {
    warnings.push({
      id: `${cab.code}-invalid`, severity: 'error', ruleId: 'VAL_INVALID_DIMENSIONS',
      message: 'Genişlik, yükseklik, derinlik ve gövde kalınlığı sıfırdan büyük olmalı.',
    });
    return result;
  }

  // --- Ayak: gövde ayak yüksekliği kadar kısa hesaplanır ---
  const legH = cab.type !== 'filler' && cab.legHeight > 0 ? Math.min(cab.legHeight, H / 2) : 0;
  if (legH > 0) {
    const body = computeCabinet({ ...cab, height: H - legH, legHeight: 0 }, { ...opts, raised: true });
    body.hardware.push({ key: 'leg', name: `Mobilya Ayağı ${roundDown05(legH)}mm`, unit: 'adet', quantity: W > 1200 ? 6 : 4, catalogVerified: false });
    body.legHeight = legH;
    return body;
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

  // Baza (süpürgelik) tabanı yükseltir; kapak, klapa ve arkalık bazanın üstünden başlar.
  const plinth = Math.max(0, Math.min(cab.plinthHeight || 0, H / 2));
  const Hf = H - plinth;
  // Ortak panelde komşunun dikmesi/tablası kullanılır; iç ölçüler için kutu bir panel kalınlığı büyükmüş gibi hesaplanır.
  const omitLeft = Boolean(opts.omitLeftSide);
  const omitBottom = Boolean(opts.omitBottom);
  const Wi = W + (omitLeft ? t : 0);
  const Hfi = Hf + (omitBottom ? t : 0);

  // Evye: tezgâh derinliği = dolap derinliği + ön taşma
  if (cab.sink && cab.type !== 'wall' && cab.type !== 'open_shelf') {
    result.sink = computeSinkLayout(cab.sink, cab, D + COUNTERTOP_OVERHANG);
    warnings.push(...result.sink.warnings);
  }

  // --- Gövde ---
  // Tabla birleşimi: üstte/altta tam en tabla varsa dikme o kadar kısalır (bazalı dolapta alt tabla hep arada)
  const joints = jointsOf(cab);
  const withRailsTop = hasRails(cab);
  const topOver = joints.topOver && !withRailsTop;
  const bottomOver = joints.bottomOver && plinth === 0 && !omitBottom;
  const sideLen = roundDown05(H - (topOver ? t : 0) - (bottomOver ? t : 0));
  const sideH = {
    value: sideLen,
    trace: {
      formula: topOver || bottomOver ? `H${topOver ? ' - t' : ''}${bottomOver ? ' - t' : ''}` : 'H',
      inputs: { H, t, topOver, bottomOver },
      ruleId: 'RULE_SIDE_HEIGHT',
      description: topOver || bottomOver
        ? 'Tam en tabla dikmenin üstüne/altına bindiği için dikme tabla kalınlığı kadar kısa.'
        : 'Yan dikme yüksekliği = gövde dış yüksekliği (tablalar dikmelerin arasında).',
    },
  };
  const sideD = calcSideDepth(D, cab.backType, cab.backThickness);
  // Kapak arkasındaki yan dikme: kapak önünü örter. Gömme kapakta dikme kapak kalınlığı + 2mm geride kesilir.
  // Tam bindirmede yanlar zaten kapağın arkasında olduğundan işaretin etkisi yok.
  const behindActive = cab.doorOverlayType !== 'full';
  const leftBehind = behindActive && Boolean(cab.leftSideBehind) && !omitLeft;
  const rightBehind = behindActive && Boolean(cab.rightSideBehind);
  const behindSetback = cab.doorOverlayType === 'inset' ? t + 2 : 0;
  const sidePart = (behind: boolean) => (behind && behindSetback > 0
    ? {
      width: roundDown05(sideD.value - behindSetback),
      trace: { formula: 'yan derinlik - (kapak kalınlığı + 2)', inputs: { derinlik: sideD.value, geri: behindSetback }, ruleId: 'RULE_SIDE_BEHIND_DOOR',
        description: 'Dikme kapağın arkasında kalır; gömme kapak önüne oturabilsin diye kapak kalınlığı + 2mm geride kesilir. Kapak açılınca görünen ön kenarı bantlanır.' },
    }
    : { width: sideD.value, trace: sideH.trace });
  const panelWidth = (over: boolean, label: string) => ({
    value: roundDown05(over ? W : Wi - 2 * t),
    trace: {
      formula: over ? 'W' : 'W - 2t',
      inputs: { W, t, over },
      ruleId: over ? 'RULE_BOTTOM_WIDTH_SIDES_IN' : 'RULE_BOTTOM_WIDTH_SIDES_OUT',
      description: over ? `${label} dikmelerin üstüne biner, tam en.` : `${label} iki yan dikmenin arasına girer: W − 2 × gövde kalınlığı.`,
    },
  });
  if (!omitLeft) {
    parts.push({
      id: 'side-left', code: `${cab.code}-YAN-SOL`, name: leftBehind ? 'Sol Yan Dikme (kapak arkasında)' : 'Sol Yan Dikme', group: 'body', material: 'body',
      length: sideH.value, width: sidePart(leftBehind).width, thickness: t, quantity: 1, bands: frontOnly, trace: sidePart(leftBehind).trace,
    });
  }
  parts.push({
    id: 'side-right', code: `${cab.code}-YAN-SAG`, name: rightBehind ? 'Sağ Yan Dikme (kapak arkasında)' : 'Sağ Yan Dikme', group: 'body', material: 'body',
    length: sideH.value, width: sidePart(rightBehind).width, thickness: t, quantity: 1, bands: frontOnly, trace: sidePart(rightBehind).trace,
  });

  const bottomW = panelWidth(bottomOver, 'Taban');
  const bottomD = calcBottomDepth(D, cab.backType, cab.backThickness);
  if (!omitBottom) {
    parts.push({
      id: 'bottom', code: `${cab.code}-TABAN`, name: 'Taban', group: 'body', material: 'body',
      length: bottomW.value, width: bottomD.value, thickness: t, quantity: 1,
      bands: bottomOver ? { ...frontOnly, left: bodyBand, right: bodyBand } : frontOnly, trace: bottomW.trace,
    });
  }
  if (omitLeft || omitBottom) {
    warnings.push({
      id: `${cab.code}-shared`, severity: 'info', ruleId: 'INFO_SHARED_PANEL',
      message: `${[omitLeft && 'Sol dikme', omitBottom && 'Alt tabla'].filter(Boolean).join(' ve ')} komşu kutuyla ortak; bu kutuda kesilmez.`,
    });
  }

  const withRails = hasRails(cab);
  let confirmatCount = 0;
  const confirmatPerEnd = D > 400 ? 3 : 2;
  confirmatCount += 2 * confirmatPerEnd; // taban

  if (withRails) {
    const rW = calcRailWidth(Wi, t, 'sides_out');
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
    const topW = panelWidth(topOver, 'Üst tabla');
    parts.push({
      id: 'top', code: `${cab.code}-TAVAN`, name: 'Üst Tabla', group: 'body', material: 'body',
      length: topW.value, width: bottomD.value, thickness: t, quantity: 1,
      // Tam en tablanın yan kenarları da görünür
      bands: topOver ? { ...frontOnly, left: bodyBand, right: bodyBand } : frontOnly, trace: topW.trace,
    });
    confirmatCount += 2 * confirmatPerEnd;
  }

  if (cab.hasBackPanel) {
    const backW = calcBackWidth(Wi, t, cab.backType, cab.backChannelDepth);
    const backH = calcBackHeight(Hfi, t, cab.assemblyType, cab.backType, cab.backChannelDepth, withRails);
    parts.push({
      id: 'back', code: `${cab.code}-ARKALIK`, name: cab.backPanelCutout ? 'Arkalık (tesisat kesikli)' : 'Arkalık',
      group: 'body', material: 'back',
      length: backW.value, width: backH.value, thickness: cab.backThickness, quantity: 1, bands: NO_BANDS, trace: backW.trace,
    });
    if (cab.backPanelCutout || result.sink) {
      // Kesik, çanak ekseninde; arkalığın sol kenarına göre verilir (arkalık yan dikmelerin arasında başlar)
      const bowl = result.sink?.bowls[0];
      const center = bowl ? roundDown05(bowl.x + bowl.w / 2 - t) : null;
      warnings.push({
        id: `${cab.code}-sink-cutout`, severity: 'info', ruleId: 'INFO_SINK_CUTOUT',
        message: center !== null
          ? `Arkalık tesisat kesiği: ortası arkalığın solundan ${center}mm, yaklaşık 300 × 400mm (alttan).`
          : 'Arkalıkta su ve gider tesisatı için kesik açılacak.',
        suggestion: 'Kesiği sahadaki su girişi ve gider yerine göre son kez kontrol edin.',
      });
    }
  }

  const iW = calcInnerWidth(Wi, t, cab.assemblyType).value;

  if (plinth > 0) {
    parts.push({
      id: 'plinth', code: `${cab.code}-BAZA`, name: 'Baza', group: 'body', material: 'body',
      length: iW, width: roundDown05(plinth), thickness: t, quantity: 1, bands: NO_BANDS,
      trace: {
        formula: 'W - 2t × baza', inputs: { W, t, plinth }, ruleId: 'RULE_PLINTH',
        description: 'Baza, iki yan dikme arasına önden girer; taban bazanın üstüne oturur.',
      },
    });
    confirmatCount += 4;
  }
  const iD = calcInnerDepth(D, cab.backChannelInset, cab.backThickness).value;
  const iH = roundDown05(Hfi - 2 * t);
  result.innerWidth = iW;
  result.innerDepth = iD;
  result.innerHeight = iH;

  let handleCount = 0;
  // Gömme kapakta kapak arkasındaki yan dikmenin kalınlığı kapağa eklenir; yarım bindirmede kapak o dikmeyi tam örter
  const behindExtra = (leftBehind ? t : 0) + (rightBehind ? t : 0);
  const halfCovered = W - (leftBehind ? 0 : t - cab.halfOverlayAmount) - (rightBehind ? 0 : t - cab.halfOverlayAmount);
  if ((leftBehind || rightBehind) && behindSetback > 0) {
    const topBetween = !topOver && !withRailsTop;
    const bottomBetween = !bottomOver && !omitBottom && plinth === 0;
    if (topBetween || bottomBetween) {
      warnings.push({
        id: `${cab.code}-behind-corner`, severity: 'info', ruleId: 'INFO_BEHIND_CORNER',
        message: `Kapak arkasındaki yan dikme ${behindSetback}mm geride; dikmelerin arasındaki ${topBetween && bottomBetween ? 'üst ve alt tablanın' : topBetween ? 'üst tablanın' : 'alt tablanın'} ucu köşede öne çıkar.`,
        suggestion: 'Tablayı dikmelerin üstüne/altına alın ya da tabla ucunu da geri kesin.',
      });
    }
  }
  if (cab.interior) {
    const geo = layoutInterior(cab.interior, {
      W, H, t, plinth, omitLeft, omitBottom, doorGap: cab.doorGap, inset: cab.doorOverlayType === 'inset',
      leftBehind, rightBehind,
    }, cab.code);
    result.interior = geo;
    result.innerHeight = roundDown05(geo.inner.h);
    const extra = interiorParts(cab, geo, { t, iD, frontOnly, allAround, bodyBand, confirmatPerEnd });
    parts.push(...extra.parts);
    hardware.push(...extra.hardware);
    warnings.push(...geo.warnings, ...extra.warnings);
    handleCount += extra.handles;
    confirmatCount += extra.confirmats;
  } else {
    // --- Raflar ---
    if (cab.shelfCount > 0) {
      const adj = calcAdjustableShelf(Wi, t, iD, cab.frontPullback);
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
      const fix = calcFixedShelf(Wi, t, iD, cab.assemblyType);
      parts.push({
        id: 'fixed-shelf', code: `${cab.code}-SRAF`, name: 'Sabit Raf', group: 'shelf', material: 'body',
        length: fix.width.value, width: fix.depth.value, thickness: t, quantity: cab.fixedShelfCount, bands: frontOnly,
        trace: fix.width.trace,
      });
      confirmatCount += cab.fixedShelfCount * 2 * confirmatPerEnd;
    }

    // --- Askı borusu ---
    if (cab.hangerRodCount > 0) {
      hardware.push({
        key: 'hanger_rod', name: `Askı Borusu ${roundDown05(iW - 2)}mm (taşıyıcılı)`, unit: 'adet',
        quantity: Math.floor(cab.hangerRodCount), catalogVerified: false,
      });
      if (iD < 500) {
        warnings.push({
          id: `${cab.code}-rod-depth`, severity: 'warning', ruleId: 'VAL_HANGER_DEPTH',
          message: `İç derinlik ${iD}mm; askıdaki elbiseler kapağa sürtebilir.`,
          suggestion: 'Askılı dolaplarda derinliği en az 550-580mm yapın.',
        });
      }
    }

    // --- Kapaklar ---
    const hasDrawers = cab.drawerCount > 0;
    const wantsDoors = !cab.isOpenShelf && !hasDrawers;
    const liftUp = cab.doorOpening === 'up';
    let dCount = 0;
    if (wantsDoors) {
      if (liftUp) {
        // Yukarı açılır: 600mm'ye kadar tek parça kalkar kapak, üstünde iki parçalı katlanır kapak
        dCount = cab.doorAutoGenerated ? (Hf > LIFT_SINGLE_MAX ? 2 : 1) : Math.min(2, Math.max(0, Math.floor(cab.doorCount)));
      } else {
        dCount = cab.doorAutoGenerated ? suggestDoorCount(W, 600).count : Math.max(0, Math.floor(cab.doorCount));
      }
    }

    if (dCount > 0 && liftUp) {
      const d = cab.doorGap;
      const inset = cab.doorOverlayType === 'inset';
      const coveredW = inset ? iW + behindExtra : cab.doorOverlayType === 'half' ? halfCovered : W;
      const panelW = roundDown05(coveredW - (inset ? 2 * d : d));
      const panelH = roundDown05(inset ? (iH - (dCount + 1) * d) / dCount : (Hf - dCount * d) / dCount);
      const folding = dCount === 2;

      result.doorWidth = panelW;
      result.doorHeight = panelH;
      result.doorCount = dCount;

      parts.push({
        id: 'door', code: `${cab.code}-KAPAK`, name: folding ? 'Katlanır Kapak (yukarı açılır)' : 'Kapak (yukarı açılır)',
        group: 'door', material: 'front',
        length: panelW, width: panelH, thickness: t, quantity: dCount, bands: allAround,
        trace: {
          formula: inset ? '(iH - (n+1)d) / n' : '(H - n·d) / n',
          inputs: inset ? { iH, n: dCount, d } : { H: Hf, n: dCount, d },
          ruleId: 'RULE_DOOR_LIFT_UP',
          description: folding
            ? 'Katlanır kapak: dolap yüksekliği iki eşit parçaya bölünür, parçalar ortadan menteşeyle birleşir.'
            : 'Kalkar kapak: tek parça, tam genişlikte; üst kenardan menteşelenir ve pistonla açık kalır.',
        },
      });

      // Menteşeler üst kenara (katlanırda ayrıca iki parçanın birleşim yerine) genişlik boyunca dizilir
      const perEdge = panelW > 900 ? 3 : 2;
      result.hingeCount = perEdge;
      result.hingePositions = calcHingePositions(panelW, perEdge, 90);
      hardware.push({ key: 'hinge', name: 'Ø35 Menteşe (frenli)', unit: 'adet', quantity: perEdge * dCount, catalogVerified: false });
      if (folding) {
        hardware.push({ key: 'lift_system', name: 'Katlanır Kapak Mekanizması', unit: 'takım', quantity: 1, catalogVerified: false });
      } else {
        hardware.push({ key: 'gas_strut', name: 'Kapak Amortisörü (gazlı piston)', unit: 'adet', quantity: 2, catalogVerified: false });
      }
      handleCount += 1;

      const weightKg = Math.round((panelW * panelH * t * dCount * 700) / 1e9 * 10) / 10;
      warnings.push({
        id: `${cab.code}-lift-weight`, severity: 'info', ruleId: 'INFO_LIFT_WEIGHT',
        message: `Yukarı açılır kapak yaklaşık ${weightKg} kg.`,
        suggestion: folding ? 'Mekanizmayı kapak yüksekliği ve ağırlığına göre katalogdan seçin.' : 'Piston gücünü (N) kapak ağırlığına göre seçin.',
      });
      if (!folding && panelH > LIFT_SINGLE_MAX) {
        warnings.push({
          id: `${cab.code}-lift-tall`, severity: 'warning', ruleId: 'VAL_LIFT_TOO_TALL',
          message: `Tek parça kalkar kapak ${panelH}mm yüksek; açıldığında tavana ya da başa çarpabilir.`,
          suggestion: 'Kapak sayısını 2 yapıp katlanır kapak kullanın.',
        });
      }
      if (panelW > 1200) {
        warnings.push({
          id: `${cab.code}-lift-wide`, severity: 'warning', ruleId: 'VAL_LIFT_TOO_WIDE',
          message: `Yukarı açılır kapak ${panelW}mm geniş; eğilme ve mekanizma yükü artar.`,
          suggestion: 'Dolabı ikiye bölmeyi düşünün.',
        });
      }
      if (isFloorStanding(cab.type)) {
        warnings.push({
          id: `${cab.code}-lift-base`, severity: 'info', ruleId: 'INFO_LIFT_ON_BASE',
          message: 'Yukarı açılır kapak genellikle üst dolaplarda kullanılır.',
        });
      }
    } else if (dCount > 0) {
      let dw: { value: number; trace: CalculationTrace };
      let dh: { value: number; trace: CalculationTrace };
      if (cab.doorOverlayType === 'inset') {
        dw = calcInsetDoorWidth(iW + behindExtra, cab.doorGap, dCount);
        if (behindExtra > 0) {
          dw = { value: dw.value, trace: { ...dw.trace, formula: '(iç genişlik + arkadaki dikmeler) / n - 2d', inputs: { iW, arkadaki: behindExtra, d: cab.doorGap, n: dCount },
            description: 'Kapak, arkasında kalan yan dikmenin önünü de örter; o dikmenin kalınlığı kapak ölçüsüne eklenir.' } };
        }
        dh = calcInsetDoorHeight(iH, cab.doorGap);
      } else if (cab.doorOverlayType === 'half') {
        // Yarım bindirme: kapak her yan dikmenin halfOverlayAmount kadarını örter.
        const covered = halfCovered;
        dw = {
          value: roundDown05(covered / dCount - cab.doorGap),
          trace: {
            formula: '(W - 2(t - a)) / n - d',
            inputs: { W, t, a: cab.halfOverlayAmount, n: dCount, d: cab.doorGap },
            ruleId: 'RULE_DOOR_HALF_WIDTH',
            description: 'Yarım bindirmede kapak, yan dikmenin yalnızca "a" kadarını örter.',
          },
        };
        dh = calcFullOverlayDoorHeight(Hf, cab.doorGap);
      } else {
        dw = calcFullOverlayDoorWidth(W, dCount, cab.doorGap);
        dh = calcFullOverlayDoorHeight(Hf, cab.doorGap);
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
      const fronts = calcDrawerFronts(Hf, ratios, cab.doorGap, n);
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

  }

  // --- Genel hırdavat ---
  hardware.push({ key: 'confirmat', name: 'Konfirmat 7×50', unit: 'adet', quantity: confirmatCount, catalogVerified: false });
  if (isFloorStanding(cab.type) && plinth === 0 && !opts.raised) {
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

/** Bölmeli iç düzenin parçaları ve hırdavatı. */
function interiorParts(
  cab: CabinetState,
  geo: InteriorGeometry,
  ctx: { t: number; iD: number; frontOnly: PartBands; allAround: PartBands; bodyBand: number; confirmatPerEnd: number },
): { parts: ComputedPart[]; hardware: ComputedHardware[]; warnings: ValidationWarning[]; handles: number; confirmats: number } {
  const { t, iD, frontOnly, allAround, bodyBand, confirmatPerEnd } = ctx;
  const parts: ComputedPart[] = [];
  const hardware: ComputedHardware[] = [];
  const warnings: ValidationWarning[] = [];
  let handles = 0;
  let confirmats = 0;
  const r = roundDown05;
  const trace = (formula: string, inputs: Record<string, unknown>, ruleId: string, description: string): CalculationTrace => ({ formula, inputs, ruleId, description });
  const addHw = (h: ComputedHardware) => {
    const same = hardware.find((x) => x.key === h.key && x.name === h.name);
    if (same) same.quantity += h.quantity; else hardware.push(h);
  };

  const insetFronts = cab.doorOverlayType === 'inset';
  geo.dividers.forEach((d, i) => {
    // Kapak arkasındaki dikme: gömme kapakta kapak kalınlığı + 2mm geride kesilir, kapak açılınca görünen ön kenarı bantlanır
    const setback = d.behind && insetFronts ? t + 2 : 0;
    parts.push({
      id: `div-${i}`, code: `${cab.code}-ARA-DIKME-${i + 1}`, name: d.behind ? 'Ara Dikme (kapak arkasında)' : 'Ara Dikme', group: 'body', material: 'body',
      length: r(d.h), width: r(iD - setback), thickness: t, quantity: 1, bands: frontOnly,
      trace: d.behind
        ? trace('iç yükseklik × (iç derinlik - geri çekme)', { h: r(d.h), iD, setback }, 'RULE_DIVIDER_BEHIND_DOOR', 'Dikme kapağın arkasında kalır; gömme kapakta kapak kalınlığı + 2mm geride kesilir. Kapak açılınca görünen ön kenarı bantlanır.')
        : trace('iç yükseklik × iç derinlik', { h: r(d.h), iD }, 'RULE_DIVIDER', 'Ara dikme, taban ile üst tabla arasına girer.'),
    });
    confirmats += 2 * confirmatPerEnd;
  });

  geo.partitions.forEach((p) => {
    const label = cellLabel(p.col, p.cell);
    parts.push({
      id: `part-${label}`, code: `${cab.code}-ARA-TABLA-${label}`, name: `Ara Tabla ${label}`, group: 'body', material: 'body',
      length: r(p.w), width: iD, thickness: t, quantity: 1, bands: frontOnly,
      trace: trace('bölme genişliği × iç derinlik', { w: r(p.w), iD }, 'RULE_PARTITION', 'Ara tabla, bölmenin iki dikmesi arasına girer.'),
    });
    confirmats += 2 * confirmatPerEnd;
  });

  // Raflar: göz başına tek satır
  for (const cell of geo.cells) {
    const shelves = geo.shelves.filter((s) => s.col === cell.col && s.cell === cell.cell);
    if (shelves.length === 0) continue;
    const label = cellLabel(cell.col, cell.cell);
    const fixed = shelves[0].fixed;
    const depth = fixed ? iD : r(iD - cab.frontPullback);
    parts.push({
      id: `shelf-${label}`, code: `${cab.code}-RAF-${label}`, name: `${fixed ? 'Sabit' : 'Hareketli'} Raf ${label}`,
      group: 'shelf', material: 'body', length: r(shelves[0].rect.w), width: depth, thickness: t, quantity: shelves.length, bands: frontOnly,
      trace: trace(fixed ? 'bölme genişliği' : 'bölme genişliği - 2', { w: r(cell.opening.w) }, fixed ? 'RULE_FIXED_SHELF_WIDTH' : 'RULE_ADJ_SHELF_WIDTH',
        fixed ? 'Sabit raf bölmeye sıkı oturur.' : 'Hareketli raf bölmeden 2mm dar kesilir.'),
    });
    if (fixed) confirmats += shelves.length * 2 * confirmatPerEnd;
    else addHw({ key: 'shelf_pin', name: 'Raf Pimi Ø5', unit: 'adet', quantity: shelves.length * 4, catalogVerified: false });
    const defl = validateShelfDeflection(cell.opening.w, t, depth, 15, 2800, 300);
    if (defl) warnings.push({ ...defl, id: `${cab.code}-defl-${label}`, message: `${label}: ${defl.message}` });
  }

  for (const rod of geo.rods) {
    addHw({ key: 'hanger_rod', name: `Askı Borusu ${r(rod.x2 - rod.x1 - 2)}mm (taşıyıcılı)`, unit: 'adet', quantity: 1, catalogVerified: false });
  }

  // Ön yüzler: aynı gözdeki eş ölçülü önler tek satırda
  const railLen = calcBestRailLength(iD, STANDARD_RAIL_LENGTHS).value;
  for (const cell of geo.cells) {
    const fronts = geo.fronts.filter((f) => f.col === cell.col && f.cell === cell.cell);
    if (fronts.length === 0) continue;
    const label = cellLabel(cell.col, cell.cell);
    const f0 = fronts[0];
    if (f0.kind === 'door') {
      parts.push({
        id: `door-${label}`, code: `${cab.code}-KAPAK-${label}`, name: `${f0.opening === 'up' ? 'Kalkar Kapak' : 'Kapak'} ${label}`,
        group: 'door', material: 'front', length: f0.rect.h, width: f0.rect.w, thickness: t, quantity: fronts.length, bands: allAround,
        trace: trace(cab.doorOverlayType === 'inset' ? 'göz açıklığı - 2d' : 'göz + yarım dikme/tabla - d', { w: f0.rect.w, h: f0.rect.h, d: cab.doorGap },
          'RULE_INTERIOR_DOOR', cab.doorOverlayType === 'inset' ? 'Gömme kapak gözün içine oturur, her yanda derz kadar boşluk kalır.' : 'Bindirme kapak, ara dikme ve tablaların yarısını örter.'),
      });
      for (const fr of fronts) {
        if (fr.opening === 'up') {
          addHw({ key: 'hinge', name: 'Ø35 Menteşe (frenli)', unit: 'adet', quantity: fr.rect.w > 900 ? 3 : 2, catalogVerified: false });
          addHw({ key: 'gas_strut', name: 'Kapak Amortisörü (gazlı piston)', unit: 'adet', quantity: 2, catalogVerified: false });
        } else {
          addHw({ key: 'hinge', name: 'Ø35 Menteşe (frenli)', unit: 'adet', quantity: calcHingeCount(fr.rect.h, fr.rect.w, HINGE_COUNT_TABLE, 600).value, catalogVerified: false });
        }
        handles += 1;
        if (fr.rect.w > 600 && fr.opening === 'side') {
          warnings.push({ id: `${cab.code}-wide-${label}-${fr.index}`, severity: 'warning', ruleId: 'VAL_WIDE_DOOR', message: `${label}: kapak genişliği ${fr.rect.w}mm; sarkabilir.`, suggestion: 'Çift kapak yapın.' });
        }
      }
    } else {
      parts.push({
        id: `drawer-front-${label}`, code: `${cab.code}-KLAPA-${label}`, name: `Çekmece Klapası ${label}`,
        group: 'drawer', material: 'front', length: f0.rect.w, width: f0.rect.h, thickness: t, quantity: fronts.length, bands: allAround,
        trace: trace('(göz yüksekliği - derzler) / adet', { h: f0.rect.h, n: fronts.length }, 'RULE_INTERIOR_DRAWER', 'Gözdeki çekmece klapaları eşit bölünür.'),
      });
      handles += fronts.length;
      if (railLen === 0) {
        warnings.push({ id: `${cab.code}-rail-${label}`, severity: 'error', ruleId: 'VAL_RAIL_DEPTH', message: `${label}: iç derinlik ${iD}mm; standart ray sığmıyor.`, suggestion: 'Dolabı derinleştirin.' });
        continue;
      }
      const boxW = r(cell.opening.w - cab.railWidthDeduction);
      const boxH = Math.min(250, r(cell.opening.h / fronts.length - 40));
      if (boxH < 60) {
        warnings.push({ id: `${cab.code}-drawer-low-${label}`, severity: 'warning', ruleId: 'VAL_DRAWER_LOW', message: `${label}: çekmece gözü çekmece kutusu için çok alçak.`, suggestion: 'Göz yüksekliğini artırın ya da çekmece sayısını azaltın.' });
        continue;
      }
      const n = fronts.length;
      const topBand = { ...NO_BANDS, top: bodyBand };
      parts.push({ id: `drawer-side-${label}`, code: `${cab.code}-CK${label}-YAN`, name: `Çekmece ${label} Yanı`, group: 'drawer', material: 'body', length: railLen, width: boxH, thickness: t, quantity: 2 * n, bands: topBand, trace: trace('ray boyu × kutu yüksekliği', { railLen, boxH }, 'RULE_DRAWER_BOX_DEPTH', 'Çekmece yanı boyu ray boyuna eşittir.') });
      parts.push({ id: `drawer-fb-${label}`, code: `${cab.code}-CK${label}-ONARKA`, name: `Çekmece ${label} Ön/Arka`, group: 'drawer', material: 'body', length: r(boxW - 2 * t), width: boxH, thickness: t, quantity: 2 * n, bands: topBand, trace: trace('kutu genişliği - 2t', { boxW, t }, 'RULE_DRAWER_BOX_WIDTH', 'Kutu genişliği = göz genişliği − ray düşümü.') });
      parts.push({ id: `drawer-bottom-${label}`, code: `${cab.code}-CK${label}-TABAN`, name: `Çekmece ${label} Tabanı`, group: 'drawer', material: 'back', length: boxW, width: railLen, thickness: cab.backThickness, quantity: n, bands: NO_BANDS, trace: trace('kutu genişliği × ray boyu', { boxW, railLen }, 'RULE_DRAWER_BOTTOM', 'Çekmece tabanı kutunun altına çakılır.') });
      addHw({ key: 'rail', name: `${cab.railType === 'undermount' ? 'Gizli Ray' : 'Bilyalı Ray'} ${railLen}mm`, unit: 'çift', quantity: n, catalogVerified: false });
    }
  }

  return { parts, hardware, warnings, handles, confirmats };
}
