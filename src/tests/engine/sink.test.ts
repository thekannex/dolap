import { describe, it, expect } from 'vitest';
import {
  computeSinkLayout, createSinkFromPreset, autoSinkOffset, checkSinkDirection, sinkDirectionLabel, SINK_PRESETS,
} from '../../core/engine/sink';
import { computeCabinet } from '../../core/engine/compute-cabinet';
import { applyTypePreset, createProjectCabinet, DEFAULT_CABINET } from '../../core/engine/cabinet-factory';
import { findSinkNeighbors } from '../../core/layout/sink-neighbors';
import { computeProject } from '../../core/project/project-calc';
import { DEFAULT_SETTINGS } from '../../core/project/default-settings';
import { createWall } from '../../core/project/project-factory';
import type { SinkSpec } from '../../core/models/cabinet';

const cab = { code: 'M01', width: 800, bodyThickness: 18 };

describe('computeSinkLayout', () => {
  it('86×50 damlalıklı evye: çanak dolabın ortasında, damlalık sağa taşar', () => {
    const s = createSinkFromPreset('inset-86x50');
    const L = computeSinkLayout(s, cab, 600);
    // çanak 400, kenar 25: evye solu = 400 - (25 + 200) = 175
    expect(L.outer).toEqual({ x: 175, y: 60, w: 860, h: 500 });
    expect(L.cutout).toEqual({ x: 185, y: 70, w: 840, h: 480 });
    expect(L.bowls[0].x + L.bowls[0].w / 2).toBe(400);
    expect(L.drainer!.x).toBeGreaterThan(L.bowls[0].x + L.bowls[0].w);
    expect(L.overhangRight).toBe(235);
    expect(L.overhangLeft).toBe(0);
    expect(L.faucet).toEqual({ x: 400, y: 525, diameter: 35, onSink: true });
    expect(L.warnings.some((w) => w.ruleId === 'INFO_SINK_OVERHANG')).toBe(true);
    expect(L.warnings.some((w) => w.ruleId === 'INFO_SINK_TEMPLATE')).toBe(true);
  });

  it('yön değişince evye aynalanır, çanak yine ortada kalır', () => {
    const s: SinkSpec = { ...createSinkFromPreset('inset-86x50'), drainer: 'left' };
    const L = computeSinkLayout(s, cab, 600);
    expect(L.bowls[0].x + L.bowls[0].w / 2).toBe(400);
    expect(L.drainer!.x + L.drainer!.w).toBeLessThan(L.bowls[0].x);
    expect(L.overhangLeft).toBe(235);
    expect(L.overhangRight).toBe(0);
  });

  it('1,5 gözde küçük göz damlalık tarafında, batarya büyük gözde', () => {
    const right = computeSinkLayout(createSinkFromPreset('inset-116x50-15'), { ...cab, width: 900 }, 600);
    expect(right.bowls[0].w).toBeGreaterThan(right.bowls[1].w);
    expect(right.bowls[1].x).toBeGreaterThan(right.bowls[0].x);
    expect(right.faucet!.x).toBe(right.bowls[0].x + right.bowls[0].w / 2);
    const left = computeSinkLayout({ ...createSinkFromPreset('inset-116x50-15'), drainer: 'left' }, { ...cab, width: 900 }, 600);
    expect(left.bowls[1].x).toBeLessThan(left.bowls[0].x);
  });

  it('tezgâh altı evye: kesim çanak ağzı, batarya tezgâhta', () => {
    const L = computeSinkLayout(createSinkFromPreset('under-50x40'), { ...cab, width: 600 }, 600);
    expect(L.drainer).toBeNull();
    expect(L.cutout.w).toBe(500);
    expect(L.faucet).toMatchObject({ onSink: false, y: 60 + 440 + 45 });
  });

  it('elle konum ve batarya yok', () => {
    const L = computeSinkLayout({ ...createSinkFromPreset('inset-50x50'), offsetX: 50, faucet: 'none' }, cab, 600);
    expect(L.outer.x).toBe(50);
    expect(L.faucet).toBeNull();
  });

  it('çanak dar dolaba sığmazsa en dar dolap ölçüsünü söyler', () => {
    const L = computeSinkLayout(createSinkFromPreset('inset-80x50-2'), { ...cab, width: 600 }, 600);
    const w = L.warnings.find((x) => x.ruleId === 'VAL_SINK_BOWL_FIT');
    expect(w?.severity).toBe('error');
    expect(w?.suggestion).toContain('756');
    expect(L.minCabinetWidth).toBe(756);
  });

  it('elle kaydırmayla çanak taşarsa otomatiğe dönmeyi önerir', () => {
    const L = computeSinkLayout({ ...createSinkFromPreset('inset-50x50'), offsetX: 500 }, cab, 600);
    expect(L.warnings.find((x) => x.ruleId === 'VAL_SINK_BOWL_FIT')?.suggestion).toContain('Otomatik');
  });

  it('derinlik, ön pay ve batarya arka payı kontrolleri', () => {
    const deep = computeSinkLayout({ ...createSinkFromPreset('inset-50x50'), frontGap: 100 }, cab, 600);
    expect(deep.warnings.some((w) => w.ruleId === 'VAL_SINK_DEPTH')).toBe(true);
    const front = computeSinkLayout({ ...createSinkFromPreset('inset-50x50'), frontGap: 10 }, cab, 600);
    expect(front.warnings.some((w) => w.ruleId === 'VAL_SINK_FRONT')).toBe(true);
    const tap = computeSinkLayout({ ...createSinkFromPreset('inset-50x50'), faucet: 'countertop', faucetBackGap: 20 }, cab, 600);
    expect(tap.warnings.some((w) => w.ruleId === 'VAL_FAUCET_BACK')).toBe(true);
  });

  it('özel evyede şablon notu yok; otomatik konum hesabı', () => {
    const custom = { ...createSinkFromPreset('inset-50x50'), presetId: 'custom' };
    expect(computeSinkLayout(custom, cab, 600).warnings.some((w) => w.ruleId === 'INFO_SINK_TEMPLATE')).toBe(false);
    expect(autoSinkOffset(createSinkFromPreset('inset-50x50'), 600)).toBe(50);
    expect(createSinkFromPreset('yok').presetId).toBe('inset-86x50');
    expect(SINK_PRESETS.length).toBeGreaterThan(5);
  });

  it('yön adları', () => {
    expect(sinkDirectionLabel('right')).toBe('Çanak solda, damlalık sağda');
    expect(sinkDirectionLabel('left')).toBe('Çanak sağda, damlalık solda');
    expect(sinkDirectionLabel('none')).toBe('Damlalıksız');
  });
});

describe('evye yönü kontrolü', () => {
  const spec = createSinkFromPreset('inset-86x50');
  const L = computeSinkLayout(spec, cab, 600);

  it('taşan tarafta alt dolap varsa sorun yok', () => {
    expect(checkSinkDirection(spec, L, { left: 'wall_end', right: 'cabinet' }, 'M01')).toBeNull();
  });

  it('taşan taraf duvar ucuysa yönü çevirmeyi önerir', () => {
    const w = checkSinkDirection(spec, L, { left: 'cabinet', right: 'wall_end' }, 'M01');
    expect(w?.ruleId).toBe('VAL_SINK_DIRECTION');
    expect(w?.message).toContain('duvar ucu');
    expect(w?.suggestion).toContain('Çanak sağda, damlalık solda');
  });

  it('iki taraf da kapalıysa başka çözüm önerir', () => {
    const w = checkSinkDirection(spec, L, { left: 'blocked', right: 'blocked' }, 'M01');
    expect(w?.message).toContain('boy dolap');
    expect(w?.suggestion).toContain('kaydırın');
  });
});

describe('komşular ve proje tezgâh işlemleri', () => {
  const wall = createWall('w', 's', 'A Duvarı');
  const sinkCab = createProjectCabinet({ id: 's1', type: 'sink', width: 800, code: 'M02', wallId: 'w' });

  it('komşu tipleri', () => {
    const list = [
      createProjectCabinet({ id: 'a', type: 'tall', width: 600, code: 'M01', wallId: 'w' }),
      sinkCab,
      createProjectCabinet({ id: 'b', type: 'base', width: 600, code: 'M03', wallId: 'w' }),
    ];
    expect(findSinkNeighbors('s1', list, wall)).toEqual({ left: 'blocked', right: 'cabinet' });
    expect(findSinkNeighbors('s1', [sinkCab], wall)).toEqual({ left: 'wall_end', right: 'blocked' });
    expect(findSinkNeighbors('yok', [sinkCab], wall)).toBeNull();
    const atEnd = { ...sinkCab, x: wall.effectiveWidth - 800 };
    expect(findSinkNeighbors('s1', [atEnd], wall)?.right).toBe('wall_end');
  });

  it('evye dolabı varsayılan evyeyle gelir ve arkalık kesiği konumlanır', () => {
    const c = computeCabinet(applyTypePreset(DEFAULT_CABINET, 'sink', 800));
    expect(c.sink?.cutout.w).toBe(840);
    expect(c.warnings.find((w) => w.ruleId === 'INFO_SINK_CUTOUT')?.message).toContain('382');
    expect(applyTypePreset(DEFAULT_CABINET, 'sink', 600).sink?.presetId).toBe('inset-50x50');
  });

  it('üst dolapta evye hesaplanmaz', () => {
    const wallCab = { ...applyTypePreset(DEFAULT_CABINET, 'wall', 800), sink: createSinkFromPreset() };
    expect(computeCabinet(wallCab).sink).toBeNull();
  });

  it('proje: duvar konumu ve yön hatası', () => {
    const left = createProjectCabinet({ id: 'b', type: 'base', width: 600, code: 'M01', wallId: 'w' });
    const r = computeProject({ cabinets: [left, sinkCab], spaces: [{ id: 's', name: 'Mutfak', type: 'kitchen', ceilingHeight: 2500, walls: [wall] }] }, DEFAULT_SETTINGS);
    expect(r.countertopOps).toHaveLength(1);
    expect(r.countertopOps[0]).toMatchObject({ cabinetCode: 'M02', cabinetX: 600, sinkName: 'Tek göz damlalıklı 86×50' });
    // damlalık sağda ama sağda dolap yok → hata
    expect(r.warnings.some((w) => w.ruleId === 'VAL_SINK_DIRECTION' && w.cabinetCode === 'M02')).toBe(true);

    const flipped = { ...sinkCab, sink: { ...sinkCab.sink!, drainer: 'left' as const } };
    const ok = computeProject({ cabinets: [left, flipped], spaces: [{ id: 's', name: 'Mutfak', type: 'kitchen', ceilingHeight: 2500, walls: [wall] }] }, DEFAULT_SETTINGS);
    expect(ok.warnings.some((w) => w.ruleId === 'VAL_SINK_DIRECTION')).toBe(false);
  });

  it('duvara atanmamış evye için konum yok, özel evye adı', () => {
    const loose = { ...sinkCab, wallId: null, sink: { ...sinkCab.sink!, presetId: 'custom' } };
    const r = computeProject({ cabinets: [loose] }, DEFAULT_SETTINGS);
    expect(r.countertopOps[0]).toMatchObject({ cabinetX: null, sinkName: 'Özel evye 860×500' });
  });
});
