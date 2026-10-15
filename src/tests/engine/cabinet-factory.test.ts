import { describe, it, expect } from 'vitest';
import { applyTypePreset, createProjectCabinet, nextCabinetCode, normalizeCabinet, rowForType, DEFAULT_CABINET } from '../../core/engine/cabinet-factory';

describe('cabinet-factory', () => {
  it('sıradaki kod', () => {
    expect(nextCabinetCode([])).toBe('M01');
    expect(nextCabinetCode(['M01', 'M07', 'X9'])).toBe('M08');
    expect(nextCabinetCode(['M99'])).toBe('M100');
  });

  it('tip ön ayarları', () => {
    expect(applyTypePreset(DEFAULT_CABINET, 'wall', 400)).toMatchObject({ depth: 330, railWidth: 0, name: 'Üst Dolap 400' });
    expect(applyTypePreset(DEFAULT_CABINET, 'tall', 600)).toMatchObject({ height: 2100, fixedShelfCount: 1 });
    expect(applyTypePreset(DEFAULT_CABINET, 'drawer_base', 600)).toMatchObject({ drawerCount: 3, doorCount: 0 });
    expect(applyTypePreset(DEFAULT_CABINET, 'open_shelf', 600)).toMatchObject({ isOpenShelf: true, hasBackPanel: false });
    expect(applyTypePreset(DEFAULT_CABINET, 'sink', 800)).toMatchObject({ backPanelCutout: true });
    expect(applyTypePreset(DEFAULT_CABINET, 'filler', 50)).toMatchObject({ shelfCount: 0, doorCount: 0 });
  });

  it('tip değişince gövde yapısı korunur, iç düzen sıfırlanır', () => {
    const custom = { ...applyTypePreset(DEFAULT_CABINET, 'drawer_base', 600), bodyThickness: 16, backType: 'nailed' as const };
    const next = applyTypePreset(custom, 'base');
    expect(next).toMatchObject({ bodyThickness: 16, backType: 'nailed', drawerCount: 0, doorCount: 1, width: 600 });
  });

  it('sıra', () => {
    expect(rowForType('wall')).toBe('wall');
    expect(rowForType('open_shelf')).toBe('wall');
    expect(rowForType('tall')).toBe('tall');
    expect(rowForType('sink')).toBe('base');
  });

  it('proje dolabı oluşturma', () => {
    const c = createProjectCabinet({ id: 'a', type: 'wall', width: 450, code: 'M03', wallId: 'w1', x: 900, height: 900 });
    expect(c).toMatchObject({ id: 'a', code: 'M03', wallId: 'w1', x: 900, row: 'wall', height: 900, quantity: 1, notes: '' });
    expect(createProjectCabinet({ id: 'b', type: 'base', width: 600, code: 'M01' })).toMatchObject({ wallId: null, x: null });
  });

  it('eksik alanları tamamlar', () => {
    const c = normalizeCabinet({ id: 'z', type: 'tall', width: 500 });
    expect(c).toMatchObject({ id: 'z', width: 500, row: 'tall', quantity: 1, x: null, bodyThickness: 18 });
  });
});
