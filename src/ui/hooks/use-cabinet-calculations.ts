import { useMemo } from 'react';
import type { CabinetState } from '../../core/models/cabinet';
import { computeCabinet } from '../../core/engine/compute-cabinet';
import type { ComputedCabinet } from '../../core/engine/compute-cabinet';
import { computeProject } from '../../core/project/project-calc';
import type { ProjectComputation } from '../../core/project/project-calc';
import { useSettingsStore } from '../../stores/settings-store';
import { useProjectStore } from '../../stores/project-store';

export type { ComputedCabinet, ComputedPart, ComputedHardware } from '../../core/engine/compute-cabinet';

export function useCabinetCalculations(cab: CabinetState): ComputedCabinet {
  const settings = useSettingsStore((s) => s.settings);
  return useMemo(() => computeCabinet(cab, {
    sheetWidth: settings.sheetWidth,
    sheetHeight: settings.sheetHeight,
    bodyBand: settings.bodyBand,
    frontBand: settings.frontBand,
  }), [cab, settings.sheetWidth, settings.sheetHeight, settings.bodyBand, settings.frontBand]);
}

/** Açık projenin tamamının hesabı (kesim listesi, plakalar, maliyet). */
export function useProjectComputation(): ProjectComputation | null {
  const cabinets = useProjectStore((s) => s.project?.cabinets);
  const settings = useSettingsStore((s) => s.settings);
  return useMemo(() => (cabinets ? computeProject({ cabinets }, settings) : null), [cabinets, settings]);
}
