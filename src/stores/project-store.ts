import { create } from 'zustand';
import type { Composition, JobKind, Project, Space, Wall, Obstacle } from '../core/models/project';
import { applyBoxContent, boxContentLabel, checkSharing, detectBoxContent, COMPOSITION_TEMPLATES } from '../core/layout/composition';
import type { BoxContent } from '../core/layout/composition';
import { fitBoxContent } from '../core/layout/wall-fit';
import type { FitBox } from '../core/layout/wall-fit';
import type { CabinetType, ProjectCabinet } from '../core/models/cabinet';
import type { PlannedModule } from '../core/layout/module-planner';
import {
  applyTypePreset, createProjectCabinet, nextCabinetCode, rowForType, CABINET_TYPE_LABELS, DEFAULT_WIDTHS,
} from '../core/engine/cabinet-factory';
import { createJobEntities, createProject, createWall, effectiveWallWidth, nextWallName, normalizeProject } from '../core/project/project-factory';
import { nextJobName } from '../core/project/jobs';
import { interiorFromCabinet } from '../core/engine/interior';
import type { ProjectKind } from '../core/project/project-factory';

type ProjectInfo = Pick<Project, 'name' | 'customerName' | 'customerPhone' | 'address' | 'notes'>;

export interface ProjectStore {
  project: Project | null;
  activeSpaceId: string | null;
  activeWallId: string | null;
  activeCabinetId: string | null;
  activeCompositionId: string | null;
  /** Açık iş; sayfalar bu işin duvar, çizim ve dolaplarıyla çalışır. */
  activeJobId: string | null;
  /** Proje açılınca/kapanınca artar; geri al geçmişi bununla sıfırlanır. */
  session: number;

  newProject: (name: string, customerName: string, kind?: ProjectKind) => void;
  openProject: (project: Project) => void;
  closeProject: () => void;
  updateProjectInfo: (updates: Partial<ProjectInfo>) => void;

  /** Yeni iş ekler ve açar; kimliğini döndürür. */
  addJob: (kind: JobKind, name?: string) => string | null;
  renameJob: (id: string, name: string) => void;
  /** İşi ve işe bağlı mekân, çizim ve dolapları siler. */
  removeJob: (id: string) => void;
  setActiveJob: (id: string) => void;

  setActiveSpace: (id: string) => void;
  setActiveWall: (id: string) => void;
  setActiveCabinet: (id: string | null) => void;

  addSpace: (name: string, type: string, ceilingHeight: number) => void;
  updateSpace: (id: string, updates: Partial<Space>) => void;
  removeSpace: (id: string) => void;

  /** Duvar ekler ve seçer. spaceId verilmezse ilk mekâna (yoksa yeni bir mekâna) eklenir. */
  addWall: (spaceId?: string | null, name?: string) => string | null;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  removeWall: (id: string) => void;

  /** Engeli ekler, kimliğini döndürür. */
  addObstacle: (wallId: string, obstacle: Omit<Obstacle, 'id'>) => string;
  updateObstacle: (wallId: string, obstacleId: string, updates: Partial<Obstacle>) => void;
  removeObstacle: (wallId: string, obstacleId: string) => void;

  addCabinet: (type: CabinetType, opts?: { width?: number; wallId?: string | null }) => string | null;
  updateCabinet: (id: string, updates: Partial<ProjectCabinet>) => void;
  changeCabinetType: (id: string, type: CabinetType) => void;
  removeCabinet: (id: string) => void;
  duplicateCabinet: (id: string) => string | null;
  moveCabinet: (id: string, direction: -1 | 1) => void;
  applyWallPlan: (wallId: string, modules: PlannedModule[], opts: { includeUpper: boolean; replace: boolean }) => number;

  addComposition: (name?: string) => string | null;
  renameComposition: (id: string, name: string) => void;
  removeComposition: (id: string) => void;
  setActiveComposition: (id: string | null) => void;
  /** Kompozisyona kutu ekler; ölçüler mm, elevation yerden yükseklik. */
  addBox: (groupId: string, box: { x: number; elevation: number; width: number; height: number; depth: number }, content: BoxContent) => string | null;
  /** Kutunun konum/ölçüsünü değiştirir; içerik (çekmece/raf sayısı) yeni boyuta göre yeniden hesaplanır. */
  setBoxGeometry: (id: string, geom: Partial<{ x: number; elevation: number; width: number; height: number; depth: number }>) => void;
  setBoxContent: (id: string, content: BoxContent) => void;
  applyTemplate: (groupId: string, templateId: string) => number;
  /** Kompozisyonda mümkün olan tüm bitişik kutularda ortak dikme ve tabla kullan / kullanma. */
  setSharingForGroup: (groupId: string, on: boolean) => void;
  /**
   * Duvar şekline göre hesaplanmış kutulardan dolap kurar. replaceId verilirse o kompozisyonun kutuları yenilenir.
   * Kompozisyonun kimliğini döndürür.
   */
  createFittedComposition: (wallId: string, boxes: FitBox[], fit: NonNullable<import('../core/models/project').Composition['fit']>, replaceId?: string | null) => string | null;

  getActiveSpace: () => Space | undefined;
  getActiveWall: () => Wall | undefined;
  getActiveCabinet: () => ProjectCabinet | undefined;
}

const uid = () => crypto.randomUUID();

export const useProjectStore = create<ProjectStore>((set, get) => {
  /** Proje üzerinde değişiklik yapan yardımcı; proje yoksa hiçbir şey yapmaz. */
  const mutate = (fn: (p: Project) => Project) => set((state) => {
    if (!state.project) return state;
    return { project: fn(state.project) };
  });

  /** İş açılınca ilk duvarı, çizimi ve dolabı seçer. */
  const selectionFor = (p: Project, jobId: string | null) => {
    const space = p.spaces.find((x) => x.jobId === jobId);
    return {
      activeJobId: jobId,
      activeSpaceId: space?.id ?? null,
      activeWallId: space?.walls[0]?.id ?? null,
      activeCompositionId: p.compositions.find((c) => c.jobId === jobId)?.id ?? null,
      activeCabinetId: p.cabinets.find((c) => c.jobId === jobId)?.id ?? null,
    };
  };
  /** Duvarın bağlı olduğu iş. */
  const jobOfWall = (p: Project, wallId: string | null | undefined) =>
    (wallId ? p.spaces.find((x) => x.walls.some((w) => w.id === wallId))?.jobId : null) ?? get().activeJobId;
  const jobOfComposition = (p: Project, compId: string) => p.compositions.find((c) => c.id === compId)?.jobId ?? get().activeJobId;
  /** Kutular bölmeli kurulur: raf, kapak ve çekmece doğrudan ayarlanır. */
  const withInterior = <T extends ProjectCabinet>(c: T): T => ({ ...c, interior: interiorFromCabinet(c) });

  const mapWalls = (p: Project, fn: (w: Wall) => Wall): Project => ({
    ...p,
    spaces: p.spaces.map((s) => ({ ...s, walls: s.walls.map(fn) })),
  });

  return {
    project: null,
    activeSpaceId: null,
    activeWallId: null,
    activeCabinetId: null,
    activeCompositionId: null,
    activeJobId: null,
    session: 0,

    newProject: (name, customerName, kind = 'kitchen') => {
      const project = createProject({ id: uid(), spaceId: uid(), wallId: uid(), jobId: uid(), compositionId: uid(), name, customerName, now: new Date().toISOString(), kind });
      set({ project, ...selectionFor(project, project.jobs[0].id), session: get().session + 1 });
    },

    openProject: (raw) => {
      const project = normalizeProject(raw);
      set({ project, ...selectionFor(project, project.jobs[0]?.id ?? null), session: get().session + 1 });
    },

    closeProject: () => set({ project: null, activeSpaceId: null, activeWallId: null, activeCabinetId: null, activeCompositionId: null, activeJobId: null, session: get().session + 1 }),

    updateProjectInfo: (updates) => mutate((p) => ({ ...p, ...updates })),

    addJob: (kind, name) => {
      const { project } = get();
      if (!project) return null;
      const n = name?.trim() || nextJobName(kind, project.jobs.map((j) => j.name));
      const e = createJobEntities(kind, n, { jobId: uid(), spaceId: uid(), wallId: uid(), compositionId: uid() });
      const next = { ...project, jobs: [...project.jobs, e.job], spaces: [...project.spaces, ...e.spaces], compositions: [...project.compositions, ...e.compositions] };
      set({ project: next, ...selectionFor(next, e.job.id) });
      return e.job.id;
    },

    renameJob: (id, name) => mutate((p) => ({ ...p, jobs: p.jobs.map((j) => (j.id === id ? { ...j, name } : j)) })),

    removeJob: (id) => {
      const { project, activeJobId } = get();
      if (!project) return;
      const next = {
        ...project,
        jobs: project.jobs.filter((j) => j.id !== id),
        spaces: project.spaces.filter((x) => x.jobId !== id),
        compositions: project.compositions.filter((c) => c.jobId !== id),
        cabinets: project.cabinets.filter((c) => c.jobId !== id),
      };
      set({ project: next, ...(activeJobId === id ? selectionFor(next, next.jobs[0]?.id ?? null) : {}) });
    },

    setActiveJob: (id) => {
      const { project, activeJobId } = get();
      if (!project || id === activeJobId) return;
      set(selectionFor(project, id));
    },

    setActiveSpace: (id) => set({ activeSpaceId: id }),
    setActiveWall: (id) => set({ activeWallId: id }),
    setActiveCabinet: (id) => set({ activeCabinetId: id }),

    addSpace: (name, type, ceilingHeight) => mutate((p) => ({
      ...p,
      spaces: [...p.spaces, { id: uid(), name, type, ceilingHeight, walls: [], jobId: get().activeJobId }],
    })),

    updateSpace: (id, updates) => mutate((p) => ({
      ...p,
      spaces: p.spaces.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

    removeSpace: (id) => {
      const { project, activeWallId } = get();
      if (!project) return;
      const wallIds = new Set(project.spaces.find((s) => s.id === id)?.walls.map((w) => w.id) ?? []);
      const spaces = project.spaces.filter((s) => s.id !== id);
      const cabinets = project.cabinets.map((c) => (c.wallId && wallIds.has(c.wallId) ? { ...c, wallId: null, x: null } : c));
      const fallback = spaces.flatMap((s) => s.walls.map((w) => ({ spaceId: s.id, wallId: w.id })))[0];
      set({
        project: { ...project, spaces, cabinets },
        ...(activeWallId && wallIds.has(activeWallId) ? { activeWallId: fallback?.wallId ?? null, activeSpaceId: fallback?.spaceId ?? null } : {}),
      });
    },

    addWall: (spaceId, name) => {
      const { project } = get();
      if (!project) return null;
      let spaces = project.spaces;
      const jobId = get().activeJobId;
      let space = spaces.find((s) => s.id === spaceId) ?? spaces.find((s) => s.jobId === jobId);
      if (!space) {
        space = { id: uid(), name: project.jobs.find((j) => j.id === jobId)?.name ?? 'Oda', type: 'room', ceilingHeight: 2500, walls: [], jobId };
        spaces = [...spaces, space];
      }
      const target = space;
      const wall = createWall(uid(), target.id, name ?? nextWallName(target.walls.map((w) => w.name)));
      spaces = spaces.map((s) => (s.id === target.id ? { ...s, walls: [...s.walls, wall] } : s));
      set({ project: { ...project, spaces }, activeSpaceId: target.id, activeWallId: wall.id });
      return wall.id;
    },

    updateWall: (id, updates) => mutate((p) => mapWalls(p, (w) => {
      if (w.id !== id) return w;
      const updated = { ...w, ...updates };
      updated.effectiveWidth = effectiveWallWidth(updated);
      return updated;
    })),

    removeWall: (id) => {
      const { project, activeWallId } = get();
      if (!project) return;
      const spaces = project.spaces.map((s) => ({ ...s, walls: s.walls.filter((w) => w.id !== id) }));
      const cabinets = project.cabinets.map((c) => (c.wallId === id ? { ...c, wallId: null, x: null } : c));
      // Duvara oturtulmuş dolaplar serbest kompozisyon olarak kalır
      const compositions = project.compositions.map((c) => (c.wallId === id ? { ...c, wallId: null } : c));
      // Silinen duvar seçiliyse kalan ilk duvara geç
      const fallback = spaces.flatMap((s) => s.walls.map((w) => ({ spaceId: s.id, wallId: w.id })))[0];
      set({
        project: { ...project, spaces, cabinets, compositions },
        ...(activeWallId === id ? { activeWallId: fallback?.wallId ?? null, activeSpaceId: fallback?.spaceId ?? null } : {}),
      });
    },

    addObstacle: (wallId, obstacle) => {
      const id = uid();
      mutate((p) => mapWalls(p, (w) => (
        w.id === wallId ? { ...w, obstacles: [...w.obstacles, { ...obstacle, id, wallId }] } : w
      )));
      return id;
    },

    updateObstacle: (wallId, obstacleId, updates) => mutate((p) => mapWalls(p, (w) => (
      w.id === wallId ? { ...w, obstacles: w.obstacles.map((o) => (o.id === obstacleId ? { ...o, ...updates } : o)) } : w
    ))),

    removeObstacle: (wallId, obstacleId) => mutate((p) => mapWalls(p, (w) => (
      w.id === wallId ? { ...w, obstacles: w.obstacles.filter((o) => o.id !== obstacleId) } : w
    ))),

    addCabinet: (type, opts = {}) => {
      const { project } = get();
      if (!project) return null;
      const id = uid();
      const { activeJobId, activeWallId } = get();
      const job = project.jobs.find((j) => j.id === activeJobId);
      // Mutfak işinde dolap açık duvara eklenir; diğer işlerde duvarsız (tek dolap)
      const wallId = opts.wallId !== undefined ? opts.wallId : job?.kind === 'kitchen' && jobOfWall(project, activeWallId) === activeJobId ? activeWallId : null;
      const cabinet = createProjectCabinet({
        id,
        type,
        width: opts.width ?? DEFAULT_WIDTHS[type],
        code: nextCabinetCode(project.cabinets.map((c) => c.code)),
        wallId,
      });
      cabinet.jobId = wallId ? jobOfWall(project, wallId) : activeJobId;
      set({ project: { ...project, cabinets: [...project.cabinets, cabinet] }, activeCabinetId: id });
      return id;
    },

    updateCabinet: (id, updates) => mutate((p) => ({
      ...p,
      cabinets: p.cabinets.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c, ...updates };
        // Otomatik verilmiş ad ("Alt Dolap 600") genişlikle birlikte güncellenir; elle verilen ad korunur.
        if (updates.width !== undefined && updates.name === undefined && c.name === `${CABINET_TYPE_LABELS[c.type]} ${c.width}`) {
          next.name = `${CABINET_TYPE_LABELS[c.type]} ${updates.width}`;
        }
        return next;
      }),
    })),

    changeCabinetType: (id, type) => mutate((p) => ({
      ...p,
      cabinets: p.cabinets.map((c) => {
        if (c.id !== id) return c;
        const next = applyTypePreset(c, type);
        return { ...c, ...next, row: rowForType(type) };
      }),
    })),

    removeCabinet: (id) => {
      const { project, activeCabinetId } = get();
      if (!project) return;
      const idx = project.cabinets.findIndex((c) => c.id === id);
      const cabinets = project.cabinets.filter((c) => c.id !== id);
      const nextActive = activeCabinetId === id ? (cabinets[Math.max(0, idx - 1)]?.id ?? null) : activeCabinetId;
      set({ project: { ...project, cabinets }, activeCabinetId: nextActive });
    },

    duplicateCabinet: (id) => {
      const { project } = get();
      if (!project) return null;
      const src = project.cabinets.find((c) => c.id === id);
      if (!src) return null;
      const copy: ProjectCabinet = {
        ...src,
        id: uid(),
        code: nextCabinetCode(project.cabinets.map((c) => c.code)),
        drawerRatios: [...src.drawerRatios],
        ...(src.groupId ? { x: (src.x ?? 0) + src.width, shareLeft: false } : {}),
      };
      const idx = project.cabinets.findIndex((c) => c.id === id);
      const cabinets = [...project.cabinets];
      cabinets.splice(idx + 1, 0, copy);
      set({ project: { ...project, cabinets }, activeCabinetId: copy.id });
      return copy.id;
    },

    moveCabinet: (id, direction) => mutate((p) => {
      const idx = p.cabinets.findIndex((c) => c.id === id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= p.cabinets.length) return p;
      const cabinets = [...p.cabinets];
      [cabinets[idx], cabinets[target]] = [cabinets[target], cabinets[idx]];
      return { ...p, cabinets };
    }),

    applyWallPlan: (wallId, modules, opts) => {
      const { project } = get();
      if (!project) return 0;
      let cabinets = opts.replace ? project.cabinets.filter((c) => c.wallId !== wallId) : [...project.cabinets];
      const added: ProjectCabinet[] = [];
      const codes = () => [...cabinets, ...added].map((c) => c.code);

      const rows: Array<'base' | 'wall'> = opts.includeUpper ? ['base', 'wall'] : ['base'];
      for (const row of rows) {
        for (const m of modules) {
          if (m.type === 'appliance') continue;
          const type: CabinetType = m.type === 'filler' ? 'filler' : row === 'wall' ? 'wall' : 'base';
          const cab = createProjectCabinet({ id: uid(), type, width: m.width, code: nextCabinetCode(codes()), wallId, x: m.x });
          cab.jobId = jobOfWall(project, wallId);
          if (row === 'wall' && type === 'filler') {
            cab.depth = 330;
            cab.row = 'wall';
          }
          added.push(cab);
        }
      }
      cabinets = [...cabinets, ...added];
      set({ project: { ...project, cabinets }, activeCabinetId: added[0]?.id ?? get().activeCabinetId });
      return added.length;
    },

    addComposition: (name) => {
      const { project } = get();
      if (!project) return null;
      const id = uid();
      const jobId = get().activeJobId;
      const n = name ?? `Çizim ${project.compositions.filter((c) => c.jobId === jobId).length + 1}`;
      const comp: Composition = { id, name: n, jobId };
      set({ project: { ...project, compositions: [...project.compositions, comp] }, activeCompositionId: id });
      return id;
    },

    renameComposition: (id, name) => mutate((p) => ({
      ...p,
      compositions: p.compositions.map((c) => (c.id === id ? { ...c, name } : c)),
    })),

    removeComposition: (id) => {
      const { project, activeCompositionId, activeCabinetId } = get();
      if (!project) return;
      const compositions = project.compositions.filter((c) => c.id !== id);
      const cabinets = project.cabinets.filter((c) => c.groupId !== id);
      set({
        project: { ...project, compositions, cabinets },
        activeCompositionId: activeCompositionId === id ? (compositions[0]?.id ?? null) : activeCompositionId,
        activeCabinetId: cabinets.some((c) => c.id === activeCabinetId) ? activeCabinetId : (cabinets[0]?.id ?? null),
      });
    },

    setActiveComposition: (id) => set({ activeCompositionId: id }),

    addBox: (groupId, box, content) => {
      const { project } = get();
      if (!project) return null;
      const id = uid();
      const base = createProjectCabinet({ id, type: 'custom', width: box.width, code: nextCabinetCode(project.cabinets.map((c) => c.code)) });
      const cab = applyBoxContent({
        ...base,
        height: box.height,
        depth: box.depth,
        groupId,
        x: box.x,
        elevation: box.elevation,
        doorHingeSide: 'both' as const,
        jobId: jobOfComposition(project, groupId),
      }, content);
      cab.name = `${boxContentLabel(content)} ${box.width}`;
      set({ project: { ...project, cabinets: [...project.cabinets, withInterior(cab)] }, activeCabinetId: id });
      return id;
    },

    setBoxGeometry: (id, geom) => mutate((p) => ({
      ...p,
      cabinets: p.cabinets.map((c) => {
        if (c.id !== id) return c;
        const content = detectBoxContent(c);
        const resized = { ...c, ...geom };
        const sizeChanged = (geom.height !== undefined && geom.height !== c.height) || (geom.width !== undefined && geom.width !== c.width);
        if (!sizeChanged) return resized;
        const next = applyBoxContent(resized, content);
        // Elle verilmiş ad korunur; otomatik ad yeni genişliği alır
        if (c.name === `${boxContentLabel(content)} ${c.width}`) next.name = `${boxContentLabel(content)} ${next.width}`;
        return next;
      }),
    })),

    setBoxContent: (id, content) => mutate((p) => ({
      ...p,
      cabinets: p.cabinets.map((c) => {
        if (c.id !== id) return c;
        const prev = detectBoxContent(c);
        const next = withInterior(applyBoxContent(c, content));
        if (c.name === `${boxContentLabel(prev)} ${c.width}`) next.name = `${boxContentLabel(content)} ${c.width}`;
        return next;
      }),
    })),

    applyTemplate: (groupId, templateId) => {
      const tpl = COMPOSITION_TEMPLATES.find((t) => t.id === templateId);
      const { project } = get();
      if (!tpl || !project) return 0;
      let cabinets = project.cabinets.filter((c) => c.groupId !== groupId);
      const added = [];
      for (const b of tpl.boxes) {
        const id = uid();
        const base = createProjectCabinet({ id, type: 'custom', width: b.width, code: nextCabinetCode([...cabinets, ...added].map((c) => c.code)) });
        const cab = applyBoxContent({
          ...base, height: b.height, depth: b.depth, groupId, x: b.x, elevation: b.elevation,
          plinthHeight: b.plinthHeight ?? 0, shareLeft: Boolean(b.shareLeft), shareBottom: Boolean(b.shareBottom),
          doorHingeSide: 'both' as const, jobId: jobOfComposition(project, groupId),
        }, b.content);
        cab.legHeight = b.legHeight ?? 0;
        if (b.inset) cab.doorOverlayType = 'inset';
        cab.interior = b.interior ? b.interior() : interiorFromCabinet(cab);
        cab.name = `${boxContentLabel(b.content)} ${b.width}`;
        added.push(cab);
      }
      cabinets = [...cabinets, ...added];
      set({ project: { ...project, cabinets }, activeCabinetId: added[0]?.id ?? null });
      return added.length;
    },

    createFittedComposition: (wallId, boxes, fit, replaceId) => {
      const { project } = get();
      if (!project) return null;
      const wall = project.spaces.flatMap((s) => s.walls).find((w) => w.id === wallId);
      if (!wall) return null;
      const existing = replaceId ? project.compositions.find((c) => c.id === replaceId) : undefined;
      const id = existing?.id ?? uid();
      const jobId = existing?.jobId ?? jobOfWall(project, wallId);
      let cabinets = project.cabinets.filter((c) => c.groupId !== id);
      const added: ProjectCabinet[] = [];
      for (const b of boxes) {
        const cid = uid();
        const code = nextCabinetCode([...cabinets, ...added].map((c) => c.code));
        if (b.kind === 'filler') {
          const base = createProjectCabinet({ id: cid, type: 'filler', width: b.width, code });
          added.push({ ...base, height: b.height, depth: b.depth, groupId: id, x: b.x, elevation: b.elevation, backOffset: b.backOffset, name: `Dolgu ${b.width}`, jobId });
          continue;
        }
        const content = fitBoxContent(b);
        const base = createProjectCabinet({ id: cid, type: 'custom', width: b.width, code });
        const cab = applyBoxContent({
          ...base, height: b.height, depth: b.depth, groupId: id, x: b.x, elevation: b.elevation,
          backOffset: b.backOffset, doorHingeSide: 'both' as const, jobId,
        }, content);
        cab.name = `${boxContentLabel(content)} ${b.width}${b.backOffset > 0 ? ' (sığ)' : ''}`;
        added.push(withInterior(cab));
      }
      cabinets = [...cabinets, ...added];
      const comp: Composition = { id, name: existing?.name ?? `${wall.name} dolabı`, wallId, fit, jobId };
      const compositions = existing
        ? project.compositions.map((c) => (c.id === id ? comp : c))
        : [...project.compositions, comp];
      set({ project: { ...project, cabinets, compositions }, activeCompositionId: id, activeCabinetId: added[0]?.id ?? null });
      return id;
    },

    setSharingForGroup: (groupId, on) => mutate((p) => {
      const group = p.cabinets.filter((c) => c.groupId === groupId);
      return {
        ...p,
        cabinets: p.cabinets.map((c) => {
          if (c.groupId !== groupId) return c;
          if (!on) return { ...c, shareLeft: false, shareBottom: false };
          const check = checkSharing(c, group);
          return { ...c, shareLeft: check.left.possible, shareBottom: check.bottom.possible };
        }),
      };
    }),

    getActiveSpace: () => {
      const { project, activeSpaceId } = get();
      return project?.spaces.find((s) => s.id === activeSpaceId);
    },

    getActiveWall: () => {
      const { project, activeWallId } = get();
      if (!project || !activeWallId) return undefined;
      for (const space of project.spaces) {
        const wall = space.walls.find((w) => w.id === activeWallId);
        if (wall) return wall;
      }
      return undefined;
    },

    getActiveCabinet: () => {
      const { project, activeCabinetId } = get();
      return project?.cabinets.find((c) => c.id === activeCabinetId);
    },
  };
});

/** Aktif dolabı döndürür; seçili dolap yoksa ilk dolabı. */
export function useActiveCabinet(): ProjectCabinet | undefined {
  return useProjectStore((s) => {
    const inJob = (c: ProjectCabinet) => !s.activeJobId || c.jobId === s.activeJobId;
    const active = s.project?.cabinets.find((c) => c.id === s.activeCabinetId);
    return active && inJob(active) ? active : s.project?.cabinets.find(inJob);
  });
}

/** Açık iş. */
export function useActiveJob() {
  return useProjectStore((s) => s.project?.jobs.find((j) => j.id === s.activeJobId) ?? s.project?.jobs[0]);
}

/** Açık işin seçili duvarı; seçili duvar başka işteyse işin ilk duvarı. */
export function useActiveWall(): Wall | undefined {
  return useProjectStore((s) => {
    if (!s.project) return undefined;
    const spaces = s.project.spaces.filter((x) => !s.activeJobId || x.jobId === s.activeJobId);
    for (const space of spaces) {
      const wall = space.walls.find((w) => w.id === s.activeWallId);
      if (wall) return wall;
    }
    return spaces.find((x) => x.walls.length > 0)?.walls[0];
  });
}
