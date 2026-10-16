import { describe, it, expect } from 'vitest';
import {
  applyBoxContent, detectBoxContent, boxContentLabel, checkSharing, compositionComputeOptions, compositionBounds,
  validateComposition, boxesOverlap, COMPOSITION_TEMPLATES,
} from '../../core/layout/composition';
import type { BoxContent } from '../../core/layout/composition';
import { createProjectCabinet, DEFAULT_CABINET } from '../../core/engine/cabinet-factory';
import { computeCabinet } from '../../core/engine/compute-cabinet';
import { computeProject } from '../../core/project/project-calc';
import { layoutScene } from '../../core/layout/scene-layout';
import { DEFAULT_SETTINGS } from '../../core/project/default-settings';
import type { ProjectCabinet } from '../../core/models/cabinet';

const box = (id: string, x: number, y: number, w: number, h: number, extra: Partial<ProjectCabinet> = {}): ProjectCabinet => ({
  ...createProjectCabinet({ id, type: 'custom', width: w, code: id.toUpperCase() }),
  height: h, depth: 400, x, elevation: y, groupId: 'g', railWidth: 0, ...extra,
});

describe('kutu içeriği', () => {
  it('her içerik geri tanınır', () => {
    const base = { ...DEFAULT_CABINET, type: 'custom' as const, height: 900 };
    for (const c of ['doors', 'drawers', 'open', 'lift', 'hanger', 'niche'] as BoxContent[]) {
      expect(detectBoxContent(applyBoxContent(base, c))).toBe(c);
      expect(boxContentLabel(c).length).toBeGreaterThan(2);
    }
  });

  it('çekmece sayısı yüksekliğe göre, raf sayısı yüksekliğe göre', () => {
    expect(applyBoxContent({ ...DEFAULT_CABINET, height: 450 }, 'drawers').drawerCount).toBe(3);
    expect(applyBoxContent({ ...DEFAULT_CABINET, height: 2000 }, 'drawers').drawerCount).toBe(6);
    expect(applyBoxContent({ ...DEFAULT_CABINET, height: 2000 }, 'open').shelfCount).toBe(5);
    expect(applyBoxContent({ ...DEFAULT_CABINET, height: 400 }, 'lift').shelfCount).toBe(0);
    expect(applyBoxContent({ ...DEFAULT_CABINET, height: 2000 }, 'hanger').fixedShelfCount).toBe(1);
  });
});

describe('ortak panel kontrolü', () => {
  // Soldaki kitaplık 600×2000, sağında altta TV ünitesi 1800×450, üstte raf 1800×400
  const book = box('a', 0, 0, 600, 2000);
  const tv = box('b', 600, 0, 1800, 450);
  const top = box('c', 600, 1600, 1800, 400);
  const group = [book, tv, top];

  it('soldaki yüksek kutunun dikmesi paylaşılabilir', () => {
    expect(checkSharing(tv, group).left).toEqual({ possible: true, neighbor: 'A' });
    expect(checkSharing(top, group).left.possible).toBe(true);
    expect(checkSharing(book, group).left).toMatchObject({ possible: false, reason: 'Solunda bitişik kutu yok.' });
  });

  it('komşu tüm yüksekliği kaplamıyorsa olmaz', () => {
    const tall = box('d', 600, 0, 600, 2500);
    expect(checkSharing(tall, [book, tall]).left).toMatchObject({ possible: false, neighbor: 'A' });
  });

  it('komşu daha sığsa olmaz', () => {
    const deep = box('d', 600, 0, 600, 500, { depth: 600 });
    expect(checkSharing(deep, [book, deep]).left.reason).toContain('daha sığ');
  });

  it('alt tabla: alttaki kutu tüm genişliği kaplamalı ve kuşaksız olmalı', () => {
    const upper = box('u', 600, 450, 1800, 300);
    expect(checkSharing(upper, [tv, upper]).bottom).toEqual({ possible: true, neighbor: 'B' });
    const wide = box('w', 600, 450, 2000, 300);
    expect(checkSharing(wide, [tv, wide]).bottom.possible).toBe(false);
    const railed = box('r', 600, 0, 1800, 450, { type: 'base', railWidth: 100 });
    expect(checkSharing(upper, [railed, upper]).bottom.reason).toContain('kuşaklı');
    const shallow = box('s', 600, 0, 1800, 450, { depth: 300 });
    expect(checkSharing(upper, [shallow, upper]).bottom.reason).toContain('daha sığ');
    expect(checkSharing(tv, [tv]).bottom.reason).toBe('Altında bitişik kutu yok.');
  });

  it('hesap seçenekleri yalnızca geçerli paylaşımı uygular', () => {
    const t2 = { ...tv, shareLeft: true, shareBottom: true };
    expect(compositionComputeOptions(t2, [book, t2, top])).toEqual({ omitLeftSide: true, omitBottom: false, raised: false });
    expect(compositionComputeOptions({ ...top, shareLeft: true }, group)).toMatchObject({ omitLeftSide: true, raised: true });
    expect(compositionComputeOptions({ ...tv, groupId: null }, group)).toEqual({});
  });
});

describe('ortak panelli hesap', () => {
  const cab = { ...DEFAULT_CABINET, type: 'custom' as const, width: 1800, height: 450, depth: 400, railWidth: 0, plinthHeight: 0 };

  it('ortak sol dikmede sol yan yok, taban ve raf bir kalınlık uzar', () => {
    const plain = computeCabinet(cab);
    const shared = computeCabinet(cab, { omitLeftSide: true });
    expect(shared.parts.some((p) => p.id === 'side-left')).toBe(false);
    const len = (r: typeof plain, id: string) => r.parts.find((p) => p.id === id)!.length;
    expect(len(shared, 'bottom') - len(plain, 'bottom')).toBe(18);
    expect(len(shared, 'top') - len(plain, 'top')).toBe(18);
    expect(shared.innerWidth - plain.innerWidth).toBe(18);
    expect(shared.warnings.some((w) => w.ruleId === 'INFO_SHARED_PANEL')).toBe(true);
    // Kapaklar kutunun kendi genişliğini örter
    expect(shared.doorWidth).toBe(plain.doorWidth);
  });

  it('ortak alt tablada taban yok, iç yükseklik bir kalınlık artar', () => {
    const plain = computeCabinet(cab);
    const shared = computeCabinet(cab, { omitBottom: true });
    expect(shared.parts.some((p) => p.id === 'bottom')).toBe(false);
    expect(shared.innerHeight - plain.innerHeight).toBe(18);
  });

  it('yükseltilmiş kutuya ayak eklenmez', () => {
    expect(computeCabinet(cab).hardware.some((h) => h.key === 'leg')).toBe(true);
    expect(computeCabinet(cab, { raised: true }).hardware.some((h) => h.key === 'leg')).toBe(false);
  });
});

describe('kompozisyon geneli', () => {
  it('sınırlar, çakışma ve askıdaki kutu', () => {
    const a = box('a', 0, 0, 600, 2000);
    const b = box('b', 600, 0, 1800, 450);
    const c = box('c', 600, 1600, 1800, 400);
    expect(compositionBounds([a, b, c])).toEqual({ width: 2400, height: 2000, depth: 400 });
    const w = validateComposition([a, b, c]);
    expect(w.map((x) => x.ruleId)).toEqual(['INFO_BOX_WALL_HUNG']);
    const clash = box('d', 500, 0, 300, 300);
    expect(validateComposition([a, clash]).some((x) => x.ruleId === 'VAL_BOX_OVERLAP')).toBe(true);
    expect(boxesOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 100, y: 0, w: 100, h: 100 })).toBe(false);
  });

  it('proje hesabı ortak paneli kesim listesine yansıtır', () => {
    const a = box('a', 0, 0, 600, 2000);
    const b = box('b', 600, 0, 1800, 450, { shareLeft: true });
    const r = computeProject({ cabinets: [a, b] }, DEFAULT_SETTINGS);
    const sides = r.parts.filter((p) => p.id.startsWith('side-'));
    expect(sides).toHaveLength(3); // A'nın iki yanı + B'nin sağ yanı
  });

  it('sahnede kompozisyon kendi grubunda ve gerçek yükseklikte', () => {
    const a = box('a', 0, 0, 600, 2000);
    const c = box('c', 600, 1600, 1800, 400);
    const l = layoutScene({ spaces: [], cabinets: [a, c], compositions: [{ id: 'g', name: 'TV duvarı' }] });
    expect(l.walls).toEqual([{ id: 'g', name: 'TV duvarı', x: 0, width: 2400, height: 2500 }]);
    expect(l.placements.find((p) => p.cabinetId === 'c')).toMatchObject({ x: 600, elevation: 1600 });
    expect(l.looseStart).toBeNull();
  });

  it('TV şablonunda alt ve üst kutu kitaplıkla dikme paylaşır', () => {
    const tpl = COMPOSITION_TEMPLATES.find((t) => t.id === 'tv-left-bookcase')!;
    const boxes = tpl.boxes.map((b, i) => box(`t${i}`, b.x, b.elevation, b.width, b.height, { depth: b.depth, shareLeft: Boolean(b.shareLeft) }));
    expect(compositionComputeOptions(boxes[1], boxes).omitLeftSide).toBe(true);
    expect(compositionComputeOptions(boxes[2], boxes).omitLeftSide).toBe(true);
  });

  it('şablonlardaki kutular çakışmaz', () => {
    for (const t of COMPOSITION_TEMPLATES) {
      const boxes = t.boxes.map((b, i) => box(`t${i}`, b.x, b.elevation, b.width, b.height));
      expect(validateComposition(boxes).filter((w) => w.severity === 'error')).toHaveLength(0);
    }
  });
});
