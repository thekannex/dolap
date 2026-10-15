import type { HingePreset } from '../core/models/hardware';

export const DEFAULT_HINGES: HingePreset[] = [
  {
    id: 'hinge-default',
    name: 'Ø35 Kap Menteşe (Standart)',
    brand: undefined,
    boreDiameter: 35,
    boreDepth: 12,
    boreCenterFromEdge: 21.5,
    kDistance: 4.5,
    countTable: [
      { minHeight: 0, maxHeight: 900, count: 2 },
      { minHeight: 901, maxHeight: 1600, count: 3 },
      { minHeight: 1601, maxHeight: 2000, count: 4 },
      { minHeight: 2001, maxHeight: Infinity, count: 5 },
    ],
    extraHingeWeightKg: 15,
    extraHingeWidthMm: 600,
    topBottomInset: 90,
    catalogVerified: false,
  },
];
