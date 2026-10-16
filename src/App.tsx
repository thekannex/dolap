import { useEffect, useState } from 'react';
import { FolderOpen, MapPin, PenTool, Table2, Box, Settings, Check, Loader2, AlertCircle, Shapes } from 'lucide-react';
import { useUIStore } from './stores/ui-store';
import type { PageId } from './stores/ui-store';
import { useProjectStore } from './stores/project-store';
import { useSaveStatus, startAutosave, restoreLastProject } from './stores/autosave';
import { formatDateTime } from './core/utils/format';
import ProjectPage from './ui/components/project/ProjectPage';
import WallLayoutPage from './ui/components/wall-layout/WallLayoutPage';
import EditorPage from './ui/components/cabinet-editor/EditorPage';
import CutListPage from './ui/components/cut-list/CutListPage';
import Cabinet3DView from './ui/components/cabinet-3d/Cabinet3DView';
import SettingsPage from './ui/components/settings/SettingsPage';
import ComposerPage from './ui/components/composer/ComposerPage';
import { Toasts, ConfirmDialog, ErrorBoundary } from './ui/components/shared/Overlays';

const PAGES: Array<{ id: PageId; label: string; icon: typeof FolderOpen; needsProject: boolean }> = [
  { id: 'project', label: 'Proje', icon: FolderOpen, needsProject: false },
  { id: 'wall-layout', label: 'Duvar Yerleşimi', icon: MapPin, needsProject: true },
  { id: 'composer', label: 'Serbest Çizim', icon: Shapes, needsProject: true },
  { id: 'editor', label: 'Dolaplar', icon: PenTool, needsProject: true },
  { id: 'cut-list', label: 'Kesim ve Teklif', icon: Table2, needsProject: true },
  { id: '3d-preview', label: '3D', icon: Box, needsProject: true },
];

function SaveIndicator() {
  const { status, lastSavedAt } = useSaveStatus();
  if (status === 'idle') return null;
  if (status === 'error') {
    return <span className="flex items-center gap-1 text-xs text-[var(--color-error)]"><AlertCircle size={13} /> Kaydedilemedi</span>;
  }
  if (status === 'pending' || status === 'saving') {
    return <span className="flex items-center gap-1 text-xs text-[var(--color-text-dim)]"><Loader2 size={13} className="animate-spin" /> Kaydediliyor</span>;
  }
  return (
    <span className="flex items-center gap-1 text-xs text-[var(--color-text-dim)]" title={lastSavedAt ? `Son kayıt: ${formatDateTime(lastSavedAt)}` : undefined}>
      <Check size={13} className="text-[var(--color-success)]" /> Kaydedildi
    </span>
  );
}

export default function App() {
  const activePage = useUIStore((s) => s.activePage);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const projectName = useProjectStore((s) => s.project?.name);
  const hasProject = projectName !== undefined;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stop = startAutosave();
    restoreLastProject().finally(() => setReady(true));
    return stop;
  }, []);

  // Proje kapanınca proje gerektiren sayfalardan çık
  const page: PageId = !hasProject && PAGES.find((p) => p.id === activePage)?.needsProject ? 'project' : activePage;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <header className="h-12 shrink-0 flex items-center gap-4 px-4 border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <div className="flex items-center gap-2 min-w-0">
          <img src="./favicon.svg" alt="" className="w-6 h-6" />
          <span className="text-sm font-bold tracking-widest text-[var(--color-accent)]">DOLAP</span>
          {projectName && (
            <span className="text-sm text-[var(--color-text-muted)] truncate max-w-56" title={projectName}>/ {projectName}</span>
          )}
        </div>

        <nav className="flex items-center gap-0.5 flex-1">
          {PAGES.map(({ id, label, icon: Icon, needsProject }) => {
            const disabled = needsProject && !hasProject;
            return (
              <button key={id} disabled={disabled} onClick={() => setActivePage(id)}
                title={disabled ? 'Önce bir proje açın' : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  page === id
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-semibold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]/60'
                }`}>
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </nav>

        <SaveIndicator />
        <button onClick={() => setActivePage('settings')} title="Ayarlar ve fiyatlar"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
            page === 'settings' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-semibold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]/60'
          }`}>
          <Settings size={14} /> Ayarlar
        </button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {!ready ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-dim)]">
            <Loader2 size={18} className="animate-spin mr-2" /> Yükleniyor
          </div>
        ) : (
          <ErrorBoundary key={page}>
            {page === 'project' && <ProjectPage />}
            {page === 'wall-layout' && <WallLayoutPage />}
            {page === 'composer' && <ComposerPage />}
            {page === 'editor' && <EditorPage />}
            {page === 'cut-list' && <CutListPage />}
            {page === '3d-preview' && <Cabinet3DView />}
            {page === 'settings' && <SettingsPage />}
          </ErrorBoundary>
        )}
      </main>

      <Toasts />
      <ConfirmDialog />
    </div>
  );
}
