import type { Composition, Wall } from '../models/project';
import type { ProjectCabinet } from '../models/cabinet';
import { placeWallCabinets } from './wall-elevation';
import { elevationFor } from './scene-layout';
import { protrusionOf } from './wall-fit';
import { wallRange, wallSignature } from './wall-survey';

/**
 * Dolaplar kurulduktan sonra duvar ölçüsü ya da engeller değişti mi, mevcut dolaplar yeni duruma uyuyor mu.
 * Engeller ve ölçüler her zaman sonradan da girilebilir; bu denetim kurulu dolapları yeniden hesaplamayı önerir.
 */

export interface WallConflict {
  cabinetId: string;
  code: string;
  reason: string;
}

/** Mutfak duvarı: öneri uygulandıktan sonra değişti mi, hangi dolaplar engelle çakışıyor ya da sığmıyor. */
export function kitchenWallStatus(wall: Wall, cabinets: ProjectCabinet[]): { changed: boolean; conflicts: WallConflict[] } {
  const onWall = cabinets.filter((c) => c.wallId === wall.id && !c.groupId);
  const changed = Boolean(wall.planSig) && wall.planSig !== wallSignature(wall);
  const range = wallRange(wall);
  const byId = new Map(onWall.map((c) => [c.id, c]));
  const conflicts: WallConflict[] = [];
  for (const p of placeWallCabinets(onWall)) {
    const cab = byId.get(p.cabinetId)!;
    const y0 = elevationFor(cab, range.height);
    const y1 = y0 + cab.height;
    const x0 = p.x;
    const x1 = p.x + p.width;
    for (const o of wall.obstacles) {
      const pr = protrusionOf(o);
      if (pr <= 0 || o.type === 'appliance') continue;
      if (x0 < o.x + o.width - 0.5 && x1 > o.x + 0.5 && y0 < o.y + o.height - 0.5 && y1 > o.y + 0.5) {
        conflicts.push({ cabinetId: cab.id, code: cab.code, reason: `engelle çakışıyor (${o.type === 'window' ? 'pencere' : o.type === 'door' ? 'kapı' : 'duvar çıkıntısı'})` });
        break;
      }
    }
    if (x1 > range.x1 + 1) conflicts.push({ cabinetId: cab.id, code: cab.code, reason: `duvarın kullanılabilir genişliğini ${Math.round(x1 - range.x1)} mm aşıyor` });
    else if (x0 < range.x0 - 1) conflicts.push({ cabinetId: cab.id, code: cab.code, reason: `yan duvara ${Math.round(range.x0 - x0)} mm taşıyor` });
    if (y1 > range.height + 1) conflicts.push({ cabinetId: cab.id, code: cab.code, reason: `tavana ${Math.round(y1 - range.height)} mm taşıyor` });
  }
  return { changed, conflicts };
}

/** Duvara oturtulmuş dolap: kurulduktan sonra duvar değişti mi. */
export function fittedChanged(comp: Composition, wall: Wall | undefined): boolean {
  return Boolean(wall && comp.fit?.wallSig) && comp.fit!.wallSig !== wallSignature(wall!);
}
