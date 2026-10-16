import { useMemo } from 'react';
import { useProjectStore } from '../../../stores/project-store';
import type { ProjectCabinet } from '../../../core/models/cabinet';
import { interiorFrameOf } from '../../../core/engine/interior';
import type { InteriorFrame } from '../../../core/engine/interior';
import { compositionComputeOptions } from '../../../core/layout/composition';

/** Kutunun iç düzen çerçevesi; kompozisyonda ortak paneller hesaba katılır. */
export function useInteriorFrame(cab: ProjectCabinet): InteriorFrame {
  const all = useProjectStore((s) => s.project?.cabinets);
  return useMemo(() => interiorFrameOf(cab, cab.groupId && all ? compositionComputeOptions(cab, all) : {}), [cab, all]);
}
