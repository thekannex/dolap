import { describe, it, expect } from 'vitest';
import { analyzeWall, angleFromOffset, angleSlope, interpolate, surveyFromLegacy, legacyFieldsFromSurvey, wallSignature, wallRange } from '../../core/layout/wall-survey';
import { createWall } from '../../core/project/project-factory';
import type { WallSurvey } from '../../core/models/project';

const square = (patch: Partial<WallSurvey> = {}): WallSurvey => ({
  length: 3000, leftLean: 0, rightLean: 0, leftAngle: 90, rightAngle: 90,
  ceiling: [{ x: 0, v: 2600 }, { x: 3000, v: 2600 }], floor: [], ...patch,
});

describe('duvar ölçüsü: yardımcılar', () => {
  it('doğrusal ara değer, uçlarda sabit', () => {
    const p = [{ x: 0, v: 0 }, { x: 1000, v: 10 }];
    expect(interpolate(p, 500)).toBe(5);
    expect(interpolate(p, -100)).toBe(0);
    expect(interpolate(p, 2000)).toBe(10);
    expect(interpolate([], 50, 7)).toBe(7);
  });

  it('açı: sapmadan dereceye ve eğime', () => {
    expect(angleFromOffset(87.5, 1000)).toBe(85);
    expect(angleFromOffset(0, 1000)).toBe(90);
    expect(angleSlope(90)).toBe(0);
    expect(angleSlope(85)).toBeCloseTo(0.0875, 3);
  });
});

describe('duvar ölçüsü: analiz', () => {
  it('dik duvar: tüm boy kullanılır, dolgu yok', () => {
    const a = analyzeWall(square(), { depth: 600, installGap: 5 });
    expect(a).toMatchObject({ x0: 0, x1: 3000, width: 2995, height: 2600, baseLevel: 0 });
    expect(a.fillers).toEqual([]);
  });

  it('yan duvar odaya doğru kapanıyor (85°): dolap içeri kayar, arkada kama boşluk', () => {
    const a = analyzeWall(square({ leftAngle: 85 }), { depth: 600 });
    expect(a.x0).toBeCloseTo(52.5, 0);
    expect(a.fillers[0]).toMatchObject({ side: 'left', bottom: 0, top: 0 });
    expect(a.fillers[0].back).toBeCloseTo(52.5, 0);
  });

  it('yan duvar açılıyor (95°): önde kama dolgu', () => {
    const a = analyzeWall(square({ rightAngle: 95 }), { depth: 600 });
    expect(a.x1).toBe(3000);
    expect(a.fillers[0].side).toBe('right');
    expect(a.fillers[0].bottom).toBeCloseTo(52.5, 0);
    expect(a.fillers[0].back).toBe(0);
  });

  it('şakulsüz yan duvar: altta geniş, üstte dar dolgu', () => {
    const a = analyzeWall(square({ leftLean: 12 }), { depth: 600 });
    expect(a.x0).toBe(12);
    expect(a.fillers[0]).toMatchObject({ bottom: 12, top: 0, height: 2600 });
  });

  it('eğimli zemin: taban en yüksek noktada, baza ve ayak farkı alır', () => {
    const a = analyzeWall(square({ floor: [{ x: 0, v: 0 }, { x: 3000, v: 15 }] }), { depth: 600, plinth: 100, legs: 100 });
    expect(a.baseLevel).toBe(15);
    expect(a.height).toBe(2585); // 2600 (sol tavan) - 15
    expect(a.floorTable[0]).toMatchObject({ x: 0, extra: 15, plinth: 115, legs: 115 });
    expect(a.floorTable[a.floorTable.length - 1]).toMatchObject({ x: 3000, extra: 0, plinth: 100 });
    expect(a.ceilingTable.map((r) => r.gap)).toEqual([0, 15]);
  });

  it('basık tavan: dolap en alçak yere göre, kapama profili', () => {
    const a = analyzeWall(square({ ceiling: [{ x: 0, v: 2600 }, { x: 1500, v: 2550 }, { x: 3000, v: 2600 }] }), { depth: 600 });
    expect(a.height).toBe(2550);
    expect(a.ceilingTable.map((r) => [r.x, r.gap])).toEqual([[0, 50], [1500, 0], [3000, 50]]);
    const lower = analyzeWall(square(), { depth: 600, cabinetTop: 2400 });
    expect(lower.ceilingTable.map((r) => r.gap)).toEqual([200, 200]);
  });

  it('sığmayan duvarda uyarı', () => {
    expect(analyzeWall(square({ length: 100, leftAngle: 60, rightAngle: 60 }), { depth: 600 }).warnings.length).toBeGreaterThan(0);
  });
});

describe('duvar ölçüsü: eski alanlar ve iz', () => {
  it('eski ölçüden başlangıç ve geri dönüşüm', () => {
    const w = createWall('w', 's', 'A');
    const s = surveyFromLegacy({ ...w, widthLeft: 3000, widthRight: 2990 });
    expect(s).toMatchObject({ length: 3000, leftLean: 5, rightLean: 5, leftAngle: 90 });
    const f = legacyFieldsFromSurvey(s, 5);
    expect(f).toMatchObject({ widthLeft: 3000, widthRight: 2990, heightLeft: 2500, effectiveWidth: 2985 });
  });

  it('ayrıntılı ölçülü duvarın aralığı', () => {
    const w = { ...createWall('w', 's', 'A'), survey: square({ leftLean: 10 }), installGap: 0 };
    expect(wallRange(w)).toMatchObject({ length: 3000, x0: 10, x1: 3000, height: 2600 });
    expect(wallRange(createWall('w', 's', 'A'))).toMatchObject({ x0: 0, x1: 2995, height: 2500 });
  });

  it('engel ya da ölçü değişince iz değişir', () => {
    const w = createWall('w', 's', 'A');
    const a = wallSignature(w);
    expect(wallSignature({ ...w })).toBe(a);
    expect(wallSignature({ ...w, obstacles: [{ id: 'o', wallId: 'w', type: 'column', x: 0, y: 0, width: 400, height: 2500, depth: 300 }] })).not.toBe(a);
    expect(wallSignature({ ...w, survey: square() })).not.toBe(a);
  });
});

describe('duvar değişikliği denetimi', () => {
  it('öneriden sonra eklenen kolonu fark eder, çakışan dolabı listeler', async () => {
    const { kitchenWallStatus, fittedChanged } = await import('../../core/layout/wall-changes');
    const { createProjectCabinet } = await import('../../core/engine/cabinet-factory');
    const w = { ...createWall('w', 's', 'A'), planSig: '' };
    w.planSig = wallSignature(w);
    const cabs = [0, 600, 1200].map((x, i) => createProjectCabinet({ id: `c${i}`, type: 'base', width: 600, code: `M0${i + 1}`, wallId: 'w', x }));
    expect(kitchenWallStatus(w, cabs)).toEqual({ changed: false, conflicts: [] });
    const later = { ...w, obstacles: [{ id: 'k', wallId: 'w', type: 'column', x: 700, y: 0, width: 300, height: 2500, depth: 250 }] };
    const st = kitchenWallStatus(later, cabs);
    expect(st.changed).toBe(true);
    expect(st.conflicts.map((c) => c.code)).toEqual(['M02']);
    const comp = { id: 'g', name: 'Dolap', wallId: 'w', fit: { region: { x: 0, y: 0, width: 1000, height: 2000, depth: 600 }, topHeight: 0, maxModule: 1000, wallSig: wallSignature(w) } };
    expect(fittedChanged(comp, w)).toBe(false);
    expect(fittedChanged(comp, later)).toBe(true);
  });

  it('yan duvar içeri girince dolap alanı içeriden başlar', async () => {
    const { fitWall } = await import('../../core/layout/wall-fit');
    const w = { ...createWall('w', 's', 'A'), installGap: 0, survey: square({ leftLean: 20 }) };
    const r = fitWall(w, { x: 0, y: 0, width: 3000, height: 2600, depth: 600 });
    expect(r.region.x).toBe(20);
    expect(r.boxes[0].x).toBe(20);
  });
});
