import { describe, it, expect } from 'vitest';
import { generateSheetsDXF } from '../../core/export/dxf-export';
import { computeProject } from '../../core/project/project-calc';
import { DEFAULT_SETTINGS } from '../../core/project/default-settings';
import { createProjectCabinet } from '../../core/engine/cabinet-factory';

describe('generateSheetsDXF', () => {
  const r = computeProject({ cabinets: [createProjectCabinet({ id: 'a', type: 'base', width: 600, code: 'M01' })] }, DEFAULT_SETTINGS);
  const dxf = generateSheetsDXF(r.groups);
  const lines = dxf.split('\r\n');

  it('geçerli R12 iskeleti', () => {
    expect(lines.slice(0, 6)).toEqual(['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER']);
    expect(dxf).toContain('AC1009');
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true);
    for (const layer of ['PLAKA', 'PARCA', 'YAZI']) expect(dxf).toContain(layer);
  });

  it('her parça için dört çizgi', () => {
    const pieces = r.groups.reduce((s, g) => s + g.optimization.layouts.reduce((a, l) => a + l.placements.length, 0), 0);
    const sheets = r.totals.sheetCount;
    const lineCount = lines.filter((l) => l === 'LINE').length;
    expect(lineCount).toBe((pieces + sheets) * 4);
  });

  it('metinler ASCII', () => {
    expect(/^[\x20-\x7E\r\n]*$/.test(dxf)).toBe(true);
    expect(dxf).toContain('M01-YAN-SOL');
  });

  it('boş grup listesinde yalnızca iskelet', () => {
    expect(generateSheetsDXF([]).split('\r\n').filter((l) => l === 'LINE')).toHaveLength(0);
  });
});
