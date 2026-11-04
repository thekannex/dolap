import { describe, it, expect } from 'vitest';
import { planKitchenWall, kitchenRowSummary, KITCHEN_ROWS } from '../../core/layout/kitchen-fit';
import { createWall } from '../../core/project/project-factory';
import type { Obstacle, Wall } from '../../core/models/project';

const ob = (type: string, x: number, y: number, width: number, height: number, depth = 0): Obstacle =>
  ({ id: `${type}-${x}-${y}`, wallId: 'w', type, x, y, width, height, depth });
const wall = (obstacles: Obstacle[] = []): Wall => ({ ...createWall('w', 's', 'A Duvarı'), installGap: 0, effectiveWidth: 3000, obstacles });
const row = (p: ReturnType<typeof planKitchenWall>, r: 'base' | 'wall') => p.modules.filter((m) => m.row === r);

describe('duvar şekline uyan mutfak önerisi', () => {
  it('düz duvar: alt ve üst sıra standart genişliklere bölünür', () => {
    const p = planKitchenWall(wall(), { widths: [600], includeUpper: true });
    expect(row(p, 'base').map((m) => [m.x, m.width, m.kind])).toEqual([[0, 600, 'cabinet'], [600, 600, 'cabinet'], [1200, 600, 'cabinet'], [1800, 600, 'cabinet'], [2400, 600, 'cabinet']]);
    expect(row(p, 'base')[0]).toMatchObject({ elevation: KITCHEN_ROWS.base.y, height: 720, depth: 560, backOffset: 0 });
    expect(row(p, 'wall')).toHaveLength(5);
    expect(row(p, 'wall')[0]).toMatchObject({ elevation: KITCHEN_ROWS.wall.y, height: 720, depth: 330 });
  });

  it('kolonun önüne sığ alt dolap, üstte dolgu gelir; dolap kolonun içinden geçmez', () => {
    const p = planKitchenWall(wall([ob('column', 1300, 0, 400, 2500, 300)]), { widths: [300, 400, 600], includeUpper: true });
    const shallow = row(p, 'base').find((m) => m.x === 1300)!;
    expect(shallow).toMatchObject({ kind: 'cabinet', width: 400, depth: 260, backOffset: 300 });
    // Kolonun önünde tam derin dolap yok
    expect(row(p, 'base').filter((m) => m.x < 1700 && m.x + m.width > 1300 && m.backOffset < 300)).toEqual([]);
    const upperAtColumn = row(p, 'wall').filter((m) => m.x < 1700 && m.x + m.width > 1300);
    expect(upperAtColumn.every((m) => m.kind === 'filler')).toBe(true);
    expect(kitchenRowSummary(p.modules, 'base')).toContain('400 (sığ)');
  });

  it('pencerenin önüne üst dolap konmaz, alt sıra etkilenmez', () => {
    const p = planKitchenWall(wall([ob('window', 1000, 1000, 1000, 1200)]), { widths: [500], includeUpper: true });
    expect(row(p, 'wall').some((m) => m.x < 2000 && m.x + m.width > 1000)).toBe(false);
    expect(p.blocked).toContainEqual({ row: 'wall', x: 1000, width: 1000 });
    expect(row(p, 'base').reduce((s, m) => s + m.width, 0)).toBe(3000);
  });

  it('pencerenin üstünde kalan ince şeride kapama konmaz, dolabın üstündekine konur', () => {
    const p = planKitchenWall(wall([ob('window', 0, 900, 1000, 1200), ob('beam', 0, 2050, 3000, 450, 250)]), { widths: [500], includeUpper: true });
    expect(row(p, 'wall').some((m) => m.x < 1000)).toBe(false);
    expect(row(p, 'wall').some((m) => m.kind === 'filler' && m.elevation === 2050 && m.x >= 1000)).toBe(true);
    expect(kitchenRowSummary(p.modules, 'wall')).toMatch(/üstte \d+ kapama/);
  });

  it('kirişin altında üst dolap kısalır, kirişin önüne dolgu gelir', () => {
    const p = planKitchenWall(wall([ob('beam', 0, 2100, 3000, 400, 250)]), { widths: [600], includeUpper: true });
    const cabinets = row(p, 'wall').filter((m) => m.kind === 'cabinet');
    expect(cabinets.length).toBeGreaterThan(0);
    expect(cabinets.every((m) => m.height === 650 && m.elevation === 1450)).toBe(true);
    expect(row(p, 'wall').some((m) => m.kind === 'filler' && m.elevation === 2100)).toBe(true);
  });

  it('cihaz boşluğu alt sırada boş kalır', () => {
    const p = planKitchenWall(wall([ob('appliance', 0, 0, 600, 820)]), { widths: [600], includeUpper: false });
    expect(row(p, 'base').some((m) => m.x < 600)).toBe(false);
    expect(row(p, 'wall')).toEqual([]);
  });

  it('genişlik seçilmezse uyarır', () => {
    expect(planKitchenWall(wall(), { widths: [], includeUpper: true }).warnings[0]).toMatch(/genişliği/);
  });
});
