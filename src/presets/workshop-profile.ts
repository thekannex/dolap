import type { WorkshopProfile } from '../core/models/presets';

export const DEFAULT_WORKSHOP_PROFILE: WorkshopProfile = {
  id: 'ws-default',
  name: 'Varsayılan Atölye',
  defaultConstructionId: 'const-standard',
  defaultBodyMaterialId: 'mat-chipboard-18',
  defaultBackMaterialId: 'mat-mdf-8',
  defaultDoorMaterialId: 'mat-chipboard-18',
  defaultHingeId: 'hinge-default',
  defaultRailId: 'rail-side-mount',
  edgeBandThreshold: 0.8,
  sawKerf: 4,
  edgeTrim: 10,
  cuttingDoneBy: 'supplier',
  laborCostPerModule: undefined,
  laborCostPerM2: undefined,
  roundingStep: 0.5,
};
