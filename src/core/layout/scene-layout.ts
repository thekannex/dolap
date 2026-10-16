import type { CabinetType, ProjectCabinet } from '../models/cabinet';
import type { Project } from '../models/project';
import { placeWallCabinets } from './wall-elevation';

/** Mutfak dolaplarının ayak yüksekliği (mm). */
export const KITCHEN_LEG_HEIGHT = 100;
/** Tezgâh kalınlığı ve dolap önünden taşma payı (mm). */
export const COUNTERTOP_THICKNESS = 40;
export const COUNTERTOP_OVERHANG = 40;
/** Üst dolapların yerden alt kenar yüksekliği (mm). */
export const UPPER_BOTTOM = 1450;

/** Ayak üzerinde duran mutfak tipleri; bağımsız mobilya doğrudan yere (ya da kendi bazasına) basar. */
export const ON_LEGS: ReadonlySet<CabinetType> = new Set<CabinetType>(['base', 'drawer_base', 'sink', 'tall', 'filler']);
/** Üstüne tezgâh gelen tipler. */
export const WITH_COUNTERTOP: ReadonlySet<CabinetType> = new Set<CabinetType>(['base', 'drawer_base', 'sink']);

const WALL_GAP = 800;
const LOOSE_GAP = 150;

/** Dolabın alt kenarının yerden yüksekliği (mm). */
export function elevationFor(cab: Pick<ProjectCabinet, 'type' | 'row' | 'height' | 'plinthHeight'>, wallHeight = 2500): number {
  if (cab.row === 'wall') return Math.max(0, Math.min(UPPER_BOTTOM, wallHeight - cab.height));
  if (ON_LEGS.has(cab.type) && !(cab.plinthHeight > 0)) return KITCHEN_LEG_HEIGHT;
  return 0;
}

export interface ScenePlacement {
  key: string;
  cabinetId: string;
  /** Sahnenin solundan dolabın sol kenarına (mm). */
  x: number;
  /** Yerden dolabın alt kenarına (mm). */
  elevation: number;
  width: number;
  height: number;
  depth: number;
  countertop: boolean;
}

export interface SceneWall {
  id: string;
  name: string;
  x: number;
  width: number;
  height: number;
}

export interface SceneLayout {
  placements: ScenePlacement[];
  walls: SceneWall[];
  /** Duvara atanmamış dolapların başladığı x (mm); hiç yoksa null. */
  looseStart: number | null;
  width: number;
  height: number;
  depth: number;
}

/**
 * Projenin tüm dolaplarını tek sahneye dizer.
 * Her duvar kendi dolaplarıyla soldan sağa yan yana gelir; duvara atanmamış dolaplar en sağda sıralanır.
 * Dolapların arkası z = 0 düzlemine (duvara) dayanır.
 */
export function layoutScene(project: Pick<Project, 'spaces' | 'cabinets'> & Partial<Pick<Project, 'compositions'>>): SceneLayout {
  const placements: ScenePlacement[] = [];
  const walls: SceneWall[] = [];
  let cursor = 0;

  const push = (cab: ProjectCabinet, x: number, copy: number, wallHeight: number) => {
    placements.push({
      key: `${cab.id}-${copy}`,
      cabinetId: cab.id,
      x,
      elevation: elevationFor(cab, wallHeight),
      width: cab.width,
      height: cab.height,
      depth: cab.depth,
      countertop: WITH_COUNTERTOP.has(cab.type) && cab.row !== 'wall',
    });
  };

  for (const space of project.spaces) {
    for (const wall of space.walls) {
      const onWall = project.cabinets.filter((c) => c.wallId === wall.id);
      const wallHeight = Math.max(wall.heightLeft, wall.heightCenter, wall.heightRight);
      const placed = placeWallCabinets(onWall);
      if (onWall.length === 0) continue;
      const byId = new Map(onWall.map((c) => [c.id, c]));
      for (const p of placed) push(byId.get(p.cabinetId)!, cursor + p.x, p.copy, wallHeight);
      const width = Math.max(wall.effectiveWidth, ...placed.map((p) => p.x + p.width));
      walls.push({ id: wall.id, name: `${space.name} · ${wall.name}`, x: cursor, width, height: wallHeight });
      cursor += width + WALL_GAP;
    }
  }

  // Serbest çizim kompozisyonları: kutular çizildikleri konum ve yükseklikte
  for (const comp of project.compositions ?? []) {
    const boxes = project.cabinets.filter((c) => c.groupId === comp.id);
    if (boxes.length === 0) continue;
    for (const b of boxes) {
      placements.push({
        key: `${b.id}-0`, cabinetId: b.id, x: cursor + (b.x ?? 0), elevation: b.elevation ?? 0,
        width: b.width, height: b.height, depth: b.depth, countertop: false,
      });
    }
    const width = Math.max(...boxes.map((b) => (b.x ?? 0) + b.width));
    const height = Math.max(2500, ...boxes.map((b) => (b.elevation ?? 0) + b.height));
    walls.push({ id: comp.id, name: comp.name, x: cursor, width, height });
    cursor += width + WALL_GAP;
  }

  const wallIds = new Set(project.spaces.flatMap((s) => s.walls.map((w) => w.id)));
  const loose = project.cabinets.filter((c) => !c.groupId && (!c.wallId || !wallIds.has(c.wallId)));
  const looseStart = loose.length > 0 ? cursor : null;
  for (const cab of loose) {
    const qty = Math.max(1, Math.floor(cab.quantity || 1));
    for (let copy = 0; copy < qty; copy++) {
      push(cab, cursor, copy, 2500);
      cursor += cab.width + LOOSE_GAP;
    }
  }

  const width = placements.reduce((m, p) => Math.max(m, p.x + p.width), 0);
  const height = Math.max(
    placements.reduce((m, p) => Math.max(m, p.elevation + p.height + (p.countertop ? COUNTERTOP_THICKNESS : 0)), 0),
    ...walls.map((w) => w.height),
  );
  const depth = placements.reduce((m, p) => Math.max(m, p.depth + (p.countertop ? COUNTERTOP_OVERHANG : 0)), 0);
  return { placements, walls, looseStart, width, height, depth };
}
