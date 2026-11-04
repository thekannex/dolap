import { describe, it, expect } from 'vitest';
import { kitchenCanvas, kitchenMove, kitchenTypeForRect, kitchenYLocked } from '../../core/layout/kitchen-canvas';
import { elevationFor, KITCHEN_LEG_HEIGHT, UPPER_BOTTOM } from '../../core/layout/scene-layout';
import { createProjectCabinet } from '../../core/engine/cabinet-factory';
import type { CabinetType } from '../../core/models/cabinet';

const cab = (id: string, type: CabinetType, width: number, x: number | null = null) =>
  ({ ...createProjectCabinet({ id, type, width, code: id.toUpperCase(), wallId: 'w' }), x });

describe('mutfak çizim alanı', () => {
  it('dolaplar yerleşimdeki x ve yerden yükseklikleriyle çizilir', () => {
    const { boxes, ghosts } = kitchenCanvas([cab('a', 'base', 600), cab('b', 'sink', 800), cab('u', 'wall', 600)], 2600);
    expect(boxes.map((b) => [b.id, b.x, b.elevation])).toEqual([['a', 0, KITCHEN_LEG_HEIGHT], ['b', 600, KITCHEN_LEG_HEIGHT], ['u', 0, UPPER_BOTTOM]]);
    expect(ghosts).toEqual([]);
  });

  it('adedi 2 olan dolabın ikinci kopyası taşınamaz gölge olarak döner', () => {
    const { boxes, ghosts } = kitchenCanvas([{ ...cab('a', 'base', 600), quantity: 2 }], 2600);
    expect(boxes).toHaveLength(1);
    expect(ghosts).toEqual([{ cabinetId: 'a', code: 'A', x: 600, y: KITCHEN_LEG_HEIGHT, w: 600, h: boxes[0].height }]);
  });

  it('taşınan dolap diğerlerini kaydırmaz: konumu boş olanlar bugünkü yerine sabitlenir', () => {
    const cabs = [cab('a', 'base', 600), cab('b', 'base', 600), cab('c', 'base', 600)];
    const patch = kitchenMove(cabs, 'a', { x: 2000, y: 0, w: 600, h: cabs[0].height });
    expect(patch.get('a')).toEqual({ x: 2000 });
    expect(patch.get('b')).toEqual({ x: 600 });
    expect(patch.get('c')).toEqual({ x: 1200 });
  });

  it('boyutlandırma eni ve boyu yazar; alt dolabın yerden yüksekliği değişmez', () => {
    const a = cab('a', 'base', 600, 0);
    const patch = kitchenMove([a], 'a', { x: 0, y: 500, w: 450, h: 800 });
    expect(patch.get('a')).toEqual({ x: 0, width: 450, height: 800 });
    expect(kitchenYLocked(a)).toBe(true);
  });

  it('üst dolap yukarı aşağı taşınır ve bu yükseklik 3B yerleşimde de kullanılır', () => {
    const u = cab('u', 'wall', 600, 0);
    const patch = kitchenMove([u], 'u', { x: 100, y: 1600, w: 600, h: u.height });
    expect(patch.get('u')).toEqual({ x: 100, elevation: 1600 });
    expect(elevationFor({ ...u, elevation: 1600 })).toBe(1600);
    expect(elevationFor(u)).toBe(UPPER_BOTTOM);
  });

  it('çizilen kutunun türü konumuna ve boyuna göre seçilir', () => {
    expect(kitchenTypeForRect({ x: 0, y: 1500, w: 600, h: 700 })).toBe('wall');
    expect(kitchenTypeForRect({ x: 0, y: 0, w: 600, h: 2100 })).toBe('tall');
    expect(kitchenTypeForRect({ x: 0, y: 0, w: 600, h: 720 })).toBe('base');
  });
});
