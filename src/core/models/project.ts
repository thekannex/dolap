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
  fit?: { region: { x: number; y: number; width: number; height: number; depth: number }; topHeight: number; maxModule: number; wallSig?: string } | null;
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
  /** Ayrıntılı (düzensiz duvar) ölçüsü; varsa genişlik ve yükseklik alanları bundan hesaplanır. */
  survey?: WallSurvey | null;
  /** Otomatik yerleşim uygulandığında duvarın ölçü izi (sonradan değişti mi anlamak için). */
  planSig?: string | null;
}

/** Duvar boyunca bir ölçü noktası: x sol köşeden (mm), v ölçülen değer (mm). */
export interface SurveyPoint {
  x: number;
  v: number;
}

export interface WallSurvey {
  /** Köşeden köşeye duvar boyu, zemin hizasında. */
  length: number;
  /** Yan duvarın şakul sapması: tavana doğru dolap alanına kaçıklık (+ içeri, − dışarı). */
  leftLean: number;
  rightLean: number;
  /** Köşe açısı (üstten bakış, derece): 90 dik; küçükse yan duvar odaya doğru içeri kapanır. */
  leftAngle: number;
  rightAngle: number;
  /** Tavan yüksekliği (o noktada yerden). */
  ceiling: SurveyPoint[];
  /** Zemin seviye farkı (sol köşeye göre, + yüksek). */
  floor: SurveyPoint[];
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
