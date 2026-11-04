import type { CabinetType, ProjectCabinet } from '../models/cabinet';
import { placeWallCabinets } from './wall-elevation';
import { elevationFor } from './scene-layout';

/**
 * Mutfak duvarının sürüklenebilir çizimi: dolaplar önden görünüşte gerçek yerlerinde (x soldan,
 * y yerden) kutu olarak çizilir. Taşıma ve boyutlandırma sonuçları buradan dolap alanlarına yazılır.
 */

export interface CanvasRect { x: number; y: number; w: number; h: number }

export interface KitchenGhost extends CanvasRect { cabinetId: string; code: string }

/** Duvardaki dolaplar çizim için: x ve elevation mutlak (duvarın solundan / yerden). Adedi 1'den çok dolabın diğer kopyaları ayrı döner. */
export function kitchenCanvas(cabinets: ProjectCabinet[], wallHeight: number): { boxes: ProjectCabinet[]; ghosts: KitchenGhost[] } {
  const byId = new Map(cabinets.map((c) => [c.id, c]));
  const boxes: ProjectCabinet[] = [];
  const ghosts: KitchenGhost[] = [];
  for (const p of placeWallCabinets(cabinets)) {
    const cab = byId.get(p.cabinetId)!;
    const y = elevationFor(cab, wallHeight);
    if (p.copy === 0) boxes.push({ ...cab, x: p.x, elevation: y });
    else ghosts.push({ cabinetId: cab.id, code: cab.code, x: p.x, y, w: p.width, h: p.height });
  }
  return { boxes, ghosts };
}

/** Alt ve boy dolaplar ayakta ya da yerde durur; yalnız üst dolabın yerden yüksekliği değişir. */
export const kitchenYLocked = (cab: Pick<ProjectCabinet, 'row'>) => cab.row !== 'wall';

/**
 * Bir dolabı taşır / boyutlandırır. Konumu boş (sıradakinin yanına dizilen) dolapların x'i önce
 * bugünkü yerine sabitlenir; böylece biri yer değiştirince diğerleri kaymaz.
 * Dönen: dolap → değişecek alanlar.
 */
export function kitchenMove(cabinets: ProjectCabinet[], id: string, rect: CanvasRect): Map<string, Partial<ProjectCabinet>> {
  const out = new Map<string, Partial<ProjectCabinet>>();
  for (const p of placeWallCabinets(cabinets)) {
    const cab = cabinets.find((c) => c.id === p.cabinetId)!;
    if (p.copy === 0 && (cab.x === null || cab.x === undefined)) out.set(cab.id, { x: p.x });
  }
  const cab = cabinets.find((c) => c.id === id);
  if (!cab) return out;
  const patch: Partial<ProjectCabinet> = { x: Math.max(0, Math.round(rect.x)) };
  if (Math.round(rect.w) !== cab.width) patch.width = Math.round(rect.w);
  if (Math.round(rect.h) !== cab.height) patch.height = Math.round(rect.h);
  if (!kitchenYLocked(cab)) patch.elevation = Math.max(0, Math.round(rect.y));
  out.set(id, { ...out.get(id), ...patch });
  return out;
}

/** Boş alana çizilen kutunun mutfak dolabı türü: yüksekte üst dolap, uzunsa boy dolap, değilse alt dolap. */
export function kitchenTypeForRect(rect: CanvasRect): CabinetType {
  if (rect.y >= 1000) return 'wall';
  if (rect.h >= 1400) return 'tall';
  return 'base';
}
