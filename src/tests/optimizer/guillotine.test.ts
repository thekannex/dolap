import { describe, it, expect } from 'vitest';
import { optimizeCutting } from '../../core/optimizer/guillotine';

describe('Guillotine Optimizer', () => {
  it('should fit a single piece on one sheet', () => {
    const result = optimizeCutting([{
      id: 'p1',
      length: 1000,
      width: 500,
      quantity: 1,
      materialId: 'm1',
      grainDirection: 'none',
      label: 'Kapak'
    }], 2800, 2100, 4, 10);

    expect(result.totalSheets).toBe(1);
    expect(result.unplacedPieces.length).toBe(0);
    expect(result.layouts[0].placements.length).toBe(1);
  });

  it('should pack multiple pieces into minimum sheets', () => {
    const result = optimizeCutting([{
      id: 'p1',
      length: 2000,
      width: 1000,
      quantity: 4, // Needs at least 2 sheets
      materialId: 'm1',
      grainDirection: 'none',
      label: 'Gövde'
    }], 2800, 2100, 4, 10);

    expect(result.totalSheets).toBe(2);
    expect(result.unplacedPieces.length).toBe(0);
  });

  it('should prevent invalid rotation based on grain', () => {
    // 2800x2100, usable 2780x2080
    // piece: length=2500, width=1500
    // if grain is 'width', it requires width to run along X
    // which means piece width 1500 must align with sheet X
    // piece length 2500 must align with sheet Y (max 2080) - won't fit!
    const result = optimizeCutting([{
      id: 'p1',
      length: 2500,
      width: 1500,
      quantity: 1,
      materialId: 'm1',
      grainDirection: 'width',
      label: 'Kapak'
    }], 2800, 2100, 4, 10);

    expect(result.unplacedPieces.length).toBe(1);
  });

  it('should calculate usage percent correctly', () => {
    const result = optimizeCutting([{
      id: 'p1',
      length: 1400,
      width: 1050, // exactly 1/4 of 2800x2100 ignoring kerf/trim
      quantity: 1,
      materialId: 'm1',
      grainDirection: 'none',
      label: 'Test'
    }], 2800, 2100, 0, 0);

    expect(result.layouts[0].usagePercent).toBe(25);
  });
});
