import type { CabinetType, ProjectCabinet } from '../models/cabinet';
import type { Wall } from '../models/project';
import type { SinkNeighbors } from '../engine/sink';
import { placeWallCabinets } from './wall-elevation';

/** Üstüne damlalık taşabilecek alt sıra tipleri (tezgâh altında kalanlar). */
const SUPPORTS_COUNTERTOP: ReadonlySet<CabinetType> = new Set<CabinetType>(['base', 'drawer_base', 'sink', 'filler']);
const TOUCH = 5;

/** Duvardaki bir dolabın sağ ve solunda ne olduğunu bulur (evye taşması için). */
export function findSinkNeighbors(cabinetId: string, wallCabinets: ProjectCabinet[], wall: Wall): SinkNeighbors | null {
  const placements = placeWallCabinets(wallCabinets);
  const self = placements.find((p) => p.cabinetId === cabinetId && p.copy === 0);
  if (!self) return null;
  const typeOf = new Map(wallCabinets.map((c) => [c.id, c.type]));
  const lowRow = placements.filter((p) => p !== self && p.row !== 'wall');

  const side = (edge: number, dir: 'left' | 'right'): SinkNeighbors['left'] => {
    const touching = lowRow.find((p) => Math.abs((dir === 'left' ? p.x + p.width : p.x) - edge) <= TOUCH);
    if (touching) return SUPPORTS_COUNTERTOP.has(typeOf.get(touching.cabinetId)!) ? 'cabinet' : 'blocked';
    const atWallEnd = dir === 'left' ? edge <= TOUCH : edge >= wall.effectiveWidth - TOUCH;
    // Boşluk, cihaz yeri ya da başka bir engel: damlalığı taşıyacak dolap yok
    return atWallEnd ? 'wall_end' : 'blocked';
  };

  return { left: side(self.x, 'left'), right: side(self.x + self.width, 'right') };
}
