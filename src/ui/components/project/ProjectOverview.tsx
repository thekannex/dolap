import { ArrowLeft, Download, Plus, Trash2, ChevronRight, AlertTriangle } from 'lucide-react';
import { useProjectStore } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';
import { exportProjectJSON } from '../../../core/persistence/json-io';
import { JOB_KINDS, jobContent, jobKindInfo } from '../../../core/project/jobs';
import type { JobKind } from '../../../core/models/project';
import { JOB_ICONS, firstStep } from '../../navigation';
import { formatMoney, safeFileName } from '../../../core/utils/format';
import { useProjectComputation } from '../../hooks/use-cabinet-calculations';
import { saveText } from '../../lib/files';
import { Button, Card, Stat, TextInput } from '../shared/ui';

export default function ProjectOverview() {
  const project = useProjectStore((s) => s.project)!;
  const updateProjectInfo = useProjectStore((s) => s.updateProjectInfo);
  const activeJobId = useProjectStore((s) => s.activeJobId);
  const addJob = useProjectStore((s) => s.addJob);
  const renameJob = useProjectStore((s) => s.renameJob);
  const removeJob = useProjectStore((s) => s.removeJob);
  const setActiveJob = useProjectStore((s) => s.setActiveJob);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const confirm = useUIStore((s) => s.confirm);
  const setNewProjectRequested = useUIStore((s) => s.setNewProjectRequested);
  const computation = useProjectComputation();

  const errorCount = computation?.warnings.filter((w) => w.severity === 'error').length ?? 0;

  const openJob = (id: string, kind: JobKind) => {
    setActiveJob(id);
    setActivePage(firstStep(kind));
  };

  const handleNewProject = () => {
    setNewProjectRequested(true);
    setActivePage('projects');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => setActivePage('projects')}><ArrowLeft size={14} /> Tüm projeler</Button>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveText(exportProjectJSON(project), `${safeFileName(project.name)}.dolap.json`, 'application/json')}>
              <Download size={14} /> Yedek al
            </Button>
            <Button size="sm" variant="primary" onClick={handleNewProject}><Plus size={14} /> Yeni proje</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Dolap" value={computation?.totals.cabinetCount ?? 0} />
          <Stat label="Parça" value={computation?.totals.partCount ?? 0} />
          <Stat label="Plaka" value={computation?.totals.sheetCount ?? 0} />
          <Stat label="Teklif (KDV dahil)" value={formatMoney(computation?.quote.total ?? 0)} tone="accent" />
        </div>

        {errorCount > 0 && (
          <button onClick={() => setActivePage('cut-list')}
            className="flex items-center gap-2 text-sm text-left rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-4 py-2.5 text-[var(--color-error)]">
            <AlertTriangle size={16} /> {errorCount} hata var. Ayrıntılar için Kesim ve Teklif sayfasına bakın.
          </button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card title="Proje bilgileri" className="lg:col-span-1">
            <div className="p-4 flex flex-col gap-3">
              <TextInput label="Proje adı" value={project.name} onChange={(v) => updateProjectInfo({ name: v })} />
              <TextInput label="Müşteri" value={project.customerName} onChange={(v) => updateProjectInfo({ customerName: v })} />
              <TextInput label="Telefon" value={project.customerPhone} onChange={(v) => updateProjectInfo({ customerPhone: v })} />
              <TextInput label="Adres" value={project.address} onChange={(v) => updateProjectInfo({ address: v })} />
              <TextInput label="Notlar (teklife yazılır)" value={project.notes} onChange={(v) => updateProjectInfo({ notes: v })} multiline />
            </div>
          </Card>

          <div className="lg:col-span-2 flex flex-col gap-5">
            <Card title={`İşler (${project.jobs.length})`}>
              {project.jobs.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">Henüz iş yok. Aşağıdan mutfak, duvar dolabı ya da bağımsız ünite ekleyin.</p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {project.jobs.map((job) => {
                    const Icon = JOB_ICONS[job.kind];
                    const content = jobContent(project, job.id);
                    const walls = content.spaces.reduce((n, sp) => n + sp.walls.length, 0);
                    const pieces = content.cabinets.reduce((n, c) => n + Math.max(1, c.quantity), 0);
                    const active = job.id === activeJobId;
                    return (
                      <li key={job.id} className={`flex items-center gap-3 px-4 py-3 ${active ? 'bg-[var(--color-accent)]/5' : ''}`}>
                        <Icon size={22} className="text-[var(--color-accent)] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <input value={job.name} onChange={(e) => renameJob(job.id, e.target.value)} aria-label="İşin adı"
                            className="w-full bg-transparent text-sm font-semibold rounded px-1 -ml-1 hover:bg-[var(--color-bg-input)] focus:bg-[var(--color-bg-input)] focus:outline-none" />
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {jobKindInfo(job.kind).label} · {pieces} dolap
                            {job.kind !== 'furniture' && ` · ${walls} duvar`}
                            {content.compositions.length > 0 && job.kind !== 'kitchen' && ` · ${content.compositions.length} çizim`}
                          </p>
                        </div>
                        <Button size="sm" variant={active ? 'primary' : 'secondary'} onClick={() => openJob(job.id, job.kind)}>
                          Aç <ChevronRight size={13} />
                        </Button>
                        <Button size="sm" variant="danger" aria-label="İşi sil" title="İşi sil" onClick={async () => {
                          if (await confirm({ title: 'İş silinsin mi?', message: `"${job.name}" ve içindeki ${pieces} dolap${walls ? `, ${walls} duvar` : ''} silinecek.`, confirmLabel: 'Sil', danger: true })) removeJob(job.id);
                        }}><Trash2 size={13} /></Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="Yeni iş ekle">
              <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {JOB_KINDS.map(({ value, label, text }) => {
                  const Icon = JOB_ICONS[value];
                  return (
                    <button key={value} onClick={() => { const id = addJob(value); if (id) setActivePage(firstStep(value)); }}
                      className="flex flex-col gap-1.5 items-start text-left rounded-lg border border-[var(--color-border)] p-3 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-colors">
                      <span className="flex items-center gap-2 text-sm font-semibold"><Icon size={18} className="text-[var(--color-accent)]" /> <Plus size={12} className="-ml-1" /> {label}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{text}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
