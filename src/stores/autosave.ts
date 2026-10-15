import { create } from 'zustand';
import { useProjectStore } from './project-store';
import { saveProject, loadProject } from '../core/persistence/db';
import type { Project } from '../core/models/project';

const LAST_PROJECT_KEY = 'dolap:lastProjectId';
const DEBOUNCE_MS = 500;

export interface SaveStatusStore {
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  lastSavedAt: string | null;
}

export const useSaveStatus = create<SaveStatusStore>(() => ({ status: 'idle', lastSavedAt: null }));

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: Project | null = null;

function rememberLastProject(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_PROJECT_KEY, id);
    else localStorage.removeItem(LAST_PROJECT_KEY);
  } catch {
    // depolama kapalıysa sorun değil
  }
}

async function flush(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null; }
  const project = pending;
  pending = null;
  if (!project) return;
  useSaveStatus.setState({ status: 'saving' });
  try {
    const now = new Date().toISOString();
    await saveProject({ ...project, updatedAt: now });
    useSaveStatus.setState({ status: 'saved', lastSavedAt: now });
  } catch (err) {
    console.error('Proje kaydedilemedi', err);
    useSaveStatus.setState({ status: 'error' });
  }
}

/** Bekleyen kaydı hemen yazar (proje kapatılırken ya da dışa aktarmadan önce). */
export function saveNow(): Promise<void> {
  return flush();
}

/** Proje değişikliklerini dinler ve IndexedDB'ye gecikmeli olarak yazar. */
export function startAutosave(): () => void {
  const unsub = useProjectStore.subscribe((state, prev) => {
    if (state.project?.id !== prev.project?.id) {
      rememberLastProject(state.project?.id ?? null);
      if (prev.project && pending?.id === prev.project.id) void flush();
    }
    if (!state.project || state.project === prev.project) return;
    pending = state.project;
    useSaveStatus.setState({ status: 'pending' });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void flush(); }, DEBOUNCE_MS);
  });

  const onHide = () => { void flush(); };
  window.addEventListener('beforeunload', onHide);
  document.addEventListener('visibilitychange', onHide);

  return () => {
    unsub();
    window.removeEventListener('beforeunload', onHide);
    document.removeEventListener('visibilitychange', onHide);
  };
}

/** Kayıtlı bir projeyi açar; yalnızca açmak "değişiklik" sayılmaz. */
export function openWithoutSaving(project: Project): void {
  useProjectStore.getState().openProject(project);
  if (timer) { clearTimeout(timer); timer = null; }
  pending = null;
  useSaveStatus.setState({ status: 'saved', lastSavedAt: project.updatedAt ?? null });
}

/** Uygulama açılışında en son çalışılan projeyi yükler. */
export async function restoreLastProject(): Promise<boolean> {
  let id: string | null = null;
  try { id = localStorage.getItem(LAST_PROJECT_KEY); } catch { id = null; }
  if (!id) return false;
  try {
    const project = await loadProject(id);
    if (!project) return false;
    openWithoutSaving(project);
    return true;
  } catch (err) {
    console.error('Son proje yüklenemedi', err);
    return false;
  }
}
