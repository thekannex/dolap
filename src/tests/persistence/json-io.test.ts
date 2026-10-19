import { describe, it, expect } from 'vitest';
import { exportProjectJSON, importProjectJSON } from '../../core/persistence/json-io';
import { createProject } from '../../core/project/project-factory';
import { createProjectCabinet } from '../../core/engine/cabinet-factory';
import { bandLabel, formatMoney, formatNumber, safeFileName, formatDate } from '../../core/utils/format';

describe('proje dosyası', () => {
  it('dışa aktarılan proje aynen geri okunur', () => {
    const p = createProject({ id: 'p', spaceId: 's', wallId: 'w', name: 'Mutfak', customerName: 'Ali', now: '2026-01-01T00:00:00.000Z' });
    p.cabinets = [{ ...createProjectCabinet({ id: 'c', type: 'base', width: 600, code: 'M01', wallId: 'w' }), jobId: 'p-job' }];
    const { project, version } = importProjectJSON(exportProjectJSON(p));
    expect(version).toBe('2.0');
    expect(project).toEqual(p);
  });

  it('eski sürüm dosyasını tamamlar', () => {
    const { project, version } = importProjectJSON(JSON.stringify({ project: { id: 'x', name: 'Eski', customerName: 'A', spaces: [] } }));
    expect(version).toBe('1.0');
    expect(project.cabinets).toEqual([]);
    expect(project.notes).toBe('');
  });

  it('bozuk dosyada anlaşılır hata', () => {
    expect(() => importProjectJSON('{bozuk')).toThrow('geçerli bir JSON değil');
    expect(() => importProjectJSON('{"foo":1}')).toThrow('Geçersiz proje dosyası');
    expect(() => importProjectJSON('null')).toThrow('Geçersiz proje dosyası');
  });
});

describe('biçimlendirme', () => {
  it('bant etiketi', () => {
    expect(bandLabel({ top: 0, bottom: 0, left: 0, right: 0 })).toBe('—');
    expect(bandLabel({ top: 0.8, bottom: 0, left: 0, right: 0 })).toBe('Boy×1 · 0,8');
    expect(bandLabel({ top: 1, bottom: 1, left: 1, right: 1 })).toBe('Boy×2 En×2 · 1');
    expect(bandLabel({ top: 2, bottom: 0, left: 0.8, right: 0 })).toBe('Boy×1 En×1 · 2/0,8');
  });

  it('para ve sayı', () => {
    expect(formatMoney(1234.5)).toBe('1.234,50 ₺');
    expect(formatNumber(72.234)).toBe('72,23');
    expect(formatDate('2026-03-05T10:00:00.000Z')).toMatch(/0[5-6]\.03\.2026/);
  });

  it('dosya adı', () => {
    expect(safeFileName('Şahin Ailesi / Mutfak')).toBe('Sahin_Ailesi_Mutfak');
    expect(safeFileName('???')).toBe('Proje');
  });
});
