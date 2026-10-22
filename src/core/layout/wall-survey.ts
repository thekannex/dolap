import type { Obstacle, Wall, WallSurvey, SurveyPoint } from '../models/project';

/**
 * Düzensiz duvarın ayrıntılı ölçüsü ve bundan çıkan sonuçlar.
 *
 * Koordinatlar: x, sol köşeden duvar boyunca (zemin hizasında); y yerden yukarı; z duvar yüzünden odaya.
 * - Yan duvarlar şakulsüz olabilir (lean: tavana doğru dolap alanına kaçıklık, + içeri).
 * - Yan duvarlar bu duvara 90° bağlanmayabilir (angle: plan açısı; 90'dan küçükse yan duvar odaya doğru
 *   içeri kapanır, büyükse açılır).
 * - Tavan ve zemin düz olmayabilir: istenen kadar noktada tavan yüksekliği (o noktada yerden) ve zemin
 *   seviye farkı (sol köşeye göre, + yüksek) girilir; aralar doğrusal kabul edilir.
 *
 * Dolaplar terazide durur: tabanları zeminin en yüksek noktasında hizalanır, aradaki fark baza / ayakla alınır.
 */

const toRad = (deg: number) => (deg * Math.PI) / 180;
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Plan açısından duvar boyunca kayma oranı: 1 mm derinlikte kaç mm içeri (90° → 0). */
export function angleSlope(angleDeg: number): number {
  const a = Math.min(170, Math.max(10, angleDeg || 90));
  return Math.abs(a - 90) < 1e-9 ? 0 : 1 / Math.tan(toRad(a));
}

/** "Köşeden L mm uzakta yan duvar d mm içeri giriyor" ölçüsünden açı (derece). */
export function angleFromOffset(offsetMm: number, atMm: number): number {
  if (!atMm) return 90;
  return r1(90 - (Math.atan2(offsetMm, atMm) * 180) / Math.PI);
}

/** Noktalar arasında doğrusal değer; uçlarda sabit. Nokta yoksa varsayılan. */
export function interpolate(points: SurveyPoint[], x: number, fallback = 0): number {
  if (points.length === 0) return fallback;
  const p = [...points].sort((a, b) => a.x - b.x);
  if (x <= p[0].x) return p[0].v;
  if (x >= p[p.length - 1].x) return p[p.length - 1].v;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i];
    const b = p[i + 1];
    if (x >= a.x && x <= b.x) return b.x === a.x ? b.v : a.v + ((b.v - a.v) * (x - a.x)) / (b.x - a.x);
  }
  return fallback;
}

/** Eski (3 genişlik / 3 yükseklik) ölçüden başlangıç ölçüsü. */
export function surveyFromLegacy(w: Pick<Wall, 'widthLeft' | 'widthCenter' | 'widthRight' | 'heightLeft' | 'heightCenter' | 'heightRight'>): WallSurvey {
  const length = w.widthLeft || w.widthCenter || w.widthRight || 3000;
  // Alt-üst genişlik farkı iki yan duvara eşit bölünür (hangisinin kaçtığı bilinmiyorsa)
  const narrowing = Math.max(0, (w.widthLeft || length) - (w.widthRight || length));
  return {
    length,
    leftLean: narrowing / 2,
    rightLean: narrowing / 2,
    leftAngle: 90,
    rightAngle: 90,
    ceiling: [
      { x: 0, v: w.heightLeft || 2500 },
      { x: Math.round(length / 2), v: w.heightCenter || w.heightLeft || 2500 },
      { x: length, v: w.heightRight || w.heightLeft || 2500 },
    ],
    floor: [],
  };
}

export const surveyOf = (wall: Wall): WallSurvey => wall.survey ?? surveyFromLegacy(wall);

export interface WallAnalysisOptions {
  /** Dolap derinliği (yan duvar açısı derinlikte genişliği değiştirir). */
  depth: number;
  /** Montaj payı (her iki yandan toplam). */
  installGap?: number;
  /** Dolabın üst kotu, terazideki tabandan (yoksa en alçak tavana kadar). */
  cabinetTop?: number;
  /** En yüksek zemin noktasındaki baza ve ayak yüksekliği. */
  plinth?: number;
  legs?: number;
}

export interface SideFiller {
  side: 'left' | 'right';
  /** Ön yüzde, alttaki ve üstteki dolgu genişliği (dolap yanı ile duvar arası). */
  bottom: number;
  top: number;
  /** Arka (duvar dibinde) alttaki boşluk; açı varsa önden farklıdır. */
  back: number;
  height: number;
}

export interface WallAnalysis {
  length: number;
  /** Dolap sığabilecek aralık (x0..x1) ve genişliği (montaj payı düşülmüş). */
  x0: number;
  x1: number;
  width: number;
  /** Terazideki dolap tabanının, sol köşe zeminine göre kotu (zeminin en yüksek noktası). */
  baseLevel: number;
  /** Tabandan en alçak tavana: dolabın en fazla yüksekliği. */
  height: number;
  /** Çizim için en yüksek tavan kotu. */
  maxCeiling: number;
  fillers: SideFiller[];
  /** Zemin: her noktada tabana göre eksik yükseklik, gereken baza ve ayak. */
  floorTable: Array<{ x: number; floor: number; extra: number; plinth: number; legs: number }>;
  /** Tavan: dolap üstü ile tavan arası (kapama yüksekliği). */
  ceilingTable: Array<{ x: number; ceiling: number; gap: number }>;
  warnings: string[];
}

/** Ölçüden kullanılabilir alan, kama dolgular, baza/ayak ve tavan kapama profili. */
export function analyzeWall(survey: WallSurvey, opts: WallAnalysisOptions): WallAnalysis {
  const L = survey.length;
  const D = Math.max(0, opts.depth);
  const gap = opts.installGap ?? 0;
  const sL = angleSlope(survey.leftAngle);
  const sR = angleSlope(survey.rightAngle);
  const warnings: string[] = [];

  // Yan duvarın x konumu: y yükseklikte (0..1 oranı), z derinlikte
  const leftX = (yRatio: number, z: number) => survey.leftLean * yRatio + z * sL;
  const rightX = (yRatio: number, z: number) => L - survey.rightLean * yRatio - z * sR;
  // Dolap kutusu (tüm yükseklik ve derinlik boyunca) iki yan duvarın en içeri girdiği yere sığmalı
  const x0 = Math.max(0, leftX(0, 0), leftX(1, 0), leftX(0, D), leftX(1, D));
  const x1 = Math.min(L, rightX(0, 0), rightX(1, 0), rightX(0, D), rightX(1, D));
  const width = r1(Math.max(0, x1 - x0 - gap));

  const floorAt = (x: number) => interpolate(survey.floor, x, 0);
  const ceilingAt = (x: number) => floorAt(x) + interpolate(survey.ceiling, x, 2500);
  // Örnek noktalar: ölçü noktaları ve aralığın uçları
  const xs = [...new Set([x0, x1, ...survey.floor.map((p) => p.x), ...survey.ceiling.map((p) => p.x)]
    .filter((x) => x >= x0 - 1e-6 && x <= x1 + 1e-6))].sort((a, b) => a - b);
  const baseLevel = Math.max(...xs.map(floorAt));
  const lowest = Math.min(...xs.map(ceilingAt));
  const height = r1(lowest - baseLevel);
  const maxCeiling = Math.max(...[0, L, ...survey.ceiling.map((p) => p.x)].map(ceilingAt));

  // Kama dolgular: dolap yanı x0'da / x1'de dik durur; ön yüzde duvara kadar olan boşluk
  const H = Math.min(opts.cabinetTop ?? height, height);
  const ref = Math.max(1, maxCeiling - Math.min(0, ...survey.floor.map((p) => p.v)));
  const fillers: SideFiller[] = [];
  const lb = x0 - leftX(0, D);
  const lt = x0 - leftX(H / ref, D);
  const lbk = x0 - leftX(0, 0);
  if (Math.max(lb, lt, lbk) > 1) fillers.push({ side: 'left', bottom: r1(lb), top: r1(lt), back: r1(lbk), height: r1(H) });
  const rb = rightX(0, D) - x1;
  const rt = rightX(H / ref, D) - x1;
  const rbk = rightX(0, 0) - x1;
  if (Math.max(rb, rt, rbk) > 1) fillers.push({ side: 'right', bottom: r1(rb), top: r1(rt), back: r1(rbk), height: r1(H) });

  const plinth = opts.plinth ?? 0;
  const legs = opts.legs ?? 0;
  const floorTable = xs.map((x) => {
    const extra = r1(baseLevel - floorAt(x));
    return { x: r1(x), floor: r1(floorAt(x)), extra, plinth: r1(plinth + extra), legs: r1(legs + extra) };
  });
  const top = baseLevel + H;
  const ceilingTable = xs.map((x) => ({ x: r1(x), ceiling: r1(ceilingAt(x)), gap: r1(ceilingAt(x) - top) }));

  if (Math.abs(survey.leftAngle - 90) > 5 || Math.abs(survey.rightAngle - 90) > 5) {
    warnings.push('Köşe açısı 90°\'den 5°\'ten fazla sapıyor; dolabın yanında görünür bir kama boşluğu kalır.');
  }
  const floorSpread = Math.max(...xs.map(floorAt)) - Math.min(...xs.map(floorAt));
  if (floorSpread > 20) warnings.push(`Zemin dolap boyunca ${r1(floorSpread)} mm farklı; ayaklar ya da baza bu farkı alacak şekilde seçilmeli.`);
  if (width <= 0) warnings.push('Duvara bu derinlikte dolap sığmıyor; ölçüleri kontrol edin.');

  return { length: L, x0: r1(x0), x1: r1(x1), width, baseLevel: r1(baseLevel), height, maxCeiling: r1(maxCeiling), fillers, floorTable, ceilingTable, warnings };
}

/** Mutfak alt dolabı ve duvar dolabı için başlangıç derinliği. */
export const REFERENCE_DEPTH = 600;

/**
 * Duvarın dolap koyulabilecek aralığı. Ayrıntılı ölçü yoksa eski davranış: 0'dan kullanılabilir genişliğe,
 * yükseklik en alçak ölçü.
 */
export function wallRange(wall: Pick<Wall, 'effectiveWidth' | 'heightLeft' | 'heightCenter' | 'heightRight' | 'installGap'> & Partial<Pick<Wall, 'survey'>>, depth = REFERENCE_DEPTH): { length: number; x0: number; x1: number; height: number; maxCeiling: number } {
  if (!wall.survey) {
    const hs = [wall.heightLeft, wall.heightCenter, wall.heightRight].filter((h) => h > 0);
    const h = hs.length > 0 ? Math.min(...hs) : 2600;
    return { length: wall.effectiveWidth, x0: 0, x1: wall.effectiveWidth, height: h, maxCeiling: Math.max(h, ...hs) };
  }
  const a = analyzeWall(wall.survey, { depth, installGap: wall.installGap });
  return { length: a.length, x0: a.x0, x1: a.x0 + a.width, height: a.height, maxCeiling: a.maxCeiling };
}

/** Ayrıntılı ölçü değişince eski alanlar (genişlik, yükseklik, kullanılabilir genişlik) ondan güncellenir. */
export function legacyFieldsFromSurvey(survey: WallSurvey, installGap: number): Pick<Wall, 'widthLeft' | 'widthCenter' | 'widthRight' | 'heightLeft' | 'heightCenter' | 'heightRight' | 'effectiveWidth'> {
  const L = survey.length;
  const a = analyzeWall(survey, { depth: REFERENCE_DEPTH, installGap });
  const h = (x: number) => Math.round(interpolate(survey.ceiling, x, 2500));
  return {
    widthLeft: L,
    widthCenter: Math.round(L - (survey.leftLean + survey.rightLean) / 2),
    widthRight: Math.round(L - survey.leftLean - survey.rightLean),
    heightLeft: h(0), heightCenter: h(L / 2), heightRight: h(L),
    effectiveWidth: Math.floor(a.width),
  };
}

/** Duvarın dolapları etkileyen ölçülerinin kısa izi; dolap kurulduktan sonra değişip değişmediğini anlamak için. */
export function wallSignature(wall: Wall): string {
  const data = JSON.stringify({
    s: wall.survey ?? null,
    w: [wall.widthLeft, wall.widthCenter, wall.widthRight, wall.heightLeft, wall.heightCenter, wall.heightRight, wall.installGap],
    o: [...wall.obstacles].sort((a, b) => a.id.localeCompare(b.id)).map((o) => [o.type, o.x, o.y, o.width, o.height, o.depth]),
    y: [...(wall.sideObstacles ?? [])].sort((a, b) => a.id.localeCompare(b.id)).map((o) => [o.side, o.type, o.x, o.y, o.width, o.height, o.depth]),
  });
  let h = 5381;
  for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Önüne dolap konamayan yan duvar engeli türü (ana duvar koordinatına çevrilmiş). */
export const SIDE_BLOCK = 'side-block';
/** Yan duvarda dolabı etkilemeyen tesisat noktaları. */
const SIDE_POINT_TYPES: ReadonlySet<string> = new Set(['outlet', 'water_inlet', 'drain', 'gas']);

/**
 * Yan duvar engellerini ana duvar koordinatına çevirir: engel dolabın derinliğine (0..depth) giriyorsa,
 * o yükseklikte köşeden engelin ucuna kadar olan bölge kapalı sayılır (dolap o yana kadar gelemez).
 */
export function sideObstaclesOnWall(
  wall: Pick<Wall, 'effectiveWidth' | 'sideObstacles'> & Partial<Pick<Wall, 'survey'>>,
  depth: number,
): Obstacle[] {
  const list = wall.sideObstacles ?? [];
  if (list.length === 0) return [];
  const L = wall.survey?.length ?? wall.effectiveWidth;
  const sL = angleSlope(wall.survey?.leftAngle ?? 90);
  const sR = angleSlope(wall.survey?.rightAngle ?? 90);
  const out: Obstacle[] = [];
  for (const o of list) {
    if (SIDE_POINT_TYPES.has(o.type) || o.depth <= 0) continue;
    const z0 = Math.max(0, o.x);
    const z1 = Math.min(depth, o.x + o.width);
    if (z1 <= z0) continue; // dolabın önünde kalıyor
    const reach = Math.max(z0, z1) * (o.side === 'left' ? sL : sR);
    const span = Math.max(0, Math.max(z0 * (o.side === 'left' ? sL : sR), reach)) + o.depth;
    out.push({
      id: `yan-${o.id}`, wallId: o.wallId, type: SIDE_BLOCK, depth: 0,
      x: o.side === 'left' ? 0 : r1(L - span), y: o.y, width: r1(span), height: o.height,
    });
  }
  return out;
}
