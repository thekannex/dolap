import type { EdgeBandPreset, EdgeBandDeductionPreset } from '../core/models/material';

export const DEFAULT_EDGE_BANDS: EdgeBandPreset[] = [
  { id: 'eb-04', name: '0.4mm PVC Bant', thickness: 0.4, width: 22, pricePerMeter: 0, color: undefined, matchesMaterialId: undefined },
  { id: 'eb-08', name: '0.8mm PVC Bant', thickness: 0.8, width: 22, pricePerMeter: 0, color: undefined, matchesMaterialId: undefined },
  { id: 'eb-1', name: '1mm PVC Bant', thickness: 1, width: 22, pricePerMeter: 0, color: undefined, matchesMaterialId: undefined },
  { id: 'eb-2', name: '2mm PVC Bant', thickness: 2, width: 42, pricePerMeter: 0, color: undefined, matchesMaterialId: undefined },
];

export const DEFAULT_EDGE_BAND_DEDUCTION: EdgeBandDeductionPreset = {
  thresholdMm: 0.8,
};
