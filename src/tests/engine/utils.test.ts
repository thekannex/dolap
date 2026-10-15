import { describe, it, expect } from 'vitest';
import { roundDown05 } from '../../core/utils/rounding';
import { mmToM, m2 } from '../../core/utils/units';

describe('rounding', () => {
  it('rounds down to nearest 0.5mm', () => {
    expect(roundDown05(764.7)).toBe(764.5);
    expect(roundDown05(764.3)).toBe(764);
    expect(roundDown05(764.0)).toBe(764);
    expect(roundDown05(764.5)).toBe(764.5);
    expect(roundDown05(764.9)).toBe(764.5);
    expect(roundDown05(765.0)).toBe(765);
  });

  it('handles zero', () => {
    expect(roundDown05(0)).toBe(0);
  });

  it('handles small values', () => {
    expect(roundDown05(0.3)).toBe(0);
    expect(roundDown05(0.5)).toBe(0.5);
    expect(roundDown05(0.7)).toBe(0.5);
  });
});

describe('units', () => {
  describe('mmToM', () => {
    it('converts mm to meters', () => {
      expect(mmToM(1000)).toBe(1);
      expect(mmToM(2800)).toBe(2.8);
      expect(mmToM(0)).toBe(0);
    });
  });

  describe('m2', () => {
    it('calculates area in m²', () => {
      expect(m2(1000, 1000)).toBe(1);
      expect(m2(2800, 2100)).toBeCloseTo(5.88, 2);
      expect(m2(0, 1000)).toBe(0);
    });
  });
});
