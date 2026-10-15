import { describe, it, expect } from 'vitest';
import { generate32mmHolePositions, snapTo32mm, HOLE_ROW_INSET } from '../../core/engine/32mm-system';

describe('32mm-system', () => {
  it('HOLE_ROW_INSET = 37mm', () => {
    expect(HOLE_ROW_INSET).toBe(37);
  });

  describe('generate32mmHolePositions', () => {
    it('generates positions every 32mm', () => {
      const positions = generate32mmHolePositions(720, 64, 64, 32, 5);
      expect(positions[0]).toBe(64);
      expect(positions[1]).toBe(96);
      expect(positions[positions.length - 1]).toBeLessThanOrEqual(720 - 64);
    });

    it('respects start and end limits', () => {
      const positions = generate32mmHolePositions(200, 50, 50, 32, 5);
      expect(positions.every(p => p >= 50 && p <= 150)).toBe(true);
    });

    it('empty when start > panelHeight - end', () => {
      const positions = generate32mmHolePositions(100, 80, 80, 32, 5);
      expect(positions.length).toBe(0);
    });
  });

  describe('snapTo32mm', () => {
    it('snaps to nearest hole', () => {
      const holes = [64, 96, 128, 160, 192];
      const result = snapTo32mm(100, holes);
      expect(result.snapped).toBe(96);
      expect(result.originalY).toBe(100);
      expect(result.delta).toBe(-4);
    });

    it('exact match returns delta 0', () => {
      const holes = [64, 96, 128];
      const result = snapTo32mm(96, holes);
      expect(result.snapped).toBe(96);
      expect(result.delta).toBe(0);
    });

    it('empty holes returns original', () => {
      const result = snapTo32mm(100, []);
      expect(result.snapped).toBe(100);
      expect(result.delta).toBe(0);
    });
  });
});
