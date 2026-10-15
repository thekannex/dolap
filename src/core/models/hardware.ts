export type HardwareType =
  | 'hinge' | 'slide_rail' | 'undermount_rail' | 'metal_drawer'
  | 'shelf_pin' | 'leg' | 'plinth_clip' | 'handle'
  | 'confirmat' | 'minifix' | 'dowel' | 'cam_bolt'
  | 'soft_close' | 'gas_spring' | 'carousel' | 'other';

export interface HardwareItem {
  id: string;
  moduleId: string;
  type: HardwareType;
  name: string;
  brand?: string;
  catalogRef?: string;
  catalogVerified: boolean;
  quantity: number;
  unitPrice?: number;
  notes?: string;
}

export interface HingePreset {
  id: string;
  name: string;
  brand?: string;
  boreDiameter: number;
  boreDepth: number;
  boreCenterFromEdge: number;
  kDistance: number;
  countTable: HingeCountRule[];
  extraHingeWeightKg: number;
  extraHingeWidthMm: number;
  topBottomInset: number;
  catalogVerified: boolean;
}

export interface HingeCountRule {
  minHeight: number;
  maxHeight: number;
  count: number;
}

export type RailType = 'side_mount' | 'undermount' | 'metal_box';

export interface RailPreset {
  id: string;
  name: string;
  type: RailType;
  brand?: string;
  widthDeduction: number;
  standardLengths: number[];
  boxWidthFormula?: string;
  boxHeightOptions?: number[];
  pricePerPair?: number;
  catalogVerified: boolean;
}
