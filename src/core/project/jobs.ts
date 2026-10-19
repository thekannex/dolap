import type { Composition, Job, JobKind, Project, Space } from '../models/project';
import type { ProjectCabinet } from '../models/cabinet';
import { KITCHEN_TYPES } from '../engine/cabinet-factory';

/**
 * İşler: bir proje, aynı müşterinin birden çok işini taşır (mutfak + kiler + TV ünitesi gibi).
 * Her mekân, kompozisyon ve dolap tek bir işe bağlıdır; kesim ve teklif tüm işleri birlikte ya da
 * iş iş hesaplar.
 */

export const JOB_KINDS: Array<{ value: JobKind; label: string; text: string; example: string }> = [
  { value: 'kitchen', label: 'Mutfak', text: 'Duvar ölçüsünden alt ve üst dolapları otomatik yerleştirir.', example: 'Mutfak' },
  { value: 'built_in', label: 'Duvar dolabı', text: 'Kolon, kiriş ve çıkıntılı duvara oturan kiler, gömme gardırop, boydan boya dolap.', example: 'Kiler' },
  { value: 'furniture', label: 'Bağımsız ünite', text: 'Duvardan bağımsız TV ünitesi, kitaplık, gardırop, şifonyer; çizerek ya da şablondan.', example: 'TV ünitesi' },
];

export function jobKindInfo(kind: JobKind) {
  return JOB_KINDS.find((k) => k.value === kind) ?? JOB_KINDS[0];
}

/** Aynı türden işler için kullanılmamış ad: "Kiler", "Kiler 2"... */
export function nextJobName(kind: JobKind, existing: string[]): string {
  const base = jobKindInfo(kind).example;
  if (!existing.includes(base)) return base;
  for (let i = 2; ; i++) if (!existing.includes(`${base} ${i}`)) return `${base} ${i}`;
}

/** İşin türü duvar gerektirir mi (mekân ve duvarla başlar). */
export const jobHasWalls = (kind: JobKind) => kind !== 'furniture';

export interface JobContent {
  spaces: Space[];
  compositions: Composition[];
  cabinets: ProjectCabinet[];
}

/** İşin mekânları, kompozisyonları ve dolapları. */
export function jobContent(project: Pick<Project, 'spaces' | 'compositions' | 'cabinets'>, jobId: string): JobContent {
  return {
    spaces: project.spaces.filter((s) => s.jobId === jobId),
    compositions: project.compositions.filter((c) => c.jobId === jobId),
    cabinets: project.cabinets.filter((c) => c.jobId === jobId),
  };
}

/** Projeyi tek bir işe indirger (kesim, teklif ve 3D için); jobId null ise proje olduğu gibi döner. */
export function projectForJob<T extends Pick<Project, 'spaces' | 'compositions' | 'cabinets'>>(project: T, jobId: string | null): T {
  if (!jobId) return project;
  return { ...project, ...jobContent(project, jobId) };
}

/**
 * Eski projeleri iş yapısına taşır; işleri zaten olan projede yalnızca işsiz kalan kayıtları bağlar.
 * - Üzerinde mutfak dolabı olan ya da boş mekân → Mutfak işi
 * - Yalnızca duvara oturtulmuş dolap taşıyan mekân → Duvar dolabı işi
 * - Duvarsız kompozisyon → her biri ayrı Bağımsız ünite işi
 * - Hiçbir yere bağlı olmayan dolap → mutfak tipiyse ilk mutfak işi, değilse "Tek dolaplar" işi
 */
export function migrateJobs(project: Project, newId: () => string): Project {
  const jobs: Job[] = [...(project.jobs ?? [])];
  const known = new Set(jobs.map((j) => j.id));
  const valid = (id: string | null | undefined): id is string => Boolean(id && known.has(id));
  const add = (kind: JobKind, name: string): string => {
    const job = { id: newId(), name, kind };
    jobs.push(job);
    known.add(job.id);
    return job.id;
  };

  const wallSpace = new Map<string, string>(); // duvar → mekân
  for (const s of project.spaces) for (const w of s.walls) wallSpace.set(w.id, s.id);

  // Mekânlar
  const spaceJob = new Map<string, string>();
  const spaces = project.spaces.map((s) => {
    if (valid(s.jobId)) { spaceJob.set(s.id, s.jobId); return s; }
    const wallIds = new Set(s.walls.map((w) => w.id));
    const hasKitchen = project.cabinets.some((c) => !c.groupId && c.wallId && wallIds.has(c.wallId));
    const hasFitted = project.compositions.some((c) => c.wallId && wallIds.has(c.wallId));
    const jobId = add(hasFitted && !hasKitchen ? 'built_in' : 'kitchen', s.name);
    spaceJob.set(s.id, jobId);
    return { ...s, jobId };
  });

  // Kompozisyonlar: duvarlıysa duvarın işi, değilse kendi bağımsız ünite işi
  const compJob = new Map<string, string>();
  const compositions = project.compositions.map((c) => {
    if (valid(c.jobId)) { compJob.set(c.id, c.jobId); return c; }
    const sid = c.wallId ? wallSpace.get(c.wallId) : undefined;
    const jobId = sid ? spaceJob.get(sid)! : add('furniture', c.name);
    compJob.set(c.id, jobId);
    return { ...c, jobId };
  });

  // Dolaplar
  let looseJob: string | null = null;
  const firstKitchen = () => jobs.find((j) => j.kind === 'kitchen')?.id ?? null;
  const cabinets = project.cabinets.map((c) => {
    if (valid(c.jobId)) return c;
    let jobId: string | undefined;
    if (c.groupId) jobId = compJob.get(c.groupId);
    if (!jobId && c.wallId) {
      const sid = wallSpace.get(c.wallId);
      if (sid) jobId = spaceJob.get(sid);
    }
    if (!jobId && KITCHEN_TYPES.includes(c.type)) jobId = firstKitchen() ?? undefined;
    if (!jobId) jobId = looseJob ??= add('furniture', 'Tek dolaplar');
    return { ...c, jobId };
  });

  return { ...project, jobs, spaces, compositions, cabinets };
}
