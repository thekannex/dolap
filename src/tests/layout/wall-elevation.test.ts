import { describe, it, expect } from 'vitest';
import { placeWallCabinets, checkWallFit } from '../../core/layout/wall-elevation';
import { createProjectCabinet } from '../../core/engine/cabinet-factory';
import type { CabinetType } from '../../core/models/cabinet';

const cab = (id: string, type: CabinetType, width: number, x: number | null = null) =>
  createProjectCabinet({ id, type, width, code: id.toUpperCase(), wallId: 'w', x });

describe('placeWallCabinets', () => {
  it('konumsuz dolaplar kendi sırasında yan yana dizilir', () => {
    const p = placeWallCabinets([cab('a', 'base', 600), cab('b', 'base', 400), cab('c', 'wall', 600), cab('d', 'wall', 400)]);
    expect(p.map((x) => [x.cabinetId, x.x])).toEqual([['a', 0], ['b', 600], ['c', 0], ['d', 600]]);
  });

  it('konumu girilmiş dolap oraya yerleşir, sonraki onun yanına gelir', () => {
    const p = placeWallCabinets([cab('a', 'base', 600, 1000), cab('b', 'base', 400)]);
    expect(p.map((x) => x.x)).toEqual([1000, 1600]);
  });

  it('adet kadar kopya üretir', () => {
    const c = { ...cab('a', 'base', 500), quantity: 3 };
    const p = placeWallCabinets([c]);
    expect(p.map((x) => [x.copy, x.x])).toEqual([[0, 0], [1, 500], [2, 1000]]);
  });

  it('üst dolaplar boy dolabın üstüne binmez', () => {
    const p = placeWallCabinets([cab('t', 'tall', 600), cab('u', 'wall', 400)]);
    expect(p.find((x) => x.cabinetId === 'u')?.x).toBe(600);
  });
});

describe('checkWallFit', () => {
  it('taşmayı ve çakışmayı bulur', () => {
    const p = placeWallCabinets([cab('a', 'base', 600), cab('b', 'base', 600, 300), cab('c', 'wall', 2000)]);
    const fit = checkWallFit(p, 1500);
    expect(fit.overflow).toBe(500);
    expect(fit.overlaps).toEqual([['A', 'B']]);
  });

  it('farklı sıradaki dolaplar çakışmaz, boy dolap her ikisiyle çakışabilir', () => {
    const p = placeWallCabinets([cab('a', 'base', 600), cab('b', 'wall', 600), cab('t', 'tall', 600, 300)]);
    const fit = checkWallFit(p, 3000);
    expect(fit.overflow).toBe(0);
    expect(fit.overlaps).toEqual([['A', 'T'], ['B', 'T']]);
  });
});
