export interface MaterialPreset {
  id: string;
  name: string;
  type: 'chipboard' | 'mdf' | 'hdf' | 'plywood' | 'acrylic' | 'solid';
  thickness: number;
  sheetWidth: number;
  sheetHeight: number;
  hasGrain: boolean;
  elasticModulus: number; // MPa
  density: number; // kg/m³
  pricePerM2: number;
  color?: string;
  brand?: string;
  catalogVerified: boolean;
}

export interface EdgeBandPreset {
  id: string;
  name: string;
  thickness: number;
  width: number;
  pricePerMeter: number;
  color?: string;
  matchesMaterialId?: string;
}

export interface EdgeBandDeductionPreset {
  thresholdMm: number; // default 0.8
}
