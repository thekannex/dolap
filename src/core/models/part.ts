import type { CalculationTrace } from './common';

export type PartType =
  | 'side_left' | 'side_right' | 'middle_divider'
  | 'bottom' | 'top' | 'rail_front' | 'rail_back'
  | 'back_panel' | 'fixed_shelf' | 'adjustable_shelf'
  | 'door' | 'drawer_front'
  | 'drawer_side' | 'drawer_bottom' | 'drawer_back'
  | 'plinth' | 'cornice' | 'filler' | 'countertop';

export type GrainDirection = 'length' | 'width' | 'none';

export interface EdgeBandSpec {
  thickness: number;
  materialId: string;
  deducted: boolean;
}

export interface EdgeBanding {
  top: EdgeBandSpec | null;
  bottom: EdgeBandSpec | null;
  left: EdgeBandSpec | null;
  right: EdgeBandSpec | null;
}

export interface Operation {
  type: 'channel' | 'hinge_bore' | 'shelf_pin_holes' | 'confirmat_hole' | 'minifix_hole' | 'custom';
  description: string;
  x?: number;
  y?: number;
  params?: Record<string, number>;
}

export interface Part {
  id: string;
  moduleId: string;
  code: string;
  name: string;
  partType: PartType;
  length: number;
  width: number;
  thickness: number;
  materialId: string;
  grainDirection: GrainDirection;
  edgeBanding: EdgeBanding;
  cutLength: number;
  cutWidth: number;
  calculation: CalculationTrace;
  operations: Operation[];
  quantity: number;
}
