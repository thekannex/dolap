import type { CabinetInterior, CabinetState, CellContent, InteriorCell, InteriorColumn } from '../models/cabinet';
import type { ValidationWarning } from '../models/common';
import { roundDown05 } from '../utils/rounding';

/** Dolap içinde bir dikdörtgen: x dolabın solundan, y gövdenin altından (ayaklar hariç), mm. */
export interface IRect { x: number; y: number; w: number; h: number }

export interface InteriorFrame {
  W: number;
  H: number;
  t: number;
  /** Baza yüksekliği (gövde içinde, tabanın altı). */
  plinth: number;
  omitLeft: boolean;
  omitBottom: boolean;
  doorGap: number;
  /** Kapaklar dışarıda (tam bindirme) ya da içeride (gömme). */
  inset: boolean;
  /** Dış yan dikmeler kapağın arkasında: ön yüz dikmenin önünü de örter. */
  leftBehind?: boolean;
  rightBehind?: boolean;
}

export interface CellGeometry {
  col: number;
  cell: number;
  opening: IRect;
  data: InteriorCell;
}

export interface FrontGeometry {
  col: number;
  cell: number;
  index: number;
  kind: 'door' | 'drawer';
  rect: IRect;
  hinge: 'left' | 'right';
  opening: 'side' | 'up';
}

export interface InteriorGeometry {
  inner: IRect;
  columns: Array<{ x: number; w: number }>;
  /** behind: dikmenin önünü örten kapak — 'left' soldaki bölmenin, 'right' sağdakinin. */
  dividers: Array<IRect & { index: number; behind: 'left' | 'right' | null }>;
  partitions: Array<IRect & { col: number; cell: number }>;
  cells: CellGeometry[];
  shelves: Array<{ col: number; cell: number; index: number; rect: IRect; fixed: boolean }>;
  fronts: FrontGeometry[];
  rods: Array<{ col: number; cell: number; y: number; x1: number; x2: number }>;
  /** Eşit tutulan bölme grupları (ölçü parantezi için). */
  groups: Array<{ id: string; first: number; last: number; x: number; w: number }>;
  warnings: ValidationWarning[];
}

export const MIN_COLUMN = 80;
export const MIN_CELL = 60;

let idSeq = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idSeq++).toString(36)}`;

export function newCell(content: CellContent = 'open', patch: Partial<InteriorCell> = {}): InteriorCell {
  return {
    id: newId('h'), height: 0, content,
    doorCount: 1, hinge: 'left', opening: 'side', drawerCount: 1,
    shelves: [], shelfType: 'adjustable', rod: false,
    ...patch,
  };
}

export function newColumn(cells: InteriorCell[] = [newCell()], width = 0): InteriorColumn {
  return { id: newId('s'), width, cells };
}

/** Kutunun gövde içi açıklığı (ara dikme ve tablaların yerleştiği alan). */
export function interiorFrameOf(cab: CabinetState, opts: { omitLeftSide?: boolean; omitBottom?: boolean } = {}): InteriorFrame {
  const legs = Math.max(0, Math.min(cab.legHeight || 0, cab.height / 2));
  const H = cab.height - legs;
  return {
    W: cab.width,
    H,
    t: cab.bodyThickness,
    plinth: Math.max(0, Math.min(cab.plinthHeight || 0, H / 2)),
    omitLeft: Boolean(opts.omitLeftSide),
    omitBottom: Boolean(opts.omitBottom),
    doorGap: cab.doorGap,
    inset: cab.doorOverlayType === 'inset',
    leftBehind: Boolean(cab.leftSideBehind) && !opts.omitLeftSide,
    rightBehind: Boolean(cab.rightSideBehind),
  };
}

export function innerBox(f: InteriorFrame): IRect {
  const x0 = f.omitLeft ? 0 : f.t;
  const y0 = f.plinth + (f.omitBottom ? 0 : f.t);
  return { x: x0, y: y0, w: f.W - f.t - x0, h: f.H - f.t - y0 };
}

/** Grubu olmayan ya da bitişik olmayan grup üyeliklerini temizler. */
function cleanGroups(cols: InteriorColumn[]): InteriorColumn[] {
  const counts = new Map<string, number[]>();
  cols.forEach((c, i) => { if (c.group) counts.set(c.group, [...(counts.get(c.group) ?? []), i]); });
  const valid = new Set<string>();
  for (const [id, idx] of counts) {
    const contiguous = idx.every((v, k) => k === 0 || v === idx[k - 1] + 1);
    if (idx.length >= 2 && contiguous) valid.add(id);
  }
  return cols.map((c) => (c.group && !valid.has(c.group) ? { ...c, group: null } : c));
}

/** Bir birimin (tek bölme ya da grup) toplam genişliği: bölmeler + aradaki dikmeler. */
function unitWidth(cols: InteriorColumn[], [a, b]: [number, number], t: number): number {
  return cols.slice(a, b + 1).reduce((s, c) => s + c.width, 0) + (b - a) * t;
}

/** Birimi yeni toplam genişliğe getirir; grubun içindeki bölmeler oranını korur. */
function scaleUnit(cols: InteriorColumn[], [a, b]: [number, number], total: number, t: number): InteriorColumn[] {
  const k = b - a + 1;
  const oldInner = cols.slice(a, b + 1).reduce((s, c) => s + c.width, 0);
  const inner = total - (k - 1) * t;
  const out = cols.map((c) => ({ ...c }));
  let used = 0;
  for (let i = a; i <= b; i++) {
    const w = i < b ? roundDown05((cols[i].width / oldInner) * inner) : roundDown05(inner - used);
    out[i].width = w;
    used += w;
  }
  return out;
}

/** Üst düzey birimler: her grup tek birim, grupsuz her bölme tek birim. */
export function columnUnits(cols: InteriorColumn[]): Array<[number, number]> {
  const units: Array<[number, number]> = [];
  for (let i = 0; i < cols.length; ) {
    const r = groupRange(cols, i);
    units.push(r);
    i = r[1] + 1;
  }
  return units;
}

/** Bölmenin grubunun ilk ve son indisi (grupsuzsa kendisi). */
export function groupRange(cols: InteriorColumn[], ci: number): [number, number] {
  const g = cols[ci]?.group;
  if (!g) return [ci, ci];
  let a = ci;
  let b = ci;
  while (a > 0 && cols[a - 1].group === g) a--;
  while (b < cols.length - 1 && cols[b + 1].group === g) b++;
  return [a, b];
}

/** Son sütun ve hücrelerdeki "kalan" ölçüleri açık değerlere çevirir; grupları eşitler. */
export function resolveInterior(interior: CabinetInterior, f: InteriorFrame): CabinetInterior {
  const inner = innerBox(f);
  const n = interior.columns.length;
  const fixedW = interior.columns.slice(0, -1).reduce((s, c) => s + Math.max(MIN_COLUMN, c.width), 0);
  return {
    columns: cleanGroups(interior.columns.map((c, i) => {
      const width = i < n - 1 ? Math.max(MIN_COLUMN, c.width) : roundDown05(inner.w - fixedW - (n - 1) * f.t);
      const m = c.cells.length;
      const fixedH = c.cells.slice(0, -1).reduce((s, x) => s + Math.max(MIN_CELL, x.height), 0);
      return {
        ...c,
        width,
        cells: c.cells.map((x, j) => ({
          ...x,
          height: j < m - 1 ? Math.max(MIN_CELL, x.height) : roundDown05(inner.h - fixedH - (m - 1) * f.t),
        })),
      };
    })),
  };
}

/** Bir hücreye eşit aralıklı raf yerleşimi. */
export function distributeShelves(cellHeight: number, count: number, t: number): number[] {
  if (count <= 0) return [];
  const gap = (cellHeight - count * t) / (count + 1);
  return Array.from({ length: count }, (_, k) => roundDown05(gap * (k + 1) + t * k));
}

export function layoutInterior(interior: CabinetInterior, f: InteriorFrame, code = ''): InteriorGeometry {
  const r = resolveInterior(interior, f);
  const inner = innerBox(f);
  const { t, doorGap: g } = f;
  const geo: InteriorGeometry = { inner, columns: [], dividers: [], partitions: [], cells: [], shelves: [], fronts: [], rods: [], groups: [], warnings: [] };
  const n = r.columns.length;

  let cx = inner.x;
  r.columns.forEach((col, ci) => {
    const w = col.width;
    geo.columns.push({ x: cx, w });
    if (w < MIN_COLUMN) {
      geo.warnings.push({
        id: `${code}-col-${ci}`, severity: 'error', ruleId: 'VAL_INTERIOR_WIDTH',
        message: `${ci + 1}. bölmenin genişliği ${w}mm; bölmeler dolaba sığmıyor.`,
        suggestion: 'Diğer bölmeleri daraltın ya da dolabı genişletin.',
      });
    }
    if (ci < n - 1) geo.dividers.push({ x: cx + w, y: inner.y, w: t, h: inner.h, index: ci, behind: col.dividerBehind ?? null });

    let cy = inner.y;
    const m = col.cells.length;
    col.cells.forEach((cell, cj) => {
      const h = cell.height;
      if (h < MIN_CELL) {
        geo.warnings.push({
          id: `${code}-cell-${ci}-${cj}`, severity: 'error', ruleId: 'VAL_INTERIOR_HEIGHT',
          message: `${ci + 1}. bölmenin ${cj + 1}. gözü ${h}mm; gözler bölmeye sığmıyor.`,
          suggestion: 'Diğer gözleri kısaltın ya da dolabı yükseltin.',
        });
      }
      const opening: IRect = { x: cx, y: cy, w, h };
      geo.cells.push({ col: ci, cell: cj, opening, data: cell });
      if (cj < m - 1) geo.partitions.push({ x: cx, y: cy + h, w, h: t, col: ci, cell: cj });

      // Raflar (kapaklı ve açık gözlerde)
      if (cell.content !== 'drawer') {
        const fixed = cell.shelfType === 'fixed';
        cell.shelves
          .filter((p) => p > 0 && p < h - t)
          .forEach((p, k) => {
            geo.shelves.push({ col: ci, cell: cj, index: k, fixed, rect: { x: cx + (fixed ? 0 : 1), y: cy + p, w: w - (fixed ? 0 : 2), h: t } });
          });
      }
      if (cell.rod && cell.content !== 'drawer') {
        const topShelf = Math.max(0, ...cell.shelves.filter((p) => p < h - t));
        const y = topShelf > h * 0.5 ? cy + topShelf - 60 : cy + h - 60;
        geo.rods.push({ col: ci, cell: cj, y, x1: cx, x2: cx + w });
      }

      cy += h + t;
    });
    cx += w + t;
  });
  // --- Ön yüzler: kapağın arkasındaki dikmenin önünü o taraftaki kapak örter ---
  const leftBehind = Boolean(f.leftBehind) && !f.omitLeft;
  const rightBehind = Boolean(f.rightBehind);
  // Kapak arkasındaki dikmeyi örten bölmede açık göz varsa dikmenin geri çekik kenarı görünür
  const coverers: Array<{ col: number; label: string }> = [];
  if (leftBehind) coverers.push({ col: 0, label: 'Sol yan dikme' });
  if (rightBehind) coverers.push({ col: n - 1, label: 'Sağ yan dikme' });
  geo.dividers.forEach((d) => { if (d.behind) coverers.push({ col: d.behind === 'left' ? d.index : d.index + 1, label: `${d.index + 1}. ara dikme` }); });
  if (f.inset) {
    for (const cv of coverers) {
      if (r.columns[cv.col].cells.some((c) => c.content === 'open')) {
        geo.warnings.push({
          id: `${code}-behind-open-${cv.label}`, severity: 'info', ruleId: 'INFO_BEHIND_OPEN_CELL',
          message: `${cv.label} kapağın arkasında ama örten bölmede açık göz var; orada dikmenin geri çekik ön kenarı görünür.`,
        });
      }
    }
  }
  const edgeX = (ci: number, side: 'left' | 'right'): number => {
    const col = geo.columns[ci];
    if (side === 'left') {
      if (ci === 0) return f.inset ? (leftBehind ? g : col.x + g) : g / 2;
      const d = geo.dividers[ci - 1];
      if (f.inset) return d.behind === 'right' ? d.x : col.x + g;
      const b = d.behind === 'right' ? d.x : d.behind === 'left' ? d.x + d.w : d.x + d.w / 2;
      return b + g / 2;
    }
    if (ci === n - 1) return f.inset ? (rightBehind ? f.W - g : col.x + col.w - g) : f.W - g / 2;
    const d = geo.dividers[ci];
    if (f.inset) return d.behind === 'left' ? d.x + d.w : col.x + col.w - g;
    const b = d.behind === 'left' ? d.x + d.w : d.behind === 'right' ? d.x : d.x + d.w / 2;
    return b - g / 2;
  };

  for (const c of geo.cells) {
    if (c.data.content === 'open') continue;
    const ci = c.col;
    const cj = c.cell;
    const cell = c.data;
    const m = r.columns[ci].cells.length;
    const { y, h } = c.opening;
    const xl = edgeX(ci, 'left');
    const xr = edgeX(ci, 'right');
    let region: IRect;
    if (f.inset) {
      region = { x: xl, y: y + g, w: xr - xl, h: h - 2 * g };
    } else {
      const bottom = cj === 0 ? f.plinth : y - t / 2;
      const top = cj === m - 1 ? f.H : y + h + t / 2;
      region = { x: xl, y: bottom + g / 2, w: xr - xl, h: top - bottom - g };
    }
    if (cell.content === 'door') {
      const count = cell.opening === 'up' ? 1 : cell.doorCount;
      const dw = (region.w - (count - 1) * g) / count;
      for (let k = 0; k < count; k++) {
        geo.fronts.push({
          col: ci, cell: cj, index: k, kind: 'door', opening: cell.opening,
          hinge: count === 2 ? (k === 0 ? 'left' : 'right') : cell.hinge,
          rect: { x: roundDown05(region.x + k * (dw + g)), y: roundDown05(region.y), w: roundDown05(dw), h: roundDown05(region.h) },
        });
      }
    } else {
      const count = Math.max(1, Math.floor(cell.drawerCount));
      const dh = (region.h - (count - 1) * g) / count;
      // Çekmeceler üstten alta numaralanır
      for (let k = 0; k < count; k++) {
        geo.fronts.push({
          col: ci, cell: cj, index: k, kind: 'drawer', opening: 'side', hinge: 'left',
          rect: { x: roundDown05(region.x), y: roundDown05(region.y + region.h - (k + 1) * dh - k * g), w: roundDown05(region.w), h: roundDown05(dh) },
        });
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const [a, b] = groupRange(r.columns, i);
    if (a !== i || b === a) continue;
    geo.groups.push({ id: r.columns[i].group!, first: a, last: b, x: geo.columns[a].x, w: geo.columns[b].x + geo.columns[b].w - geo.columns[a].x });
  }
  return geo;
}

// ---------------------------------------------------------------------------
// Düzenleme işlemleri: hepsi çözülmüş (açık ölçülü) iç düzen döndürür.
// ---------------------------------------------------------------------------

type Op = (interior: CabinetInterior, f: InteriorFrame) => CabinetInterior;

const mapCol = (it: CabinetInterior, ci: number, fn: (c: InteriorColumn) => InteriorColumn): CabinetInterior =>
  ({ columns: it.columns.map((c, i) => (i === ci ? fn(c) : c)) });

/** Sütunu ikiye böler; yeni sütun açık raf olarak gelir. */
export const splitColumn = (ci: number): Op => (it, f) => {
  const r = resolveInterior(it, f);
  const col = r.columns[ci];
  const half = roundDown05((col.width - f.t) / 2);
  const right = { ...newColumn(col.cells.map((c) => newCell('open', { height: c.height })), col.width - half - f.t), group: col.group ?? null };
  const columns = [...r.columns];
  columns.splice(ci, 1, { ...col, width: half }, right);
  return { columns };
};

/** Sütunu siler, genişliğini komşusuna verir. */
export const removeColumn = (ci: number): Op => (it, f) => {
  const r = resolveInterior(it, f);
  if (r.columns.length <= 1) return r;
  const gone = r.columns[ci];
  const target = ci > 0 ? ci - 1 : 1;
  const columns = r.columns.map((c, i) => (i === target ? { ...c, width: c.width + gone.width + f.t } : c));
  columns.splice(ci, 1);
  return { columns: cleanGroups(columns) };
};

/** Gözü yatay ikiye böler; üstteki yeni göz açık raf olur. */
export const splitCell = (ci: number, cj: number): Op => (it, f) => {
  const r = resolveInterior(it, f);
  return mapCol(r, ci, (col) => {
    const cell = col.cells[cj];
    const lower = roundDown05((cell.height - f.t) / 2);
    const upper = cell.height - lower - f.t;
    const cells = [...col.cells];
    cells.splice(cj, 1,
      { ...cell, height: lower, shelves: cell.shelves.filter((p) => p < lower - f.t) },
      newCell('open', { height: upper }));
    return { ...col, cells };
  });
};

/** Gözü siler, yüksekliğini alttaki (yoksa üstteki) göze verir. */
export const removeCell = (ci: number, cj: number): Op => (it, f) => {
  const r = resolveInterior(it, f);
  return mapCol(r, ci, (col) => {
    if (col.cells.length <= 1) return col;
    const gone = col.cells[cj];
    const target = cj > 0 ? cj - 1 : 1;
    const cells = col.cells.map((c, j) => (j === target ? { ...c, height: c.height + gone.height + f.t } : c));
    cells.splice(cj, 1);
    return { ...col, cells };
  });
};

/**
 * Sütun genişliğini değiştirir.
 * Gruptaki bölmede fark grup içindeki komşuya yansır (grup toplamı değişmez).
 * Grupsuz bölmede fark yandaki birime yansır; o birim bir grupsa içindeki bölmeler oranını korur.
 */
export const setColumnWidth = (ci: number, width: number, side: 'right' | 'left' = 'right'): Op => (it, f) => {
  const r = resolveInterior(it, f);
  const n = r.columns.length;
  if (n <= 1) return r;
  const [a, b] = groupRange(r.columns, ci);
  const w = Math.max(MIN_COLUMN, roundDown05(width));
  if (b > a) {
    // Grup içi alışveriş
    const other = ci < b ? ci + 1 : ci - 1;
    const pair = r.columns[ci].width + r.columns[other].width;
    const v = Math.min(w, pair - MIN_COLUMN);
    return { columns: r.columns.map((c, i) => (i === ci ? { ...c, width: v } : i === other ? { ...c, width: pair - v } : c)) };
  }
  const nb = side === 'right' && ci + 1 < n ? ci + 1 : ci - 1 >= 0 ? ci - 1 : ci + 1;
  const unit = groupRange(r.columns, nb);
  const k2 = unit[1] - unit[0] + 1;
  const pair = r.columns[ci].width + unitWidth(r.columns, unit, f.t);
  const v = Math.min(w, pair - (MIN_COLUMN * k2 + (k2 - 1) * f.t));
  const columns = r.columns.map((c, i) => (i === ci ? { ...c, width: v } : c));
  return { columns: scaleUnit(columns, unit, pair - v, f.t) };
};

/** Grubun toplam genişliğini değiştirir; fark yandaki birime yansır, grubun içindeki oran korunur. */
export const setGroupWidth = (groupId: string, total: number, side: 'right' | 'left' = 'right'): Op => (it, f) => {
  const r = resolveInterior(it, f);
  const first = r.columns.findIndex((c) => c.group === groupId);
  if (first < 0) return r;
  const unit = groupRange(r.columns, first);
  const n = r.columns.length;
  const nbIdx = side === 'right' && unit[1] + 1 < n ? unit[1] + 1 : unit[0] - 1 >= 0 ? unit[0] - 1 : unit[1] + 1 < n ? unit[1] + 1 : -1;
  if (nbIdx < 0) return r;
  const other = groupRange(r.columns, nbIdx);
  const k = unit[1] - unit[0] + 1;
  const k2 = other[1] - other[0] + 1;
  const pair = unitWidth(r.columns, unit, f.t) + unitWidth(r.columns, other, f.t);
  const minA = MIN_COLUMN * k + (k - 1) * f.t;
  const minB = MIN_COLUMN * k2 + (k2 - 1) * f.t;
  const v = Math.min(Math.max(minA, roundDown05(total)), pair - minB);
  return { columns: scaleUnit(scaleUnit(r.columns, unit, v, f.t), other, pair - v, f.t) };
};

/** Grubun içindeki bölmeleri eşitler (grup toplamı korunur). */
export const equalizeGroup = (groupId: string): Op => (it, f) => {
  const r = resolveInterior(it, f);
  const idx = r.columns.map((c, i) => (c.group === groupId ? i : -1)).filter((i) => i >= 0);
  if (idx.length < 2) return r;
  const total = idx.reduce((s, i) => s + r.columns[i].width, 0);
  const each = roundDown05(total / idx.length);
  return {
    columns: r.columns.map((c, i) => {
      const k = idx.indexOf(i);
      return k < 0 ? c : { ...c, width: k < idx.length - 1 ? each : roundDown05(total - each * (idx.length - 1)) };
    }),
  };
};

/** Göz yüksekliğini değiştirir; fark üstteki (en üstteyse alttaki) göze yansır. */
export const setCellHeight = (ci: number, cj: number, height: number): Op => (it, f) => {
  const r = resolveInterior(it, f);
  return mapCol(r, ci, (col) => {
    if (col.cells.length <= 1) return col;
    const other = cj < col.cells.length - 1 ? cj + 1 : cj - 1;
    const total = col.cells[cj].height + col.cells[other].height;
    const h = Math.min(Math.max(MIN_CELL, roundDown05(height)), total - MIN_CELL);
    return {
      ...col,
      cells: col.cells.map((c, j) => {
        if (j === cj) return { ...c, height: h, shelves: c.shelves.filter((p) => p < h - f.t) };
        if (j === other) return { ...c, height: total - h, shelves: c.shelves.filter((p) => p < total - h - f.t) };
        return c;
      }),
    };
  });
};

/**
 * Ara dikmeyi (sütun ci'nin sağındaki) iç kenardan x konumuna taşır.
 * Grup içindeki dikme iki komşu bölme arasında kayar; grubun dış dikmesi grubu bütün olarak büyütür/küçültür.
 */
export const moveDivider = (ci: number, x: number): Op => (it, f) => {
  const r = resolveInterior(it, f);
  if (ci < 0 || ci >= r.columns.length - 1) return r;
  const left = groupRange(r.columns, ci);
  const right = groupRange(r.columns, ci + 1);
  if (left[0] === right[0]) {
    const start = innerBox(f).x + r.columns.slice(0, ci).reduce((s, c) => s + c.width + f.t, 0);
    return setColumnWidth(ci, x - start)(r, f);
  }
  const start = innerBox(f).x + r.columns.slice(0, left[0]).reduce((s, c) => s + c.width + f.t, 0);
  const k1 = left[1] - left[0] + 1;
  const k2 = right[1] - right[0] + 1;
  const pair = unitWidth(r.columns, left, f.t) + unitWidth(r.columns, right, f.t);
  const minL = MIN_COLUMN * k1 + (k1 - 1) * f.t;
  const minR = MIN_COLUMN * k2 + (k2 - 1) * f.t;
  const v = Math.min(Math.max(minL, roundDown05(x - start)), pair - minR);
  return { columns: scaleUnit(scaleUnit(r.columns, left, v, f.t), right, pair - v, f.t) };
};

/** Seçili yan yana bölmeleri bir grup yapar. Bitişik değilse ya da tek bölmeyse değişiklik yapmaz. */
export const groupColumns = (indices: number[], id: string = newId('g')): Op => (it, f) => {
  const r = resolveInterior(it, f);
  const idx = [...new Set(indices)].sort((x, y) => x - y);
  const contiguous = idx.every((v, k) => k === 0 || v === idx[k - 1] + 1);
  if (idx.length < 2 || !contiguous) return r;
  const columns = r.columns.map((c, i) => (idx.includes(i) ? { ...c, group: id } : c));
  return { columns: cleanGroups(columns) };
};

/**
 * Bölmeyi listede taşır. to: taşımadan önceki dizideki ekleme yeri (0..n).
 * group: taşınan bölmenin yeni grubu (null = grupsuz); verilmezse grubu korunur.
 */
export const moveColumn = (from: number, to: number, group?: string | null): Op => (it, f) => {
  const r = resolveInterior(it, f);
  const n = r.columns.length;
  if (from < 0 || from >= n) return r;
  const columns = [...r.columns];
  const [moved] = columns.splice(from, 1);
  const at = Math.max(0, Math.min(to > from ? to - 1 : to, columns.length));
  columns.splice(at, 0, group === undefined ? moved : { ...moved, group });
  return { columns: cleanGroups(columns) };
};

/** Bölmeyi hedef bölmenin yanına taşıyıp onunla aynı gruba koyar; hedef grupsuzsa yeni grup açılır. */
export const nestColumn = (from: number, target: number, newGroupId: string = newId('g')): Op => (it, f) => {
  const r = resolveInterior(it, f);
  if (from === target || !r.columns[from] || !r.columns[target]) return r;
  const id = r.columns[target].group ?? newGroupId;
  // İşaretleme ve taşıma tek adımda: hedef tek başına "tek üyeli grup" diye temizlenmesin
  const columns = r.columns.map((c, i) => (i === target ? { ...c, group: id } : c));
  const [moved] = columns.splice(from, 1);
  const at = from < target ? target : target + 1;
  columns.splice(at, 0, { ...moved, group: id });
  return { columns: cleanGroups(columns) };
};

export const ungroupColumns = (groupId: string): Op => (it, f) => {
  const r = resolveInterior(it, f);
  return { columns: r.columns.map((c) => (c.group === groupId ? { ...c, group: null } : c)) };
};

/** Seçili bölmeleri bir kez eşitler (toplam genişlikleri korunur); grup oluşturmaz. */
export const equalizeColumnSubset = (indices: number[]): Op => (it, f) => {
  const r = resolveInterior(it, f);
  const idx = [...new Set(indices)].filter((i) => i >= 0 && i < r.columns.length).sort((x, y) => x - y);
  if (idx.length < 2) return r;
  const total = idx.reduce((s, i) => s + r.columns[i].width, 0);
  const each = roundDown05(total / idx.length);
  const columns = r.columns.map((c, i) => {
    const k = idx.indexOf(i);
    if (k < 0) return c;
    return { ...c, width: k < idx.length - 1 ? each : roundDown05(total - each * (idx.length - 1)) };
  });
  return { columns };
};

/** Ara tablayı (göz cj'nin üstündeki) y konumuna taşır. */
export const movePartition = (ci: number, cj: number, y: number): Op => (it, f) => {
  const r = resolveInterior(it, f);
  const start = innerBox(f).y + r.columns[ci].cells.slice(0, cj).reduce((s, c) => s + c.height + f.t, 0);
  return setCellHeight(ci, cj, y - start)(r, f);
};

/**
 * Ara dikmeleri eşit aralıkla dizer. Gruplar tek bölme sayılır: grubun toplamı diğer bölmelere eşitlenir,
 * grubun içindeki oran korunur.
 */
export const equalizeColumns = (): Op => (it, f) => {
  const r = resolveInterior(it, f);
  const units = columnUnits(r.columns);
  const u = units.length;
  const total = innerBox(f).w - (u - 1) * f.t;
  const each = roundDown05(total / u);
  let columns = r.columns;
  units.forEach((unit, k) => {
    columns = scaleUnit(columns, unit, k < u - 1 ? each : roundDown05(total - each * (u - 1)), f.t);
  });
  return { columns };
};

/** Bölmedeki ara tablaları eşit aralıkla dizer: tüm gözler aynı yükseklikte olur. */
export const equalizeCells = (ci: number): Op => (it, f) => {
  const r = resolveInterior(it, f);
  return mapCol(r, ci, (col) => {
    const m = col.cells.length;
    const total = innerBox(f).h - (m - 1) * f.t;
    const each = roundDown05(total / m);
    return {
      ...col,
      cells: col.cells.map((c, j) => {
        const height = j < m - 1 ? each : roundDown05(total - each * (m - 1));
        return { ...c, height, shelves: c.shelves.filter((p) => p < height - f.t) };
      }),
    };
  });
};

/** Bölmenin sağındaki ara dikmeyi kapağın arkasına alır: 'left' bu bölmenin kapağı, 'right' sağdakinin kapağı örter. */
export const setDividerBehind = (ci: number, side: 'left' | 'right' | null): Op => (it, f) => {
  const r = resolveInterior(it, f);
  if (ci < 0 || ci >= r.columns.length - 1) return r;
  return { columns: r.columns.map((c, i) => (i === ci ? { ...c, dividerBehind: side } : c)) };
};

export const updateCell = (ci: number, cj: number, patch: Partial<InteriorCell>): Op => (it, f) => {
  const r = resolveInterior(it, f);
  return mapCol(r, ci, (col) => ({ ...col, cells: col.cells.map((c, j) => (j === cj ? { ...c, ...patch } : c)) }));
};

/** Gözdeki raf sayısını eşit aralıkla ayarlar. */
export const setShelfCount = (ci: number, cj: number, count: number): Op => (it, f) => {
  const r = resolveInterior(it, f);
  const cell = r.columns[ci].cells[cj];
  return updateCell(ci, cj, { shelves: distributeShelves(cell.height, Math.max(0, Math.floor(count)), f.t) })(r, f);
};

/** Bir rafı göz tabanından y yüksekliğine taşır (komşu raflarla çakışmadan). */
export const moveShelf = (ci: number, cj: number, k: number, y: number): Op => (it, f) => {
  const r = resolveInterior(it, f);
  const cell = r.columns[ci].cells[cj];
  const sorted = [...cell.shelves].sort((a, b) => a - b);
  const below = k > 0 ? sorted[k - 1] + f.t + 20 : 20;
  const above = k < sorted.length - 1 ? sorted[k + 1] - f.t - 20 : cell.height - f.t - 20;
  sorted[k] = Math.min(Math.max(roundDown05(y), below), above);
  return updateCell(ci, cj, { shelves: sorted })(r, f);
};

/** Mevcut düz dolap ayarlarından (kapaklı/çekmeceli/raflı) tek bölmeli iç düzen üretir. */
export function interiorFromCabinet(cab: CabinetState): CabinetInterior {
  const f = interiorFrameOf(cab);
  const inner = innerBox(f);
  let cell: InteriorCell;
  if (cab.drawerCount > 0) {
    cell = newCell('drawer', { drawerCount: cab.drawerCount });
  } else {
    const shelves = distributeShelves(inner.h, cab.shelfCount + cab.fixedShelfCount, f.t);
    if (cab.isOpenShelf) cell = newCell('open', { shelves });
    else if (cab.doorOpening === 'up') cell = newCell('door', { opening: 'up', shelves });
    else cell = newCell('door', { doorCount: cab.width > 600 ? 2 : 1, hinge: cab.doorHingeSide === 'right' ? 'right' : 'left', shelves, rod: cab.hangerRodCount > 0 });
  }
  return { columns: [newColumn([cell])] };
}

export function cellLabel(ci: number, cj: number): string {
  return `${ci + 1}${String.fromCharCode(65 + cj)}`;
}

export function cellContentLabel(cell: InteriorCell): string {
  if (cell.content === 'drawer') return cell.drawerCount > 1 ? `${cell.drawerCount} çekmece` : 'Çekmece';
  if (cell.content === 'door') {
    if (cell.opening === 'up') return 'Yukarı açılır kapak';
    return cell.doorCount === 2 ? 'Çift kapak' : `Kapak (${cell.hinge === 'left' ? 'sol' : 'sağ'} menteşe)`;
  }
  return cell.shelves.length > 0 ? `Açık, ${cell.shelves.length} raf` : 'Açık niş';
}
