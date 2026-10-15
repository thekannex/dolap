import { describe, it, expect } from 'vitest';
import { planModules } from '../../core/layout/module-planner';

describe('planModules', () => {
  const standardWidths = [300, 400, 450, 500, 600, 800, 900];

  it('3000mm wall fills completely', () => {
    const result = planModules({
      effectiveWidth: 3000,
      standardWidths,
      fixedModules: [],
      minFillerWidth: 50,
      maxFillerWidth: 150
    });
    const totalW = result.modules.reduce((s, m) => s + m.width, 0);
    expect(totalW).toBe(3000);
    expect(result.totalFiller).toBe(0);
    expect(result.warning).toBeUndefined();
  });

  it('Wall with appliance in middle creates correct gaps', () => {
    const result = planModules({
      effectiveWidth: 3000,
      standardWidths,
      fixedModules: [{ x: 1000, width: 600, name: 'Fırın' }],
      minFillerWidth: 50,
      maxFillerWidth: 150
    });
    const appliance = result.modules.find(m => m.type === 'appliance');
    expect(appliance).toBeDefined();
    expect(appliance?.x).toBe(1000);
    const totalW = result.modules.reduce((s, m) => s + m.width, 0);
    expect(totalW).toBeLessThanOrEqual(3000);
  });

  it('Small remainder puts filler at edge', () => {
    const result = planModules({
      effectiveWidth: 1370,  // 1300 (400+900) + 70 filler
      standardWidths,
      fixedModules: [],
      minFillerWidth: 50,
      maxFillerWidth: 150
    });
    const filler = result.modules.find(m => m.type === 'filler');
    expect(filler).toBeDefined();
    expect(filler!.width).toBeGreaterThanOrEqual(50);
    expect(filler!.width).toBeLessThanOrEqual(150);
    expect(result.totalFiller).toBeGreaterThan(0);
  });

  it('No valid combination creates warning', () => {
    const result = planModules({
      effectiveWidth: 320,
      standardWidths,
      fixedModules: [],
      minFillerWidth: 50,
      maxFillerWidth: 150
    });
    expect(result.warning).toBeDefined();
  });
});
