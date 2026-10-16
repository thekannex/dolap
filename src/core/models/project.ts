import type { ProjectCabinet } from './cabinet';

export interface Project {
  id: string;
  name: string;
  customerName: string;
  customerPhone: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  spaces: Space[];
  cabinets: ProjectCabinet[];
  /** Serbest çizimle kurulan mobilya kompozisyonları. */
  compositions: Composition[];
}

export interface Composition {
  id: string;
  name: string;
}

export interface Space {
  id: string;
  name: string;
  type: string;
  ceilingHeight: number;
  walls: Wall[];
}

export interface Wall {
  id: string;
  spaceId: string;
  name: string;
  widthLeft: number;
  widthCenter: number;
  widthRight: number;
  heightLeft: number;
  heightCenter: number;
  heightRight: number;
  installGap: number;
  effectiveWidth: number;
  obstacles: Obstacle[];
}

export interface Obstacle {
  id: string;
  wallId: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}
