import { describe, it, expect } from 'vitest';
import { summarizeBands } from '../../core/optimizer/band-summary';

describe('Band Summary', () => {
  it('should calculate correct meters for 4-edge banded part', () => {
    const result = summarizeBands([{
      length: 1000,
      width: 500,
      quantity: 1,
      edgeBanding: {
        top: { thickness: 1, materialId: 'b1' },
        bottom: { thickness: 1, materialId: 'b1' },
        left: { thickness: 1, materialId: 'b1' },
        right: { thickness: 1, materialId: 'b1' }
      }
    }]);

    expect(result.totalMeters).toBe(3); // 2 * 1m + 2 * 0.5m = 3m
    expect(result.items[0].withWaste).toBeCloseTo(3.3); // 10% waste
  });

  it('should group by thickness and apply waste factor', () => {
    const result = summarizeBands([{
      length: 1000,
      width: 500,
      quantity: 2,
      edgeBanding: {
        top: { thickness: 1, materialId: 'b1' }, // 2 * 1000 = 2m
        bottom: { thickness: 2, materialId: 'b2' }, // 2 * 1000 = 2m
        left: { thickness: 1, materialId: 'b1' }, // 2 * 500 = 1m
        right: null
      }
    }]);

    expect(result.items.length).toBe(2);
    
    const b1 = result.items.find(i => i.materialId === 'b1');
    expect(b1?.totalMeters).toBe(3);
    expect(b1?.withWaste).toBeCloseTo(3.3);

    const b2 = result.items.find(i => i.materialId === 'b2');
    expect(b2?.totalMeters).toBe(2);
    expect(b2?.withWaste).toBeCloseTo(2.2);
  });
});
