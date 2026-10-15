import { create } from 'zustand';
import type { Project, Space, Wall, Obstacle } from '../core/models/project';
import type { CabinetType, ProjectCabinet } from '../core/models/cabinet';
import type { PlannedModule } from '../core/layout/module-planner';
import {
  applyTypePreset, createProjectCabinet, nextCabinetCode, CABINET_TYPE_LABELS,
} from '../core/engine/cabinet-factory';
import { createProject, createWall, effectiveWallWidth, normalizeProject } from '../core/project/project-factory';

type ProjectInfo = Pick<Project, 'name' | 'customerName' | 'customerPhone' | 'address' | 'notes'>;

export interface ProjectStore {
  project: Project | null;
  activeSpaceId: string | null;
  activeWallId: string | null;
  activeCabinetId: string | null;

  newProject: (name: string, customerName: string) => void;
  openProject: (project: Project) => void;
  closeProject: () => void;
  updateProjectInfo: (updates: Partial<ProjectInfo>) => void;

  setActiveSpace: (id: string) => void;
  setActiveWall: (id: string) => void;
  setActiveCabinet: (id: string | null) => void;

  addSpace: (name: string, type: string, ceilingHeight: number) => void;
  updateSpace: (id: string, updates: Partial<Space>) => void;
  removeSpace: (id: string) => void;

  addWall: (spaceId: string, name: string) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  removeWall: (id: string) => void;

  addObstacle: (wallId: string, obstacle: Omit<Obstacle, 'id'>) => void;
  updateObstacle: (wallId: string, obstacleId: string, updates: Partial<Obstacle>) => void;
  removeObstacle: (wallId: string, obstacleId: string) => void;

  addCabinet: (type: CabinetType, opts?: { width?: number; wallId?: string | null }) => string | null;
  updateCabinet: (id: string, updates: Partial<ProjectCabinet>) => void;
  changeCabinetType: (id: string, type: CabinetType) => void;
  removeCabinet: (id: string) => void;
  duplicateCabinet: (id: string) => string | null;
  moveCabinet: (id: string, direction: -1 | 1) => void;
  applyWallPlan: (wallId: string, modules: PlannedModule[], opts: { includeUpper: boolean; replace: boolean }) => number;

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

  const mapWalls = (p: Project, fn: (w: Wall) => Wall): Project => ({
    ...p,
    spaces: p.spaces.map((s) => ({ ...s, walls: s.walls.map(fn) })),
  });

  return {
    project: null,
    activeSpaceId: null,
    activeWallId: null,
    activeCabinetId: null,

    newProject: (name, customerName) => {
      const spaceId = uid();
      const wallId = uid();
      const project = createProject({ id: uid(), spaceId, wallId, name, customerName, now: new Date().toISOString() });
      set({ project, activeSpaceId: spaceId, activeWallId: wallId, activeCabinetId: null });
    },

    openProject: (raw) => {
      const project = normalizeProject(raw);
      const firstSpace = project.spaces[0];
      set({
        project,
        activeSpaceId: firstSpace?.id ?? null,
        activeWallId: firstSpace?.walls[0]?.id ?? null,
        activeCabinetId: project.cabinets[0]?.id ?? null,
      });
    },

    closeProject: () => set({ project: null, activeSpaceId: null, activeWallId: null, activeCabinetId: null }),

    updateProjectInfo: (updates) => mutate((p) => ({ ...p, ...updates })),

    setActiveSpace: (id) => set({ activeSpaceId: id }),
    setActiveWall: (id) => set({ activeWallId: id }),
    setActiveCabinet: (id) => set({ activeCabinetId: id }),

    addSpace: (name, type, ceilingHeight) => mutate((p) => ({
      ...p,
      spaces: [...p.spaces, { id: uid(), name, type, ceilingHeight, walls: [] }],
    })),

    updateSpace: (id, updates) => mutate((p) => ({
      ...p,
      spaces: p.spaces.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

    removeSpace: (id) => mutate((p) => {
      const wallIds = new Set(p.spaces.find((s) => s.id === id)?.walls.map((w) => w.id) ?? []);
      return {
        ...p,
        spaces: p.spaces.filter((s) => s.id !== id),
        cabinets: p.cabinets.map((c) => (c.wallId && wallIds.has(c.wallId) ? { ...c, wallId: null } : c)),
      };
    }),

    addWall: (spaceId, name) => mutate((p) => ({
      ...p,
      spaces: p.spaces.map((s) => (s.id === spaceId ? { ...s, walls: [...s.walls, createWall(uid(), spaceId, name)] } : s)),
    })),

    updateWall: (id, updates) => mutate((p) => mapWalls(p, (w) => {
      if (w.id !== id) return w;
      const updated = { ...w, ...updates };
      updated.effectiveWidth = effectiveWallWidth(updated);
      return updated;
    })),

    removeWall: (id) => mutate((p) => ({
      ...p,
      spaces: p.spaces.map((s) => ({ ...s, walls: s.walls.filter((w) => w.id !== id) })),
      cabinets: p.cabinets.map((c) => (c.wallId === id ? { ...c, wallId: null } : c)),
    })),

    addObstacle: (wallId, obstacle) => mutate((p) => mapWalls(p, (w) => (
      w.id === wallId ? { ...w, obstacles: [...w.obstacles, { ...obstacle, id: uid(), wallId }] } : w
    ))),

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
      const cabinet = createProjectCabinet({
        id,
        type,
        width: opts.width ?? (type === 'filler' ? 50 : 600),
        code: nextCabinetCode(project.cabinets.map((c) => c.code)),
        wallId: opts.wallId ?? null,
      });
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
        return { ...c, ...next, row: type === 'wall' || type === 'open_shelf' ? 'wall' : type === 'tall' ? 'tall' : c.row === 'tall' ? 'base' : c.row };
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
  return useProjectStore((s) => s.project?.cabinets.find((c) => c.id === s.activeCabinetId) ?? s.project?.cabinets[0]);
}

export function useActiveWall(): Wall | undefined {
  return useProjectStore((s) => {
    if (!s.project || !s.activeWallId) return undefined;
    for (const space of s.project.spaces) {
      const wall = space.walls.find((w) => w.id === s.activeWallId);
      if (wall) return wall;
    }
    return undefined;
  });
}
