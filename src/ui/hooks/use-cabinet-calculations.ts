import { useMemo } from 'react';
import type { CabinetState, ProjectCabinet } from '../../core/models/cabinet';
import { compositionComputeOptions } from '../../core/layout/composition';
import { computeCabinet } from '../../core/engine/compute-cabinet';
import type { ComputedCabinet } from '../../core/engine/compute-cabinet';
import { computeProject } from '../../core/project/project-calc';
import type { ProjectComputation } from '../../core/project/project-calc';
import { useSettingsStore } from '../../stores/settings-store';
import { useProjectStore } from '../../stores/project-store';

export type { ComputedCabinet, ComputedPart, ComputedHardware } from '../../core/engine/compute-cabinet';

export function useCabinetCalculations(cab: CabinetState | ProjectCabinet): ComputedCabinet {
  const settings = useSettingsStore((s) => s.settings);
  // Kompozisyondaki kutular için ortak panel ve yükseklik bilgisi komşulara bağlıdır
  const all = useProjectStore((s) => ('groupId' in cab && cab.groupId ? s.project?.cabinets : undefined));
  return useMemo(() => computeCabinet(cab, {
    sheetWidth: settings.sheetWidth,
    sheetHeight: settings.sheetHeight,
    bodyBand: settings.bodyBand,
    frontBand: settings.frontBand,
    ...('groupId' in cab && all ? compositionComputeOptions(cab, all) : {}),
  }), [cab, all, settings.sheetWidth, settings.sheetHeight, settings.bodyBand, settings.frontBand]);
}

/** Açık projenin tamamının hesabı (kesim listesi, plakalar, maliyet). */
export function useProjectComputation(): ProjectComputation | null {
  const cabinets = useProjectStore((s) => s.project?.cabinets);
  const spaces = useProjectStore((s) => s.project?.spaces);
  const settings = useSettingsStore((s) => s.settings);
  return useMemo(() => (cabinets ? computeProject({ cabinets, spaces }, settings) : null), [cabinets, spaces, settings]);
}
