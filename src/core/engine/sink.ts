import type { SinkSpec } from '../models/cabinet';
import type { ValidationWarning } from '../models/common';
import { roundDown05 } from '../utils/rounding';

/** Evye kenarının (çanak dışındaki düz kısım) tipik genişliği (mm). */
const RIM = 25;
export const FAUCET_HOLE_DIAMETER = 35;

export interface SinkPreset {
  id: string;
  name: string;
  spec: Omit<SinkSpec, 'presetId' | 'offsetX' | 'frontGap' | 'faucetBackGap'>;
}

/**
 * Piyasada yaygın evye ölçüleri. Değerler tipiktir; kesimden önce evyenin kendi şablonuyla doğrulanmalıdır.
 * Ankastre evyede kesim, dış ölçüden her yandan ~10mm küçüktür. Tezgâh altı evyede kesim çanak ağzıdır.
 */
export const SINK_PRESETS: SinkPreset[] = [
  { id: 'inset-50x50', name: 'Tek göz 50×50 (ankastre)', spec: { mount: 'inset', outerWidth: 500, outerDepth: 500, cutoutWidth: 480, cutoutDepth: 480, bowlCount: 1, bowlWidth: 400, drainer: 'none', faucet: 'sink' } },
  { id: 'inset-86x50', name: 'Tek göz damlalıklı 86×50', spec: { mount: 'inset', outerWidth: 860, outerDepth: 500, cutoutWidth: 840, cutoutDepth: 480, bowlCount: 1, bowlWidth: 400, drainer: 'right', faucet: 'sink' } },
  { id: 'inset-100x50', name: 'Tek göz damlalıklı 100×50', spec: { mount: 'inset', outerWidth: 1000, outerDepth: 500, cutoutWidth: 980, cutoutDepth: 480, bowlCount: 1, bowlWidth: 450, drainer: 'right', faucet: 'sink' } },
  { id: 'inset-116x50-15', name: '1,5 göz damlalıklı 116×50', spec: { mount: 'inset', outerWidth: 1160, outerDepth: 500, cutoutWidth: 1140, cutoutDepth: 480, bowlCount: 2, bowlWidth: 560, drainer: 'right', faucet: 'sink' } },
  { id: 'inset-80x50-2', name: 'Çift göz 80×50', spec: { mount: 'inset', outerWidth: 800, outerDepth: 500, cutoutWidth: 780, cutoutDepth: 480, bowlCount: 2, bowlWidth: 700, drainer: 'none', faucet: 'sink' } },
  { id: 'inset-116x50-2', name: 'Çift göz damlalıklı 116×50', spec: { mount: 'inset', outerWidth: 1160, outerDepth: 500, cutoutWidth: 1140, cutoutDepth: 480, bowlCount: 2, bowlWidth: 720, drainer: 'right', faucet: 'sink' } },
  { id: 'under-50x40', name: 'Tezgâh altı tek göz 50×40', spec: { mount: 'undermount', outerWidth: 540, outerDepth: 440, cutoutWidth: 500, cutoutDepth: 400, bowlCount: 1, bowlWidth: 500, drainer: 'none', faucet: 'countertop' } },
  { id: 'under-70x40', name: 'Tezgâh altı tek göz 70×40', spec: { mount: 'undermount', outerWidth: 740, outerDepth: 440, cutoutWidth: 700, cutoutDepth: 400, bowlCount: 1, bowlWidth: 700, drainer: 'none', faucet: 'countertop' } },
];

export const DEFAULT_SINK_PRESET_ID = 'inset-86x50';

export function createSinkFromPreset(presetId: string = DEFAULT_SINK_PRESET_ID): SinkSpec {
  const preset = SINK_PRESETS.find((p) => p.id === presetId) ?? SINK_PRESETS[1];
  return { presetId: preset.id, ...preset.spec, offsetX: null, frontGap: 60, faucetBackGap: 45 };
}

export interface Rect { x: number; y: number; w: number; h: number }

/**
 * Evyenin tezgâh üstündeki yerleşimi. Koordinatlar dolabın sol kenarından (x) ve tezgâhın ön kenarından (y), mm.
 */
export interface SinkLayout {
  countertopDepth: number;
  outer: Rect;
  cutout: Rect;
  bowls: Rect[];
  drainer: Rect | null;
  faucet: { x: number; y: number; diameter: number; onSink: boolean } | null;
  /** Dolap dışına taşan kısım (mm), soldan ve sağdan. */
  overhangLeft: number;
  overhangRight: number;
  /** Bu evyenin çanağı için gereken en dar dolap genişliği (mm). */
  minCabinetWidth: number;
  warnings: ValidationWarning[];
}

/** Çanağın evye dış kenarına göre soldan uzaklığı. */
function bowlLeftInSink(spec: SinkSpec): number {
  if (spec.mount === 'undermount') return (spec.outerWidth - spec.bowlWidth) / 2;
  if (spec.drainer === 'right') return RIM;
  if (spec.drainer === 'left') return spec.outerWidth - RIM - spec.bowlWidth;
  return (spec.outerWidth - spec.bowlWidth) / 2;
}

/** Çanağın dolabın ortasına geleceği evye sol kenar konumu. */
export function autoSinkOffset(spec: SinkSpec, cabinetWidth: number): number {
  return roundDown05(cabinetWidth / 2 - (bowlLeftInSink(spec) + spec.bowlWidth / 2));
}

/** Evye yönünün ustalar arasındaki adı. */
export function sinkDirectionLabel(drainer: SinkSpec['drainer']): string {
  if (drainer === 'right') return 'Çanak solda, damlalık sağda';
  if (drainer === 'left') return 'Çanak sağda, damlalık solda';
  return 'Damlalıksız';
}

export interface SinkNeighbors {
  /** Dolabın solunda/sağında evyenin taşabileceği bir alt dolap var mı. */
  left: 'cabinet' | 'blocked' | 'wall_end';
  right: 'cabinet' | 'blocked' | 'wall_end';
}

/**
 * Damlalığın taşacağı tarafta alt dolap yoksa (duvar ucu, boy dolap, cihaz boşluğu) uyarır ve doğru yönü önerir.
 * Taşma yoksa yön serbesttir.
 */
export function checkSinkDirection(spec: SinkSpec, layout: SinkLayout, neighbors: SinkNeighbors, code: string): ValidationWarning | null {
  const what = (n: SinkNeighbors['left']) => (n === 'wall_end' ? 'duvar ucu' : 'boy dolap ya da cihaz boşluğu');
  const sides: Array<['left' | 'right', number]> = [['left', layout.overhangLeft], ['right', layout.overhangRight]];
  for (const [side, amount] of sides) {
    if (amount <= 0 || neighbors[side] === 'cabinet') continue;
    const other = side === 'left' ? 'right' : 'left';
    const canFlip = spec.drainer !== 'none' && neighbors[other] === 'cabinet';
    return {
      id: `${code}-sink-direction`, severity: 'error', ruleId: 'VAL_SINK_DIRECTION',
      message: `Evye ${side === 'left' ? 'solda' : 'sağda'} ${amount}mm taşıyor ama o tarafta ${what(neighbors[side])} var.`,
      suggestion: canFlip
        ? `Evye yönünü "${sinkDirectionLabel(spec.drainer === 'right' ? 'left' : 'right')}" yapın.`
        : 'Evyeyi kaydırın, daha kısa bir evye seçin ya da evye dolabını genişletin.',
    };
  }
  return null;
}

export function computeSinkLayout(
  spec: SinkSpec,
  cab: { code: string; width: number; bodyThickness: number },
  countertopDepth: number,
): SinkLayout {
  const W = cab.width;
  const t = cab.bodyThickness;
  const warnings: ValidationWarning[] = [];
  const r = (n: number) => roundDown05(n);

  const sinkX = spec.offsetX ?? autoSinkOffset(spec, W);
  const sinkY = spec.frontGap;
  const outer: Rect = { x: r(sinkX), y: r(sinkY), w: spec.outerWidth, h: spec.outerDepth };
  const cutout: Rect = {
    x: r(sinkX + (spec.outerWidth - spec.cutoutWidth) / 2),
    y: r(sinkY + (spec.outerDepth - spec.cutoutDepth) / 2),
    w: spec.cutoutWidth,
    h: spec.cutoutDepth,
  };

  const bowlX = sinkX + bowlLeftInSink(spec);
  const bowlDepth = spec.mount === 'undermount' ? spec.cutoutDepth : spec.outerDepth - 2 * RIM - 20;
  const bowlY = spec.mount === 'undermount' ? cutout.y : sinkY + RIM;
  const bowls: Rect[] = [];
  if (spec.bowlCount === 2) {
    // 1,5 / çift göz: büyük göz %60, küçük göz %40 (çift gözde eşit), aralarında 20mm.
    // Küçük göz damlalık tarafındadır; yön değişince sıra aynalanır. bowls[0] her zaman büyük gözdür.
    const half = spec.bowlWidth - 20;
    const big = spec.bowlWidth >= 700 ? half / 2 : half * 0.6;
    const small = half - big;
    const bigFirst = spec.drainer !== 'left';
    const bigX = bigFirst ? bowlX : bowlX + small + 20;
    const smallX = bigFirst ? bowlX + big + 20 : bowlX;
    bowls.push({ x: r(bigX), y: r(bowlY), w: r(big), h: r(bowlDepth) });
    bowls.push({ x: r(smallX), y: r(bowlY), w: r(small), h: r(bowlDepth) });
  } else {
    bowls.push({ x: r(bowlX), y: r(bowlY), w: spec.bowlWidth, h: r(bowlDepth) });
  }

  let drainer: Rect | null = null;
  if (spec.mount === 'inset' && spec.drainer !== 'none') {
    const dw = spec.outerWidth - spec.bowlWidth - 3 * RIM;
    const dx = spec.drainer === 'right' ? bowlX + spec.bowlWidth + RIM : sinkX + RIM;
    if (dw > 0) drainer = { x: r(dx), y: r(bowlY), w: r(dw), h: r(bowlDepth) };
  }

  // Batarya: ana çanağın ekseninde; evye üstündeyse arka kenardan 35mm içeride, tezgâhtaysa evyenin arkasında
  let faucet: SinkLayout['faucet'] = null;
  if (spec.faucet !== 'none') {
    const main = bowls[0];
    const fx = r(main.x + main.w / 2);
    const onSink = spec.faucet === 'sink';
    const fy = onSink ? r(sinkY + spec.outerDepth - 35) : r(sinkY + spec.outerDepth + spec.faucetBackGap);
    faucet = { x: fx, y: fy, diameter: FAUCET_HOLE_DIAMETER, onSink };
  }

  const minCabinetWidth = spec.bowlWidth + 2 * t + 20;
  const bowlLeftAbs = bowlX;
  const bowlRightAbs = bowlX + spec.bowlWidth;
  if (bowlLeftAbs < t + 10 || bowlRightAbs > W - t - 10) {
    warnings.push({
      id: `${cab.code}-sink-fit`, severity: 'error', ruleId: 'VAL_SINK_BOWL_FIT',
      message: `Evye çanağı (${spec.bowlWidth}mm) dolabın iç genişliğine sığmıyor.`,
      suggestion: W < minCabinetWidth
        ? `Bu evye için en az ${minCabinetWidth}mm genişlikte evye dolabı gerekir.`
        : 'Evye konumunu "Otomatik" yapın ya da kaydırma değerini azaltın.',
    });
  }

  const backMargin = countertopDepth - (sinkY + spec.outerDepth);
  if (sinkY < 30) {
    warnings.push({
      id: `${cab.code}-sink-front`, severity: 'warning', ruleId: 'VAL_SINK_FRONT',
      message: `Evye ön kenarı tezgâh önüne ${sinkY}mm; tezgâh kırılabilir.`,
      suggestion: 'Ön payı en az 50mm yapın.',
    });
  }
  if (backMargin < 20) {
    warnings.push({
      id: `${cab.code}-sink-back`, severity: 'error', ruleId: 'VAL_SINK_DEPTH',
      message: `Evye tezgâha sığmıyor: arkada ${backMargin}mm kalıyor (tezgâh ${countertopDepth}mm).`,
      suggestion: 'Ön payı azaltın ya da daha sığ bir evye seçin.',
    });
  } else if (faucet && !faucet.onSink && countertopDepth - faucet.y < FAUCET_HOLE_DIAMETER / 2 + 20) {
    warnings.push({
      id: `${cab.code}-faucet-back`, severity: 'warning', ruleId: 'VAL_FAUCET_BACK',
      message: `Batarya deliği tezgâhın arka kenarına çok yakın (${r(countertopDepth - faucet.y)}mm).`,
      suggestion: 'Evyeyi öne alın ya da bataryayı evye üstüne taşıyın.',
    });
  }

  const overhangLeft = r(Math.max(0, -outer.x));
  const overhangRight = r(Math.max(0, outer.x + outer.w - W));
  if (overhangLeft > 0 || overhangRight > 0) {
    warnings.push({
      id: `${cab.code}-sink-overhang`, severity: 'info', ruleId: 'INFO_SINK_OVERHANG',
      message: `Evye dolap dışına taşıyor (${overhangLeft > 0 ? `solda ${overhangLeft}mm` : ''}${overhangLeft > 0 && overhangRight > 0 ? ', ' : ''}${overhangRight > 0 ? `sağda ${overhangRight}mm` : ''}).`,
      suggestion: 'Damlalık komşu dolabın üstüne gelir; komşu dolabın kuşak ve raflarını kontrol edin.',
    });
  }
  if (spec.presetId !== 'custom') {
    warnings.push({
      id: `${cab.code}-sink-template`, severity: 'info', ruleId: 'INFO_SINK_TEMPLATE',
      message: 'Evye ölçüleri tipik değerlerdir.',
      suggestion: 'Tezgâhı kesmeden önce evyenin kendi kesim şablonuyla karşılaştırın.',
    });
  }

  return { countertopDepth, outer, cutout, bowls, drainer, faucet, overhangLeft, overhangRight, minCabinetWidth, warnings };
}
