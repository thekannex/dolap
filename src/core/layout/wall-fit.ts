import type { Obstacle, Wall } from '../models/project';
import type { BoxContent } from './composition';
import { sideObstaclesOnWall, wallRange, SIDE_BLOCK } from './wall-survey';

/**
 * Duvar şekli ve duvara oturan dolap hesabı.
 *
 * Duvarın kendi şekli de engel listesinde tutulur: kolon, kiriş, çıkıntı (şaft) ve girinti.
 * Her engelin "derinliği" duvardan odaya ne kadar taştığıdır. Dolap alanı çizilince alan,
 * engel kenarlarından geçen çizgilerle hücrelere bölünür; her hücrede kalan derinliğe göre
 * dolap, dolgu ya da boşluk kararı verilir ve aynı hücreler birleştirilerek kutular çıkar.
 * Dolapların önü tek bir düzlemde (duvardan "derinlik" kadar ileride) hizalanır.
 */

/** Duvarın kendi şekli: kolon, kiriş, çıkıntı, girinti. */
export const WALL_SHAPE_TYPES: ReadonlySet<string> = new Set(['column', 'beam', 'protrusion', 'recess']);
/** Önüne dolap konamayan engeller (alanında hiç kutu çıkmaz). */
const BLOCKING_TYPES: ReadonlySet<string> = new Set(['window', 'door', 'appliance', SIDE_BLOCK]);
/** Dolabı etkilemeyen küçük tesisat noktaları (arkalıktan delik açılır). */
const POINT_TYPES: ReadonlySet<string> = new Set(['outlet', 'water_inlet', 'drain', 'gas']);

/** Engelin duvardan odaya taşma miktarı (mm). Önüne hiç dolap konamıyorsa sonsuz. */
export function protrusionOf(o: Pick<Obstacle, 'type' | 'depth'>): number {
  if (BLOCKING_TYPES.has(o.type)) return Infinity;
  if (o.type === 'recess' || POINT_TYPES.has(o.type)) return 0;
  return Math.max(0, o.depth || 0);
}

/** Tavan yüksekliği: üç ölçünün en düşüğü (dolap en alçak noktaya sığmalı). Ayrıntılı ölçüde terazideki tabandan en alçak tavana. */
export function wallHeightOf(wall: Pick<Wall, 'heightLeft' | 'heightCenter' | 'heightRight'> & Partial<Pick<Wall, 'survey' | 'installGap' | 'effectiveWidth'>>): number {
  if (wall.survey) return wallRange({ effectiveWidth: 0, installGap: 0, ...wall }).height;
  const hs = [wall.heightLeft, wall.heightCenter, wall.heightRight].filter((h) => h > 0);
  return hs.length > 0 ? Math.min(...hs) : 2600;
}

/** Duvar şekli engelinin varsayılan ölçüleri (duvarın boyuna göre). */
export function defaultShape(type: string, wall: Pick<Wall, 'effectiveWidth' | 'heightLeft' | 'heightCenter' | 'heightRight'> & Partial<Pick<Wall, 'survey' | 'installGap'>>): Pick<Obstacle, 'x' | 'y' | 'width' | 'height' | 'depth'> {
  const H = wallHeightOf(wall);
  const L = wall.survey ? wall.survey.length : wall.effectiveWidth;
  switch (type) {
    case 'column': return { x: Math.max(0, Math.round(L / 2 - 200)), y: 0, width: 400, height: H, depth: 300 };
    case 'beam': return { x: 0, y: H - 300, width: L, height: 300, depth: 250 };
    case 'protrusion': return { x: Math.max(0, L - 300), y: 0, width: 300, height: H, depth: 200 };
    case 'recess': return { x: Math.max(0, Math.round(L / 2 - 400)), y: 0, width: 800, height: Math.min(H, 2100), depth: 200 };
    default: return { x: 0, y: 0, width: 200, height: 200, depth: 0 };
  }
}

export interface FitRegion {
  /** Duvarın solundan alanın sol kenarına (mm). */
  x: number;
  /** Yerden alanın alt kenarına (mm). */
  y: number;
  width: number;
  height: number;
  /** Dolap ön yüzünün duvardan uzaklığı (mm). */
  depth: number;
}

export interface FitOptions {
  /** Tek kutunun en fazla genişliği; daha genişler eşit modüllere bölünür. */
  maxModule: number;
  /** Bundan sığ kalan yere dolap yerine dolgu (kapama) paneli konur. */
  minDepth: number;
  /** Bundan dar dikey şeritler: kenarda dolgu, arada komşu kutuya katılır. */
  minWidth: number;
  /** Bundan alçak yatay şeritler dolgu olur. */
  minHeight: number;
  /** 0'dan büyükse alanın üstünden bu yükseklikte ayrı üst (asma) kutular ayrılır. */
  topHeight: number;
  /** Dolgu panelinin kalınlığı. */
  thickness: number;
}

export const DEFAULT_FIT_OPTIONS: FitOptions = { maxModule: 1000, minDepth: 150, minWidth: 200, minHeight: 100, topHeight: 0, thickness: 18 };

export type FitBoxKind = 'cabinet' | 'filler';

export interface FitBox {
  kind: FitBoxKind;
  x: number;
  elevation: number;
  width: number;
  height: number;
  depth: number;
  /** Kutunun arkasının duvardan uzaklığı (çıkıntının önünde sığ kutu). */
  backOffset: number;
}

export interface FitResult {
  region: FitRegion;
  boxes: FitBox[];
  /** Hiç kutu konamayan (engelin kapladığı) parçalar. */
  blocked: Array<{ x: number; y: number; width: number; height: number }>;
  warnings: string[];
}

const EPS = 0.5;
const r05 = (v: number) => Math.round(v * 2) / 2;

interface Cell { kind: FitBoxKind | 'none'; depth: number; back: number }
const sameCell = (a: Cell, b: Cell) => a.kind === b.kind && Math.abs(a.depth - b.depth) < EPS && Math.abs(a.back - b.back) < EPS;

/** Alanı duvar şekline göre kutulara böler. */
export function fitWall(
  wall: Pick<Wall, 'effectiveWidth' | 'heightLeft' | 'heightCenter' | 'heightRight' | 'obstacles'> & Partial<Pick<Wall, 'survey' | 'installGap' | 'sideObstacles'>>,
  regionIn: FitRegion,
  optsIn: Partial<FitOptions> = {},
): FitResult {
  const o: FitOptions = { ...DEFAULT_FIT_OPTIONS, ...optsIn };
  // Ayrıntılı ölçülü duvarda yan duvarların içeri girdiği yerler ve terazideki tabandan tavana kadar
  const range = wallRange({ installGap: 0, ...wall }, regionIn.depth);
  const L = range.x1;
  const H = range.height;
  const warnings: string[] = [];

  // Alan duvarın içine kırpılır
  const x0 = Math.max(range.x0, regionIn.x);
  const x1 = Math.min(L, regionIn.x + regionIn.width);
  const y0 = Math.max(0, regionIn.y);
  const y1 = Math.min(H, regionIn.y + regionIn.height);
  const region: FitRegion = { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0), depth: regionIn.depth };
  if (regionIn.x + regionIn.width > L + EPS || regionIn.y + regionIn.height > H + EPS || regionIn.x < range.x0 - EPS || regionIn.y < -EPS) {
    warnings.push('Dolap alanı duvarın dışına taşıyordu; duvar ölçüsüne kırpıldı.');
  }
  if (region.width < EPS || region.height < EPS || region.depth < EPS) return { region, boxes: [], blocked: [], warnings };

  // Yan duvar engelleri dolabın derinliğine giriyorsa o yanı kapatır
  const obs = [...wall.obstacles, ...sideObstaclesOnWall(wall, regionIn.depth)]
    .map((ob) => ({ ...ob, p: protrusionOf(ob) }))
    .filter((ob) => ob.p > 0 && ob.x < x1 - EPS && ob.x + ob.width > x0 + EPS && ob.y < y1 - EPS && ob.y + ob.height > y0 + EPS);

  // Kesim çizgileri: alan kenarları, engel kenarları ve istenirse üst kutu çizgisi
  const cutsX = new Set([x0, x1]);
  const cutsY = new Set([y0, y1]);
  for (const ob of obs) {
    for (const v of [ob.x, ob.x + ob.width]) if (v > x0 + EPS && v < x1 - EPS) cutsX.add(v);
    for (const v of [ob.y, ob.y + ob.height]) if (v > y0 + EPS && v < y1 - EPS) cutsY.add(v);
  }
  const forcedY = new Set<number>();
  if (o.topHeight > 0 && region.height - o.topHeight >= 600) {
    const v = y1 - o.topHeight;
    cutsY.add(v);
    forcedY.add(v);
  }
  let xs = [...cutsX].sort((a, b) => a - b);
  const ys = [...cutsY].sort((a, b) => a - b);

  const blockAt = (xa: number, xb: number, ya: number, yb: number) => obs
    .filter((ob) => ob.x < xb - EPS && ob.x + ob.width > xa + EPS && ob.y < yb - EPS && ob.y + ob.height > ya + EPS)
    .reduce((m, ob) => Math.max(m, ob.p), 0);

  // Ortadaki dar dikey şeritler (ör. boru) komşu şeride katılır; o şeritte dolap sığlaşır
  for (;;) {
    const n = xs.length - 1;
    let merged = false;
    for (let i = 1; i < n - 1; i++) {
      if (xs[i + 1] - xs[i] >= o.minWidth) continue;
      // Daha dar komşuyla birleşir; böylece sığlaşan dolap en az olur
      const leftW = xs[i] - xs[i - 1];
      const rightW = xs[i + 2] - xs[i + 1];
      xs = leftW <= rightW ? xs.filter((_, k) => k !== i) : xs.filter((_, k) => k !== i + 1);
      merged = true;
      break;
    }
    if (!merged) break;
  }

  const classify = (xa: number, xb: number, ya: number, yb: number): Cell => {
    const block = blockAt(xa, xb, ya, yb);
    if (!Number.isFinite(block)) return { kind: 'none', depth: 0, back: 0 };
    const avail = region.depth - block;
    if (avail < EPS) return { kind: 'none', depth: 0, back: 0 };
    const narrow = xb - xa < o.minWidth || yb - ya < o.minHeight;
    if (avail < o.minDepth || narrow) return { kind: 'filler', depth: o.thickness, back: Math.max(block, region.depth - o.thickness) };
    return { kind: 'cabinet', depth: r05(avail), back: r05(block) };
  };

  // Şerit şerit dikey birleştirme
  type Run = { ya: number; yb: number; cell: Cell };
  const columns: Run[][] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const runs: Run[] = [];
    for (let j = 0; j < ys.length - 1; j++) {
      const cell = classify(xs[i], xs[i + 1], ys[j], ys[j + 1]);
      const last = runs[runs.length - 1];
      if (last && sameCell(last.cell, cell) && !forcedY.has(ys[j])) last.yb = ys[j + 1];
      else runs.push({ ya: ys[j], yb: ys[j + 1], cell });
    }
    columns.push(runs);
  }

  // Aynı yükseklik ve derinlikteki komşu şeritler yatay birleşir
  type Rect = { xa: number; xb: number; ya: number; yb: number; cell: Cell };
  const rects: Rect[] = [];
  const open = new Map<string, Rect>();
  columns.forEach((runs, i) => {
    const seen = new Set<string>();
    for (const run of runs) {
      const key = `${run.ya}|${run.yb}|${run.cell.kind}|${run.cell.depth}|${run.cell.back}`;
      seen.add(key);
      const prev = open.get(key);
      if (prev && Math.abs(prev.xb - xs[i]) < EPS) prev.xb = xs[i + 1];
      else {
        const rect = { xa: xs[i], xb: xs[i + 1], ya: run.ya, yb: run.yb, cell: run.cell };
        rects.push(rect);
        open.set(key, rect);
      }
    }
    for (const k of [...open.keys()]) if (!seen.has(k)) open.delete(k);
  });

  const boxes: FitBox[] = [];
  const blocked: FitResult['blocked'] = [];
  for (const rc of rects) {
    const width = rc.xb - rc.xa;
    const height = rc.yb - rc.ya;
    if (rc.cell.kind === 'none') { blocked.push({ x: rc.xa, y: rc.ya, width, height }); continue; }
    // Geniş dolaplar eşit modüllere bölünür (dolgu tek parça kalır)
    const n = rc.cell.kind === 'cabinet' ? Math.max(1, Math.ceil(width / o.maxModule - 1e-9)) : 1;
    const w = width / n;
    for (let k = 0; k < n; k++) {
      const xa = rc.xa + k * w;
      const xb = k === n - 1 ? rc.xb : rc.xa + (k + 1) * w;
      boxes.push({
        kind: rc.cell.kind, x: r05(xa), elevation: r05(rc.ya), width: r05(xb - xa), height: r05(height),
        depth: rc.cell.depth, backOffset: rc.cell.back,
      });
    }
  }
  boxes.sort((a, b) => a.x - b.x || a.elevation - b.elevation);

  if (boxes.some((b) => b.kind === 'cabinet' && b.height > 2750)) {
    warnings.push('2750 mm\'den yüksek kutu var; levha boyuna sığmayabilir. "Üst kutu yüksekliği" vererek ayırın.');
  }
  return { region, boxes, blocked, warnings };
}

/** Üretilen kutunun içeriği: alçak kutular kalkar kapaklı, derin ve uzun kutular askılı, kalanı kapaklı. */
export function fitBoxContent(b: Pick<FitBox, 'width' | 'height' | 'depth'>): BoxContent {
  if (b.height <= 700) return b.width <= 1200 ? 'lift' : 'doors';
  if (b.depth >= 450 && b.height >= 1400) return 'hanger';
  return 'doors';
}
