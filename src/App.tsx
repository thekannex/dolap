import { useEffect, useState } from 'react';
import { FolderOpen, Table2, Box, Settings, Check, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { useUIStore } from './stores/ui-store';
import type { PageId } from './stores/ui-store';
import { useProjectStore, useActiveJob } from './stores/project-store';
import { JOB_ICONS, JOB_PAGES, JOB_STEPS, firstStep } from './ui/navigation';
import { jobKindInfo } from './core/project/jobs';
import { useSaveStatus, startAutosave, restoreLastProject } from './stores/autosave';
import { formatDateTime } from './core/utils/format';
import ProjectPage from './ui/components/project/ProjectPage';
import WallLayoutPage from './ui/components/wall-layout/WallLayoutPage';
import EditorPage from './ui/components/cabinet-editor/EditorPage';
import CutListPage from './ui/components/cut-list/CutListPage';
import Cabinet3DView from './ui/components/cabinet-3d/Cabinet3DView';
import SettingsPage from './ui/components/settings/SettingsPage';
import ComposerPage from './ui/components/composer/ComposerPage';
import WallShapePage from './ui/components/wall-layout/WallShapePage';
import { Toasts, ConfirmDialog, ErrorBoundary } from './ui/components/shared/Overlays';

/** Tüm projeye ait sayfalar (işten bağımsız). */
const PROJECT_PAGES: Array<{ id: PageId; label: string; icon: typeof FolderOpen }> = [
  { id: 'cut-list', label: 'Kesim ve Teklif', icon: Table2 },
  { id: '3d-preview', label: '3D', icon: Box },
];

const navCls = (on: boolean) => `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${
  on ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-semibold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]/60'
}`;

/** Açık işi değiştiren seçici: işin türü simgesiyle. */
function JobSwitcher({ page }: { page: PageId }) {
  const jobs = useProjectStore((s) => s.project?.jobs ?? []);
  const job = useActiveJob();
  const setActiveJob = useProjectStore((s) => s.setActiveJob);
  const setActivePage = useUIStore((s) => s.setActivePage);
  if (!job) return null;
  const Icon = JOB_ICONS[job.kind];
  return (
    <label className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-input)] pl-2 pr-1 py-0.5" title={jobKindInfo(job.kind).label}>
      <Icon size={14} className="text-[var(--color-accent)] shrink-0" />
      <select value={job.id} aria-label="Açık iş"
        onChange={(e) => {
          const next = jobs.find((j) => j.id === e.target.value);
          if (!next) return;
          setActiveJob(next.id);
          // İşe bağlı bir sayfadaysak yeni işin aynı adımına (yoksa ilk adımına) geç
          if (JOB_PAGES.has(page)) setActivePage(JOB_STEPS[next.kind].some((s) => s.id === page) ? page : firstStep(next.kind));
        }}
        className="bg-transparent text-xs font-semibold max-w-40 truncate focus:outline-none cursor-pointer">
        {jobs.map((j) => <option key={j.id} value={j.id}>{j.name} · {jobKindInfo(j.kind).label}</option>)}
      </select>
    </label>
  );
}

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
  const job = useActiveJob();
  const steps = job ? JOB_STEPS[job.kind] : [];
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stop = startAutosave();
    restoreLastProject().finally(() => setReady(true));
    return stop;
  }, []);

  // Proje kapanınca proje sayfasına; açık işin adımı olmayan sayfadan işin ilk adımına
  let page: PageId = activePage;
  if (!hasProject && page !== 'settings') page = 'project';
  else if (JOB_PAGES.has(page) && !steps.some((s) => s.id === page)) page = job ? firstStep(job.kind) : 'project';

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

        <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
          <button onClick={() => setActivePage('project')} className={navCls(page === 'project')}>
            <FolderOpen size={14} /> Proje
          </button>
          {hasProject && job && (
            <>
              <ChevronRight size={14} className="text-[var(--color-text-dim)] shrink-0" />
              <JobSwitcher page={page} />
              {steps.map(({ id, label, icon: Icon, hint }, i) => (
                <button key={id} onClick={() => setActivePage(id)} title={hint} className={navCls(page === id)}>
                  <span className={`w-4 h-4 rounded-full text-[10px] leading-4 text-center font-bold ${page === id ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'}`}>{i + 1}</span>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </>
          )}
          {hasProject && (
            <>
              <span className="w-px h-5 bg-[var(--color-border)] mx-1 shrink-0" />
              {PROJECT_PAGES.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActivePage(id)} className={navCls(page === id)} title="Tüm proje">
                  <Icon size={14} /> {label}
                </button>
              ))}
            </>
          )}
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
          <ErrorBoundary key={`${page}-${job?.id ?? ""}`}>
            {page === 'project' && <ProjectPage />}
            {page === 'wall-layout' && <WallLayoutPage />}
            {page === 'wall-shape' && <WallShapePage />}
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
