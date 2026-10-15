import { describe, it, expect } from 'vitest';
import { computeProject } from '../../core/project/project-calc';
import { DEFAULT_SETTINGS, mergeSettings } from '../../core/project/default-settings';
import { createProject, createWall, effectiveWallWidth, normalizeProject } from '../../core/project/project-factory';
import { createProjectCabinet } from '../../core/engine/cabinet-factory';
import type { AppSettings } from '../../core/models/settings';

const priced: AppSettings = {
  ...DEFAULT_SETTINGS,
  materials: {
    body: { name: 'Suntalam', pricePerSheet: 2000 },
    front: { name: 'MDF', pricePerSheet: 4000 },
    back: { name: 'Arkalık', pricePerSheet: 1000 },
  },
  bandPrices: { '0.8': 10, '1': 20, '2': 30 },
  hardwarePrices: { hinge: 50, rail: 200, metal_drawer: 800, confirmat: 1, shelf_pin: 1, leg: 20, handle: 40 },
  laborPerCabinet: 1000,
  profitPercent: 20,
  vatPercent: 20,
};

const cabinets = () => [
  createProjectCabinet({ id: 'a', type: 'base', width: 600, code: 'M01' }),
  createProjectCabinet({ id: 'b', type: 'drawer_base', width: 600, code: 'M02' }),
  createProjectCabinet({ id: 'c', type: 'wall', width: 800, code: 'M03' }),
  createProjectCabinet({ id: 'd', type: 'filler', width: 50, code: 'M04' }),
];

describe('computeProject', () => {
  it('levhalara göre gruplar ve sıralar (gövde, ön, arka)', () => {
    const r = computeProject({ cabinets: cabinets() }, priced);
    expect(r.groups.map((g) => g.key)).toEqual(['body-18', 'front-18', 'back-8']);
    expect(r.groups[0].label).toBe('Suntalam 18mm');
    expect(r.totals.cabinetCount).toBe(3); // dolgu sayılmaz
    expect(r.totals.sheetCount).toBe(r.groups.reduce((s, g) => s + g.optimization.totalSheets, 0));
  });

  it('her parça bir yere yerleşir', () => {
    const r = computeProject({ cabinets: cabinets() }, priced);
    for (const g of r.groups) {
      const placed = g.optimization.layouts.reduce((s, l) => s + l.placements.length, 0);
      expect(placed).toBe(g.pieceCount);
      expect(g.optimization.unplacedPieces).toHaveLength(0);
    }
  });

  it('dolap adedi parça ve hırdavatı çarpar', () => {
    const one = computeProject({ cabinets: [createProjectCabinet({ id: 'a', type: 'base', width: 600, code: 'M01' })] }, priced);
    const two = computeProject({ cabinets: [{ ...createProjectCabinet({ id: 'a', type: 'base', width: 600, code: 'M01' }), quantity: 2 }] }, priced);
    expect(two.totals.partCount).toBe(one.totals.partCount * 2);
    expect(two.hardware.find((h) => h.key === 'hinge')!.quantity).toBe(one.hardware.find((h) => h.key === 'hinge')!.quantity * 2);
    expect(two.totals.cabinetCount).toBe(2);
  });

  it('aynı hırdavat dolaplar arasında birleşir', () => {
    const r = computeProject({ cabinets: [
      createProjectCabinet({ id: 'a', type: 'base', width: 600, code: 'M01' }),
      createProjectCabinet({ id: 'b', type: 'base', width: 400, code: 'M02' }),
    ] }, priced);
    expect(r.hardware.filter((h) => h.key === 'hinge')).toHaveLength(1);
    expect(r.hardware.find((h) => h.key === 'hinge')!.quantity).toBe(4);
  });

  it('maliyet ve teklif hesabı', () => {
    const r = computeProject({ cabinets: cabinets() }, priced);
    const sum = r.costLines.reduce((s, c) => s + c.total, 0);
    expect(r.quote.subtotal).toBeCloseTo(sum, 2);
    expect(r.quote.profit).toBeCloseTo(r.quote.subtotal * 0.2, 2);
    expect(r.quote.vat).toBeCloseTo(r.quote.net * 0.2, 2);
    expect(r.quote.total).toBeCloseTo(r.quote.net + r.quote.vat, 2);
    const labor = r.costLines.find((c) => c.category === 'labor')!;
    expect(labor.total).toBe(3000);
  });

  it('bant metrajı fire ile artar', () => {
    const r = computeProject({ cabinets: cabinets() }, priced);
    for (const b of r.bands) expect(b.withWaste).toBeCloseTo(b.meters * 1.1, 1);
    expect(r.bands.map((b) => b.thickness)).toEqual([0.8, 1]);
  });

  it('plakaya sığmayan parça hata olarak listelenir', () => {
    const huge = { ...createProjectCabinet({ id: 'x', type: 'tall', width: 600, code: 'M09' }), height: 3000 };
    const r = computeProject({ cabinets: [huge] }, DEFAULT_SETTINGS);
    expect(r.warnings.some((w) => w.ruleId === 'VAL_EXCEEDS_SHEET' && w.cabinetCode === 'M09')).toBe(true);
  });

  it('boş proje', () => {
    const r = computeProject({ cabinets: [] }, DEFAULT_SETTINGS);
    expect(r.groups).toHaveLength(0);
    expect(r.quote.total).toBe(0);
  });
});

describe('ayarlar ve proje fabrikası', () => {
  it('eksik ayarları varsayılanlarla birleştirir', () => {
    const s = mergeSettings({ workshopName: 'X', materials: { body: { name: 'Y', pricePerSheet: 5 } } as AppSettings['materials'] });
    expect(s.workshopName).toBe('X');
    expect(s.materials.body).toEqual({ name: 'Y', pricePerSheet: 5 });
    expect(s.materials.front).toEqual(DEFAULT_SETTINGS.materials.front);
    expect(s.hardwarePrices.hinge).toBe(0);
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('yeni proje bir mekân ve bir duvarla başlar', () => {
    const p = createProject({ id: 'p', spaceId: 's', wallId: 'w', name: 'A', customerName: 'B', now: '2026-01-01T00:00:00.000Z' });
    expect(p.spaces[0].walls[0]).toMatchObject({ id: 'w', effectiveWidth: 2995 });
    expect(p.cabinets).toEqual([]);
  });

  it('kullanılabilir duvar genişliği en dar ölçüden pay düşülerek bulunur', () => {
    expect(effectiveWallWidth({ widthLeft: 3010, widthCenter: 3000, widthRight: 3005, installGap: 5 })).toBe(2995);
    expect(createWall('w', 's', 'B').name).toBe('B');
  });

  it('eski proje verisini tamamlar', () => {
    const p = normalizeProject({ id: 'old', name: 'Eski', spaces: [] } as never, '2026-01-01T00:00:00.000Z');
    expect(p).toMatchObject({ id: 'old', name: 'Eski', cabinets: [], customerPhone: '', createdAt: '2026-01-01T00:00:00.000Z' });
  });
});
