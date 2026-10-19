import { describe, it, expect } from 'vitest';
import { fitWall, protrusionOf, wallHeightOf, defaultShape } from '../../core/layout/wall-fit';
import type { Obstacle, Wall } from '../../core/models/project';

const ob = (type: string, x: number, y: number, width: number, height: number, depth: number): Obstacle =>
  ({ id: `${type}-${x}-${y}`, wallId: 'w', type, x, y, width, height, depth });
const wall = (obstacles: Obstacle[] = [], L = 3000, H = 2600): Pick<Wall, 'effectiveWidth' | 'heightLeft' | 'heightCenter' | 'heightRight' | 'obstacles'> =>
  ({ effectiveWidth: L, heightLeft: H, heightCenter: H, heightRight: H, obstacles });
const full = { x: 0, y: 0, width: 3000, height: 2600, depth: 600 };
const cabs = (r: ReturnType<typeof fitWall>) => r.boxes.filter((b) => b.kind === 'cabinet');

describe('duvar şekli', () => {
  it('engel türüne göre taşma', () => {
    expect(protrusionOf({ type: 'column', depth: 300 })).toBe(300);
    expect(protrusionOf({ type: 'window', depth: 0 })).toBe(Infinity);
    expect(protrusionOf({ type: 'recess', depth: 200 })).toBe(0);
    expect(protrusionOf({ type: 'outlet', depth: 30 })).toBe(0);
    expect(wallHeightOf({ heightLeft: 2610, heightCenter: 2600, heightRight: 2590 })).toBe(2590);
    expect(defaultShape('beam', { effectiveWidth: 3000, heightLeft: 2600, heightCenter: 2600, heightRight: 2600 })).toMatchObject({ x: 0, y: 2300, width: 3000 });
  });
});

describe('duvara oturan dolap', () => {
  it('düz duvar: alan eşit modüllere bölünür', () => {
    const r = fitWall(wall(), full);
    expect(r.boxes.map((b) => [b.x, b.width, b.height, b.depth, b.backOffset])).toEqual([
      [0, 1000, 2600, 600, 0], [1000, 1000, 2600, 600, 0], [2000, 1000, 2600, 600, 0],
    ]);
  });

  it('kolonun önüne sığ dolap gelir, önler hizalı kalır', () => {
    const r = fitWall(wall([ob('column', 1300, 0, 400, 2600, 300)]), full);
    const col = r.boxes.find((b) => b.x === 1300)!;
    expect(col).toMatchObject({ kind: 'cabinet', width: 400, depth: 300, backOffset: 300 });
    expect(cabs(r)).toHaveLength(5); // 650+650 | 400 | 650+650
    expect(r.boxes.every((b) => b.backOffset + b.depth === 600)).toBe(true);
  });

  it('kirişin altına tam derin, önüne sığ üst kutu', () => {
    const r = fitWall(wall([ob('beam', 0, 2300, 3000, 300, 250)]), full);
    const lower = r.boxes.filter((b) => b.elevation === 0);
    const upper = r.boxes.filter((b) => b.elevation === 2300);
    expect(lower.map((b) => [b.width, b.height, b.depth])).toEqual([[1000, 2300, 600], [1000, 2300, 600], [1000, 2300, 600]]);
    expect(upper.map((b) => [b.height, b.depth, b.backOffset])).toEqual([[300, 350, 250], [300, 350, 250], [300, 350, 250]]);
  });

  it('dolaptan derin kiriş: altında biter, kiriş bölgesi boş kalır', () => {
    const r = fitWall(wall([ob('beam', 0, 2300, 3000, 300, 700)]), full);
    expect(r.boxes.every((b) => b.elevation + b.height <= 2300)).toBe(true);
    expect(r.blocked).toEqual([{ x: 0, y: 2300, width: 3000, height: 300 }]);
  });

  it('çok derin çıkıntının önüne dolgu paneli', () => {
    const r = fitWall(wall([ob('protrusion', 2600, 0, 400, 2600, 500)]), full);
    const f = r.boxes.find((b) => b.x === 2600)!;
    expect(f).toMatchObject({ kind: 'filler', width: 400, depth: 18, backOffset: 582 });
  });

  it('ortadaki ince boru komşu kutuya katılır, o kutu sığlaşır', () => {
    const r = fitWall(wall([ob('pipe', 1000, 0, 60, 2600, 60)]), full);
    expect(r.boxes.map((b) => [b.x, b.width, b.depth])).toEqual([[0, 530, 540], [530, 530, 540], [1060, 970, 600], [2030, 970, 600]]);
  });

  it('köşedeki dar şerit dolgu olur', () => {
    const r = fitWall(wall([ob('column', 80, 0, 400, 2600, 300)]), full);
    expect(r.boxes[0]).toMatchObject({ kind: 'filler', x: 0, width: 80, depth: 18 });
  });

  it('pencerenin önü boş, altı ve üstü dolap', () => {
    const r = fitWall(wall([ob('window', 1000, 900, 1000, 1200, 0)]), full);
    expect(r.blocked).toEqual([{ x: 1000, y: 900, width: 1000, height: 1200 }]);
    const mid = r.boxes.filter((b) => b.x >= 1000 && b.x < 2000);
    expect(mid.map((b) => [b.elevation, b.height])).toEqual([[0, 900], [2100, 500]]);
  });

  it('üst kutu yüksekliği verilince asma kutular ayrılır', () => {
    const r = fitWall(wall(), full, { topHeight: 500 });
    expect(r.boxes.map((b) => [b.elevation, b.height])).toEqual([[0, 2100], [2100, 500], [0, 2100], [2100, 500], [0, 2100], [2100, 500]]);
  });

  it('duvar dışına taşan alan kırpılır', () => {
    const r = fitWall(wall(), { x: -100, y: 0, width: 3300, height: 2800, depth: 600 });
    expect(r.region).toMatchObject({ x: 0, width: 3000, height: 2600 });
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
