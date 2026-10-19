import type { Composition, Job, JobKind, Project, Space, Wall } from '../models/project';
import { normalizeCabinet } from '../engine/cabinet-factory';
import { migrateJobs } from './jobs';

export function effectiveWallWidth(w: Pick<Wall, 'widthLeft' | 'widthCenter' | 'widthRight' | 'installGap'>): number {
  return Math.min(w.widthLeft, w.widthCenter, w.widthRight) - w.installGap;
}

export function createWall(id: string, spaceId: string, name: string): Wall {
  const wall: Wall = {
    id, spaceId, name,
    widthLeft: 3000, widthCenter: 3000, widthRight: 3000,
    heightLeft: 2500, heightCenter: 2500, heightRight: 2500,
    installGap: 5,
    effectiveWidth: 0,
    obstacles: [],
  };
  wall.effectiveWidth = effectiveWallWidth(wall);
  return wall;
}

/** Projenin ilk işinin türü. */
export type ProjectKind = JobKind;

/** Mekândaki duvar adlarına göre kullanılmamış ilk harfi verir: A Duvarı, B Duvarı... */
export function nextWallName(existing: string[]): string {
  for (let i = 0; i < 26; i++) {
    const name = `${String.fromCharCode(65 + i)} Duvarı`;
    if (!existing.includes(name)) return name;
  }
  return `Duvar ${existing.length + 1}`;
}

/**
 * Yeni işin başlangıç kayıtları: mutfak ve duvar dolabı bir mekân + A Duvarı ile,
 * bağımsız ünite boş bir çizimle (kompozisyon) başlar.
 */
export function createJobEntities(kind: JobKind, name: string, ids: { jobId: string; spaceId: string; wallId: string; compositionId: string }): {
  job: Job; spaces: Space[]; compositions: Composition[];
} {
  const job: Job = { id: ids.jobId, name, kind };
  if (kind === 'furniture') {
    return { job, spaces: [], compositions: [{ id: ids.compositionId, name, jobId: ids.jobId }] };
  }
  const space: Space = {
    id: ids.spaceId, name, type: kind === 'kitchen' ? 'kitchen' : 'room', ceilingHeight: 2500, jobId: ids.jobId,
    walls: [createWall(ids.wallId, ids.spaceId, 'A Duvarı')],
  };
  return { job, spaces: [space], compositions: [] };
}

export function createProject(params: {
  id: string; spaceId: string; wallId: string; name: string; customerName: string; now: string; kind?: ProjectKind;
  jobId?: string; compositionId?: string; jobName?: string;
}): Project {
  const kind = params.kind ?? 'kitchen';
  const jobName = params.jobName ?? (kind === 'kitchen' ? 'Mutfak' : kind === 'built_in' ? 'Kiler' : 'TV ünitesi');
  const first = createJobEntities(kind, jobName, {
    jobId: params.jobId ?? `${params.id}-job`, spaceId: params.spaceId, wallId: params.wallId,
    compositionId: params.compositionId ?? `${params.id}-comp`,
  });
  return {
    id: params.id,
    name: params.name,
    customerName: params.customerName,
    customerPhone: '',
    address: '',
    notes: '',
    createdAt: params.now,
    updatedAt: params.now,
    spaces: first.spaces,
    cabinets: [],
    compositions: first.compositions,
    jobs: [first.job],
  };
}

/** Eski sürüm ya da dışarıdan gelen proje verisini güncel yapıya getirir. */
export function normalizeProject(raw: Partial<Project> & { id: string }, now: string = new Date().toISOString()): Project {
  const base = {
    name: 'Adsız Proje',
    customerName: '',
    customerPhone: '',
    address: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
    spaces: [],
    compositions: [],
    jobs: [],
    ...raw,
    cabinets: (raw.cabinets ?? []).map((c) => normalizeCabinet(c)),
  } as Project;
  // İşi olmayan eski kayıtlar işlere dağıtılır; kimlikler proje kimliğinden türetilir (tekrar açınca aynı)
  let seq = 0;
  return migrateJobs(base, () => `${raw.id}-job-${++seq}`);
}
