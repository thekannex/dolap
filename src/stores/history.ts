import { useSyncExternalStore } from 'react';
import type { Project } from '../core/models/project';
import { UndoHistory } from '../core/utils/undo-history';
import { useProjectStore } from './project-store';

/**
 * Açık projenin geri al / yinele geçmişi.
 * Proje her değiştiğinde önceki hali saklanır; başka proje açılınca geçmiş sıfırlanır.
 */
const history = new UndoHistory<Project>(150, 600);
let applying = false;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach((l) => l()); };

useProjectStore.subscribe((state, prev) => {
  if (applying || state.project === prev.project) return;
  // Proje açıldı, kapandı ya da yenisi oluşturuldu: geçmiş sıfırdan başlar
  if (state.session !== prev.session || !state.project || !prev.project) {
    history.clear();
    emit();
    return;
  }
  history.record(prev.project);
  emit();
});

/** Geri alınan/yinelenen projede artık olmayan seçimleri düzeltir. */
function apply(project: Project) {
  applying = true;
  try {
    const s = useProjectStore.getState();
    const jobOk = project.jobs.some((j) => j.id === s.activeJobId);
    const activeJobId = jobOk ? s.activeJobId : (project.jobs[0]?.id ?? null);
    const walls = project.spaces.filter((x) => x.jobId === activeJobId).flatMap((x) => x.walls);
    useProjectStore.setState({
      project,
      activeJobId,
      activeWallId: walls.some((w) => w.id === s.activeWallId) ? s.activeWallId : (walls[0]?.id ?? null),
      activeCabinetId: project.cabinets.some((c) => c.id === s.activeCabinetId) ? s.activeCabinetId : null,
      activeCompositionId: project.compositions.some((c) => c.id === s.activeCompositionId) ? s.activeCompositionId : null,
    });
  } finally {
    applying = false;
  }
  emit();
}

export function undo(): boolean {
  const current = useProjectStore.getState().project;
  const prev = current ? history.undo(current) : null;
  if (!prev) return false;
  apply(prev);
  return true;
}

export function redo(): boolean {
  const current = useProjectStore.getState().project;
  const next = current ? history.redo(current) : null;
  if (!next) return false;
  apply(next);
  return true;
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Geri al / yinele düğmelerinin durumu. */
export function useHistoryState(): { canUndo: boolean; canRedo: boolean } {
  useSyncExternalStore(subscribe, () => version);
  return { canUndo: history.canUndo, canRedo: history.canRedo };
}
