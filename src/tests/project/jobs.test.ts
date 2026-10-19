import { describe, it, expect } from 'vitest';
import { migrateJobs, jobContent, projectForJob, nextJobName } from '../../core/project/jobs';
import { createProject, createWall, normalizeProject } from '../../core/project/project-factory';
import { createProjectCabinet } from '../../core/engine/cabinet-factory';
import type { Project } from '../../core/models/project';
import type { CabinetType } from '../../core/models/cabinet';

const cab = (id: string, type: CabinetType, extra: Partial<ReturnType<typeof createProjectCabinet>> = {}) =>
  ({ ...createProjectCabinet({ id, type, width: 600, code: id.toUpperCase() }), ...extra });
const ids = () => { let i = 0; return () => `j${++i}`; };

/** İş yapısı olmayan eski proje. */
const legacy = (): Project => ({
  id: 'p', name: 'Eski', customerName: '', customerPhone: '', address: '', notes: '', createdAt: '', updatedAt: '',
  jobs: [],
  spaces: [
    { id: 's1', name: 'Mutfak', type: 'kitchen', ceilingHeight: 2500, walls: [createWall('w1', 's1', 'A Duvarı')] },
    { id: 's2', name: 'Koridor', type: 'room', ceilingHeight: 2500, walls: [createWall('w2', 's2', 'A Duvarı')] },
  ],
  compositions: [
    { id: 'c1', name: 'Koridor dolabı', wallId: 'w2' },
    { id: 'c2', name: 'TV ünitesi' },
  ],
  cabinets: [
    cab('a', 'base', { wallId: 'w1' }),
    cab('b', 'custom', { groupId: 'c1', x: 0, elevation: 0 }),
    cab('c', 'custom', { groupId: 'c2', x: 0, elevation: 0 }),
    cab('d', 'wall'),
    cab('e', 'wardrobe'),
  ],
});

describe('işler', () => {
  it('eski projeyi işlere dağıtır', () => {
    const p = migrateJobs(legacy(), ids());
    expect(p.jobs.map((j) => [j.name, j.kind])).toEqual([
      ['Mutfak', 'kitchen'], ['Koridor', 'built_in'], ['TV ünitesi', 'furniture'], ['Tek dolaplar', 'furniture'],
    ]);
    const jobOf = (id: string) => p.jobs.find((j) => j.id === p.cabinets.find((c) => c.id === id)!.jobId)!.name;
    expect(['a', 'b', 'c', 'd', 'e'].map(jobOf)).toEqual(['Mutfak', 'Koridor', 'TV ünitesi', 'Mutfak', 'Tek dolaplar']);
    expect(p.compositions.map((c) => c.jobId)).toEqual(['j2', 'j3']);
  });

  it('dönüşüm tekrar çalışınca bir şey değişmez', () => {
    const once = migrateJobs(legacy(), ids());
    const twice = migrateJobs(once, ids());
    expect(twice.jobs).toEqual(once.jobs);
    expect(twice.cabinets.map((c) => c.jobId)).toEqual(once.cabinets.map((c) => c.jobId));
  });

  it('normalizeProject eski kaydı açarken işleri kurar, kimlikler kararlı', () => {
    const raw = { ...legacy(), jobs: undefined } as unknown as Project;
    const a = normalizeProject(raw);
    const b = normalizeProject(raw);
    expect(a.jobs.length).toBe(4);
    expect(a.jobs.map((j) => j.id)).toEqual(b.jobs.map((j) => j.id));
  });

  it('yeni proje ilk işiyle başlar', () => {
    const k = createProject({ id: 'p', spaceId: 's', wallId: 'w', name: 'X', customerName: '', now: '', kind: 'kitchen' });
    expect(k.jobs).toEqual([{ id: 'p-job', name: 'Mutfak', kind: 'kitchen' }]);
    expect(k.spaces[0].jobId).toBe('p-job');
    const f = createProject({ id: 'p', spaceId: 's', wallId: 'w', name: 'X', customerName: '', now: '', kind: 'furniture' });
    expect(f.spaces).toEqual([]);
    expect(f.compositions).toEqual([{ id: 'p-comp', name: 'TV ünitesi', jobId: 'p-job' }]);
    const b = createProject({ id: 'p', spaceId: 's', wallId: 'w', name: 'X', customerName: '', now: '', kind: 'built_in' });
    expect(b.jobs[0].kind).toBe('built_in');
    expect(b.spaces[0].walls).toHaveLength(1);
  });

  it('işe göre süzme', () => {
    const p = migrateJobs(legacy(), ids());
    expect(jobContent(p, 'j1').cabinets.map((c) => c.id)).toEqual(['a', 'd']);
    const only = projectForJob(p, 'j2');
    expect(only.spaces.map((s) => s.id)).toEqual(['s2']);
    expect(only.compositions.map((c) => c.id)).toEqual(['c1']);
    expect(projectForJob(p, null)).toBe(p);
  });

  it('ad önerisi', () => {
    expect(nextJobName('built_in', [])).toBe('Kiler');
    expect(nextJobName('built_in', ['Kiler'])).toBe('Kiler 2');
  });
});
