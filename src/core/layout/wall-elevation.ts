import type { CabinetRow, CabinetType, ProjectCabinet } from '../models/cabinet';

export interface WallPlacement {
  cabinetId: string;
  code: string;
  name: string;
  type: CabinetType;
  row: CabinetRow;
  x: number;
  width: number;
  height: number;
  copy: number;
}

/**
 * Bir duvardaki dolapların yatay konumlarını çıkarır.
 * Konumu (x) girilmiş dolaplar oraya, girilmemişler kendi sırasındaki bir önceki dolabın yanına yerleşir.
 * Boy dolaplar alt sırada yer kaplar; üst sıradaki dolaplar boy dolapların üstüne binmez.
 */
export function placeWallCabinets(cabinets: ProjectCabinet[]): WallPlacement[] {
  const out: WallPlacement[] = [];
  const cursor = { base: 0, wall: 0 };
  const tallRanges: Array<[number, number]> = [];

  for (const cab of cabinets) {
    const qty = Math.max(1, Math.floor(cab.quantity || 1));
    const rowKey = cab.row === 'wall' ? 'wall' : 'base';
    for (let copy = 0; copy < qty; copy++) {
      const explicit = copy === 0 && cab.x !== null && cab.x !== undefined;
      let x = explicit ? (cab.x as number) : cursor[rowKey];
      if (rowKey === 'wall' && !explicit) {
        let moved = true;
        while (moved) {
          moved = false;
          for (const [s, e] of tallRanges) {
            if (x < e && x + cab.width > s) { x = e; moved = true; }
          }
        }
      }
      out.push({
        cabinetId: cab.id, code: cab.code, name: cab.name, type: cab.type, row: cab.row,
        x, width: cab.width, height: cab.height, copy,
      });
      cursor[rowKey] = x + cab.width;
      if (cab.row === 'tall') tallRanges.push([x, x + cab.width]);
    }
  }
  return out;
}

/** Dolapların duvar genişliğini aşıp aşmadığını ve üst üste binen dolapları bulur. */
export function checkWallFit(placements: WallPlacement[], wallWidth: number): { overflow: number; overlaps: Array<[string, string]> } {
  const maxEnd = placements.reduce((m, p) => Math.max(m, p.x + p.width), 0);
  const overlaps: Array<[string, string]> = [];
  const sameRow = (a: WallPlacement, b: WallPlacement) =>
    a.row === b.row || a.row === 'tall' || b.row === 'tall';
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i];
      const b = placements[j];
      if (!sameRow(a, b)) continue;
      if (a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5) overlaps.push([a.code, b.code]);
    }
  }
  return { overflow: Math.max(0, maxEnd - wallWidth), overlaps };
}
