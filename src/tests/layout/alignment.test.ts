import { describe, it, expect } from 'vitest';
import { alignUpperToLower } from '../../core/layout/alignment';
import type { PlannedModule } from '../../core/layout/module-planner';

describe('alignUpperToLower', () => {
  it('Perfect alignment scores 100', () => {
    const lower: PlannedModule[] = [
      { x: 0, width: 600, type: 'cabinet', name: 'Alt 600', locked: false },
      { x: 600, width: 600, type: 'cabinet', name: 'Alt 600', locked: false }
    ];
    const upper: PlannedModule[] = [
      { x: 0, width: 600, type: 'cabinet', name: 'Üst 600', locked: false },
      { x: 600, width: 600, type: 'cabinet', name: 'Üst 600', locked: false }
    ];
    
    const result = alignUpperToLower(lower, upper);
    expect(result.alignmentScore).toBe(100);
    expect(result.adjustments.length).toBe(0);
  });

  it('Slight misalignment within tolerance is adjusted', () => {
    const lower: PlannedModule[] = [
      { x: 0, width: 605, type: 'cabinet', name: 'Alt', locked: false },
      { x: 605, width: 600, type: 'cabinet', name: 'Alt 2', locked: false }
    ];
    const upper: PlannedModule[] = [
      { x: 0, width: 600, type: 'cabinet', name: 'Üst', locked: false },
      { x: 600, width: 600, type: 'cabinet', name: 'Üst 2', locked: false }
    ];
    
    const result = alignUpperToLower(lower, upper, 10);
    expect(result.adjustments.length).toBe(1);
    expect(result.adjustedModules[0].width).toBe(605);
    expect(result.adjustedModules[1].x).toBe(605);
  });

  it('Large misalignment cannot be fixed and lowers score', () => {
    const lower: PlannedModule[] = [
      { x: 0, width: 400, type: 'cabinet', name: 'Alt', locked: false },
      { x: 400, width: 800, type: 'cabinet', name: 'Alt 2', locked: false }
    ];
    const upper: PlannedModule[] = [
      { x: 0, width: 600, type: 'cabinet', name: 'Üst', locked: false },
      { x: 600, width: 600, type: 'cabinet', name: 'Üst 2', locked: false }
    ];
    
    const result = alignUpperToLower(lower, upper, 5);
    expect(result.alignmentScore).toBe(0);
    expect(result.adjustments.length).toBe(0);
  });
});
