

export type ApplianceType =
  | 'oven' | 'microwave' | 'dishwasher' | 'fridge'
  | 'hood' | 'cooktop' | 'washer' | 'dryer';

export interface AppliancePreset {
  id: string;
  name: string;
  type: ApplianceType;
  brand: string;
  model: string;
  nichWidth: number;
  nichHeight: number;
  nichDepth: number;
  clearanceTop: number;
  clearanceBottom: number;
  clearanceSides: number;
  catalogVerified: boolean;
}

export interface KitchenDefaultsPreset {
  baseCabinetHeight: number;
  plinthHeight: number;
  countertopThickness: number;
  baseCabinetDepth: number;
  countertopDepth: number;
  countertopOverhang: number;
  wallCabinetHeights: number[];
  wallCabinetDepth: number;
  backsplashHeight: number;
  backsplashRange: [number, number];
  tallCabinetHeights: number[];
  standardWidths: number[];
  dishwasherWidth: number;
  defaultInstallGap: number;
  maxFillerWidth: number;
  defaultRailWidth: number;
}

export interface WorkshopProfile {
  id: string;
  name: string;
  defaultConstructionId: string;
  defaultBodyMaterialId: string;
  defaultBackMaterialId: string;
  defaultDoorMaterialId: string;
  defaultHingeId: string;
  defaultRailId: string;
  edgeBandThreshold: number;
  sawKerf: number;
  edgeTrim: number;
  cuttingDoneBy: 'self' | 'supplier';
  laborCostPerModule?: number;
  laborCostPerM2?: number;
  roundingStep: number;
}
