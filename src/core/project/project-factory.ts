import type { Project, Space, Wall } from '../models/project';
import { normalizeCabinet } from '../engine/cabinet-factory';

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

/** Mutfak projesi duvar ölçüsüyle başlar; bağımsız mobilya projesi duvarsız başlar. */
export type ProjectKind = 'kitchen' | 'furniture';

/** Mekândaki duvar adlarına göre kullanılmamış ilk harfi verir: A Duvarı, B Duvarı... */
export function nextWallName(existing: string[]): string {
  for (let i = 0; i < 26; i++) {
    const name = `${String.fromCharCode(65 + i)} Duvarı`;
    if (!existing.includes(name)) return name;
  }
  return `Duvar ${existing.length + 1}`;
}

export function createProject(params: {
  id: string; spaceId: string; wallId: string; name: string; customerName: string; now: string; kind?: ProjectKind;
}): Project {
  const space: Space = {
    id: params.spaceId, name: 'Mutfak', type: 'kitchen', ceilingHeight: 2500,
    walls: [createWall(params.wallId, params.spaceId, 'A Duvarı')],
  };
  const spaces = (params.kind ?? 'kitchen') === 'kitchen' ? [space] : [];
  return {
    id: params.id,
    name: params.name,
    customerName: params.customerName,
    customerPhone: '',
    address: '',
    notes: '',
    createdAt: params.now,
    updatedAt: params.now,
    spaces,
    cabinets: [],
    compositions: [],
  };
}

/** Eski sürüm ya da dışarıdan gelen proje verisini güncel yapıya getirir. */
export function normalizeProject(raw: Partial<Project> & { id: string }, now: string = new Date().toISOString()): Project {
  return {
    name: 'Adsız Proje',
    customerName: '',
    customerPhone: '',
    address: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
    spaces: [],
    compositions: [],
    ...raw,
    cabinets: (raw.cabinets ?? []).map((c) => normalizeCabinet(c)),
  } as Project;
}
