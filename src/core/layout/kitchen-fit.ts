import type { Wall } from '../models/project';
import { fitWall } from './wall-fit';
import type { FitResult } from './wall-fit';
import { planModules } from './module-planner';
import { wallRange } from './wall-survey';
import { KITCHEN_LEG_HEIGHT, UPPER_BOTTOM } from './scene-layout';

/**
 * Duvar şekline uyan mutfak önerisi. Alt ve üst dolap sırası duvar dolabıyla aynı engel hesabından
 * geçer (fitWall): kolon ve çıkıntının önüne sığ dolap ya da dolgu, kirişin altında kısa üst dolap,
 * pencere, kapı ve cihaz boşluğunun önü boş, yan duvar engelleri hesapta. Kalan her parça
 * seçilen standart genişliklere (300, 400, 600…) ve dolguya bölünür.
 */

export interface KitchenPlanOptions {
  /** Kullanılacak dolap genişlikleri (mm). */
  widths: number[];
  /** Üst dolap sırası da kurulsun mu. */
  includeUpper: boolean;
  /**
   * Standart genişliklerle dolmayan artan pay (ör. 48 mm) dolgu paneli yerine sıranın kenardaki
   * dolabına eklenir; dolap duvara / kolona tam dayanır. Kapalıysa pay dolgu paneli olur.
   * Eski kayıtlarda yoksa açık sayılır.
   */
  absorbFiller?: boolean;
}

export const DEFAULT_KITCHEN_PLAN: KitchenPlanOptions = { widths: [300, 400, 450, 500, 600], includeUpper: true, absorbFiller: true };

/** Artan payı alan dolap bundan genişe çıkmaz; çıkacaksa pay dolgu olarak kalır. */
const MAX_ABSORBED_WIDTH = 1200;
/** Standart dolabın sığmadığı aralık bundan genişse dolgu yerine o ende tek dolap olur. */
const MIN_ABSORBED_CABINET = 200;

/** Mutfak sıralarının ölçüleri (dolap türlerinin hazır ölçüleriyle aynı). */
export const KITCHEN_ROWS = {
  base: { y: KITCHEN_LEG_HEIGHT, height: 720, depth: 560 },
  wall: { y: UPPER_BOTTOM, height: 720, depth: 330 },
} as const;

export interface KitchenModule {
  row: 'base' | 'wall';
  kind: 'cabinet' | 'filler';
  /** Duvarın solundan (mm). */
  x: number;
  width: number;
  height: number;
  /** Yerden alt kenar (mm). */
  elevation: number;
  depth: number;
  /** Arkasının duvardan uzaklığı: kolon / çıkıntı önündeki sığ dolap. */
  backOffset: number;
}

export interface KitchenPlan {
  modules: KitchenModule[];
  /** Dolap konamayan parçalar (pencere, kapı, cihaz boşluğu, yan duvar engeli). */
  blocked: Array<{ row: 'base' | 'wall'; x: number; width: number }>;
  warnings: string[];
  totalFiller: number;
}

const MIN_FILLER = 30;
const MAX_FILLER = 150;

/** Bir sıranın engellere göre bölünmüş parçalarını dolaplara ayırır. */
function planRow(row: 'base' | 'wall', fit: FitResult, widths: number[], bandHeight: number, absorb: boolean, out: KitchenPlan) {
  for (const b of fit.blocked) out.blocked.push({ row, x: b.x, width: b.width });
  const mods: KitchenModule[] = [];
  const strips: KitchenModule[] = [];
  for (const box of fit.boxes) {
    const base = { row, height: box.height, elevation: box.elevation, depth: box.depth, backOffset: box.backOffset };
    // Sıranın yarısından alçak parça kapama şerididir (ör. kirişin önü); altında dolap varsa kalır
    if (box.height < bandHeight / 2) { strips.push({ ...base, kind: 'filler', x: box.x, width: box.width }); continue; }
    if (box.kind === 'filler') { mods.push({ ...base, kind: 'filler', x: box.x, width: box.width }); continue; }
    const plan = planModules({ effectiveWidth: box.width, standardWidths: widths, fixedModules: [], minFillerWidth: MIN_FILLER, maxFillerWidth: MAX_FILLER });
    const seg = plan.modules.map((m) => ({ ...base, kind: (m.type === 'filler' ? 'filler' : 'cabinet') as KitchenModule['kind'], x: m.x, width: m.width }));
    const cabs = seg.filter((m) => m.kind === 'cabinet');
    const extra = seg.filter((m) => m.kind === 'filler').reduce((s, m) => s + m.width, 0);
    const edge = cabs[cabs.length - 1];
    if (absorb && extra > 0 && edge && edge.width + extra <= MAX_ABSORBED_WIDTH) {
      // Artan pay kenardaki dolaba eklenir; dolaplar parçayı tam doldurur
      edge.width = Math.round((edge.width + extra) * 2) / 2;
      let x = 0;
      for (const m of cabs) { mods.push({ ...m, x: Math.round((box.x + x) * 2) / 2 }); x += m.width; }
      continue;
    }
    // Hiçbir standart dolabın sığmadığı ama dolap olabilecek genişlikteki aralık tek dolap olur
    if (absorb && cabs.length === 0 && box.width >= MIN_ABSORBED_CABINET) {
      mods.push({ ...base, kind: 'cabinet', x: box.x, width: box.width });
      continue;
    }
    if (plan.warning && !out.warnings.includes(plan.warning)) out.warnings.push(plan.warning);
    for (const m of seg) mods.push({ ...m, x: Math.round((box.x + m.x) * 2) / 2 });
  }
  // Pencerenin ya da cihazın üstünde kalan ince şerit boş bırakılır; dolabın üstündeki kapama kalır
  const onTop = (s: KitchenModule) => mods.some((m) => m.x < s.x + s.width - 0.5 && m.x + m.width > s.x + 0.5 && Math.abs(m.elevation + m.height - s.elevation) < 0.5);
  for (const m of [...mods, ...strips.filter(onTop)]) {
    out.modules.push(m);
    if (m.kind === 'filler') out.totalFiller += m.width;
  }
}

export function planKitchenWall(wall: Wall, opts: KitchenPlanOptions = DEFAULT_KITCHEN_PLAN): KitchenPlan {
  const out: KitchenPlan = { modules: [], blocked: [], warnings: [], totalFiller: 0 };
  const widths = [...new Set(opts.widths)].filter((w) => w > 0).sort((a, b) => a - b);
  if (widths.length === 0) {
    out.warnings.push('En az bir dolap genişliği seçin.');
    return out;
  }
  const fitOpts = { maxModule: 1e9, topHeight: 0 };
  const rows: Array<'base' | 'wall'> = opts.includeUpper ? ['base', 'wall'] : ['base'];
  for (const row of rows) {
    const spec = KITCHEN_ROWS[row];
    const range = wallRange(wall, spec.depth);
    const height = Math.min(spec.height, range.height - spec.y);
    if (height < 300) {
      if (row === 'wall') out.warnings.push('Tavan alçak: üst dolap sırasına yer yok.');
      continue;
    }
    const fit = fitWall(wall, { x: range.x0, y: spec.y, width: range.x1 - range.x0, height, depth: spec.depth }, fitOpts);
    for (const w of fit.warnings) if (!out.warnings.includes(w)) out.warnings.push(w);
    planRow(row, fit, widths, height, opts.absorbFiller ?? true, out);
  }
  out.modules.sort((a, b) => (a.row === b.row ? a.x - b.x : a.row === 'base' ? -1 : 1));
  out.totalFiller = Math.round(out.totalFiller * 2) / 2;
  return out;
}

/** Önerinin kısa özeti: "300 + 400 + 600 + dolgu 45"; dolapların üstündeki kapama şeritleri ayrıca sayılır. */
export function kitchenRowSummary(modules: KitchenModule[], row: 'base' | 'wall'): string {
  const inRow = modules.filter((m) => m.row === row);
  if (inRow.length === 0) return '';
  const floor = Math.min(...inRow.map((m) => m.elevation));
  const main = inRow.filter((m) => Math.abs(m.elevation - floor) < 0.5);
  const strips = inRow.length - main.length;
  return main
    .map((m) => (m.kind === 'filler' ? `dolgu ${m.width}` : `${m.width}${m.backOffset > 0 ? ' (sığ)' : ''}`))
    .join(' + ') + (strips > 0 ? ` · üstte ${strips} kapama` : '');
}
