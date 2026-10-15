import type { RailPreset } from '../core/models/hardware';

export const DEFAULT_RAILS: RailPreset[] = [
  {
    id: 'rail-side-mount',
    name: 'Bilyalı Yan Ray (12.7mm)',
    type: 'side_mount',
    brand: undefined,
    widthDeduction: 25.4,
    standardLengths: [250, 300, 350, 400, 450, 500, 550, 600],
    pricePerPair: 0,
    catalogVerified: false,
  },
  {
    id: 'rail-undermount-generic',
    name: 'Gizli Ray (Genel)',
    type: 'undermount',
    brand: undefined,
    widthDeduction: 42,
    standardLengths: [250, 300, 350, 400, 450, 500, 550, 600],
    boxWidthFormula: 'innerWidth - 42',
    pricePerPair: 0,
    catalogVerified: true,
  },
  {
    id: 'rail-metal-box-generic',
    name: 'Metal Çekmece Sistemi (Genel)',
    type: 'metal_box',
    brand: undefined,
    widthDeduction: 46,
    standardLengths: [270, 300, 350, 400, 450, 500, 550, 600],
    boxWidthFormula: 'innerWidth - 46',
    boxHeightOptions: [83, 118, 199, 270],
    pricePerPair: 0,
    catalogVerified: true,
  },
];
