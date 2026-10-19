import { describe, it, expect } from 'vitest';
import { layoutScene, elevationFor, UPPER_BOTTOM, KITCHEN_LEG_HEIGHT } from '../../core/layout/scene-layout';
import { createProjectCabinet } from '../../core/engine/cabinet-factory';
import { createProject, createWall } from '../../core/project/project-factory';
import type { CabinetType } from '../../core/models/cabinet';

const cab = (id: string, type: CabinetType, width: number, wallId: string | null) =>
  createProjectCabinet({ id, type, width, code: id.toUpperCase(), wallId });

describe('elevationFor', () => {
  it('mutfak alt dolabı ayak üzerinde, üst dolap 1450de, mobilya yerde', () => {
    expect(elevationFor(cab('a', 'base', 600, null))).toBe(KITCHEN_LEG_HEIGHT);
    expect(elevationFor(cab('b', 'wall', 600, null))).toBe(UPPER_BOTTOM);
    expect(elevationFor(cab('c', 'wardrobe', 1000, null))).toBe(0);
  });

  it('alçak tavanda üst dolap tavana dayanır', () => {
    expect(elevationFor({ ...cab('b', 'wall', 600, null), height: 900 }, 2200)).toBe(1300);
  });

  it('bazası olan mutfak dolabı ayak almaz', () => {
    expect(elevationFor({ ...cab('a', 'base', 600, null), plinthHeight: 100 })).toBe(0);
  });
});

describe('layoutScene', () => {
  const project = () => {
    const p = createProject({ id: 'p', spaceId: 's', wallId: 'w1', name: 'A', customerName: '', now: '2026-01-01T00:00:00.000Z' });
    p.spaces[0].walls.push(createWall('w2', 's', 'B Duvarı'));
    p.spaces[0].walls.push(createWall('w3', 's', 'C Duvarı'));
    p.cabinets = [
      cab('a', 'base', 600, 'w1'),
      cab('b', 'wall', 600, 'w1'),
      cab('c', 'base', 400, 'w2'),
      cab('d', 'wardrobe', 1000, null),
    ];
    return p;
  };

  it('duvarlar yan yana, boş duvar atlanır, atanmamış dolaplar en sağda', () => {
    const l = layoutScene(project());
    expect(l.walls.map((w) => w.id)).toEqual(['w1', 'w2']);
    expect(l.walls[0]).toMatchObject({ x: 0, width: 2995 });
    expect(l.walls[1].x).toBe(2995 + 800);
    const x = Object.fromEntries(l.placements.map((p) => [p.cabinetId, p.x]));
    expect(x.a).toBe(0);
    expect(x.b).toBe(0);
    expect(x.c).toBe(l.walls[1].x);
    expect(l.looseStart).toBe(l.walls[1].x + 2995 + 800);
    expect(x.d).toBe(l.looseStart);
  });

  it('yükseklik, tezgâh ve sahne boyutu', () => {
    const l = layoutScene(project());
    const a = l.placements.find((p) => p.cabinetId === 'a')!;
    expect(a).toMatchObject({ elevation: 100, countertop: true });
    expect(l.placements.find((p) => p.cabinetId === 'b')!.countertop).toBe(false);
    expect(l.height).toBe(2500);
    expect(l.depth).toBe(600); // 560 + 40 tezgâh taşması
    expect(l.width).toBe(l.looseStart! + 1000);
  });

  it('adet kadar kopya, aralıklı', () => {
    const p = project();
    p.cabinets = [{ ...cab('d', 'shoe_cabinet', 800, null), quantity: 2 }];
    const l = layoutScene(p);
    expect(l.placements.map((x) => x.x)).toEqual([0, 950]);
    expect(l.walls).toHaveLength(0);
  });

  it('silinmiş duvara bağlı kalan dolap atanmamış sayılır', () => {
    const p = project();
    p.cabinets = [cab('z', 'base', 600, 'yok')];
    expect(layoutScene(p).looseStart).toBe(0);
  });
});

describe('layoutScene — duvara oturtulmuş dolap', () => {
  it('kutular kendi duvarında, kolon önündeki kutunun arkası kolona dayanır', () => {
    const p = createProject({ id: 'p', spaceId: 's', wallId: 'w1', name: 'A', customerName: '', now: '2026-01-01T00:00:00.000Z' });
    p.compositions = [{ id: 'g', name: 'Gardırop', wallId: 'w1' }];
    const a = { ...cab('a', 'custom', 1000, null), groupId: 'g', x: 0, elevation: 0, depth: 600 };
    const b = { ...cab('b', 'custom', 400, null), groupId: 'g', x: 1000, elevation: 0, depth: 300, backOffset: 300 };
    p.cabinets = [a, b];
    const l = layoutScene(p);
    expect(l.walls).toHaveLength(1);
    expect(l.walls[0].id).toBe('w1');
    expect(l.placements.find((x) => x.cabinetId === 'b')).toMatchObject({ x: 1000, back: 300, depth: 300 });
    expect(l.depth).toBe(600);
  });
});
