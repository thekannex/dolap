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
  /** Projedeki işler: mutfak, duvar dolabı (kiler, gömme gardırop), bağımsız ünite. */
  jobs: Job[];
}

/** İşin türü; hangi adımların (sayfaların) açılacağını belirler. */
export type JobKind = 'kitchen' | 'built_in' | 'furniture';

export interface Job {
  id: string;
  name: string;
  kind: JobKind;
}

export interface Composition {
  id: string;
  name: string;
  /** Bağlı olduğu iş. */
  jobId?: string | null;
  /** Duvara oturtulmuş dolapsa o duvar; kutuların x'i duvarın solundan ölçülür. */
  wallId?: string | null;
  /** Duvar şekline göre üretildiyse çizilen alan ve seçenekler (yeniden üretmek için). */
  fit?: { region: { x: number; y: number; width: number; height: number; depth: number }; topHeight: number; maxModule: number } | null;
}

export interface Space {
  id: string;
  name: string;
  /** Bağlı olduğu iş. */
  jobId?: string | null;
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
