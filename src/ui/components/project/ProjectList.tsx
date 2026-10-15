import { useCallback, useEffect, useState } from 'react';
import { Plus, Upload, FolderOpen, Copy, Download, Trash2, Ruler } from 'lucide-react';
import { listProjects, saveProject, deleteProject } from '../../../core/persistence/db';
import type { SavedProject } from '../../../core/persistence/db';
import { exportProjectJSON, importProjectJSON } from '../../../core/persistence/json-io';
import { normalizeProject } from '../../../core/project/project-factory';
import { formatDateTime, safeFileName } from '../../../core/utils/format';
import { useProjectStore } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';
import { openWithoutSaving } from '../../../stores/autosave';
import { pickTextFile, saveText } from '../../lib/files';
import { Button, Card, TextInput } from '../shared/ui';

function NewProjectForm({ onCancel }: { onCancel?: () => void }) {
  const newProject = useProjectStore((s) => s.newProject);
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');

  return (
    <Card title="Yeni proje">
      <form className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) newProject(name.trim(), customer.trim()); }}>
        <TextInput label="Proje adı" value={name} onChange={setName} placeholder="Örn: Yılmaz Mutfak" />
        <TextInput label="Müşteri" value={customer} onChange={setCustomer} placeholder="Örn: Ayşe Yılmaz" />
        <div className="sm:col-span-2 flex justify-end gap-2">
          {onCancel && <Button onClick={onCancel}>Vazgeç</Button>}
          <Button type="submit" variant="primary" disabled={!name.trim()}><Plus size={15} /> Projeyi oluştur</Button>
        </div>
      </form>
    </Card>
  );
}

export default function ProjectList() {
  const notify = useUIStore((s) => s.notify);
  const confirm = useUIStore((s) => s.confirm);
  const [projects, setProjects] = useState<SavedProject[] | null>(null);
  const [showNew, setShowNew] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setProjects(await listProjects());
    } catch (err) {
      console.error(err);
      setProjects([]);
      notify('error', 'Kayıtlı projeler okunamadı.');
    }
  }, [notify]);

  // IndexedDB dış bir kaynak; liste açılışta oradan okunur.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);

  const handleImport = async () => {
    try {
      const text = await pickTextFile('.json,application/json');
      if (!text) return;
      let { project } = importProjectJSON(text);
      if (projects?.some((p) => p.id === project.id)) {
        project = { ...project, id: crypto.randomUUID(), name: `${project.name} (içe aktarılan)` };
      }
      await saveProject(project);
      openWithoutSaving(project);
      notify('success', `"${project.name}" içe aktarıldı.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Dosya içe aktarılamadı.');
    }
  };

  const handleDuplicate = async (sp: SavedProject) => {
    const now = new Date().toISOString();
    const copy = normalizeProject({ ...sp.data, id: crypto.randomUUID(), name: `${sp.data.name} (kopya)`, createdAt: now, updatedAt: now });
    await saveProject(copy);
    notify('success', 'Proje çoğaltıldı.');
    void refresh();
  };

  const handleDelete = async (sp: SavedProject) => {
    const ok = await confirm({
      title: 'Proje silinsin mi?',
      message: `"${sp.data.name}" kalıcı olarak silinecek. Önce yedek almak isteyebilirsiniz.`,
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    await deleteProject(sp.id);
    notify('info', 'Proje silindi.');
    void refresh();
  };

  const empty = projects !== null && projects.length === 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text)]">Projeler</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Projeler bu bilgisayarda otomatik kaydedilir.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleImport}><Upload size={15} /> Yedekten aç</Button>
            {!empty && <Button variant="primary" onClick={() => setShowNew(true)}><Plus size={15} /> Yeni proje</Button>}
          </div>
        </div>

        {empty && (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 flex gap-4 items-start">
            <Ruler size={28} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--color-text-muted)] space-y-1">
              <p className="font-semibold text-[var(--color-text)]">Başlamak için bir proje oluşturun</p>
              <p>1. Duvar ölçülerini girin, program dolapları otomatik yerleştirsin.</p>
              <p>2. Dolapları tek tek düzenleyin (kapak, raf, çekmece).</p>
              <p>3. Kesim listesi, plaka planı ve müşteri teklifini PDF/Excel olarak alın.</p>
            </div>
          </div>
        )}

        {(showNew || empty) && <NewProjectForm onCancel={empty ? undefined : () => setShowNew(false)} />}

        {projects && projects.length > 0 && (
          <Card>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-[var(--color-text-dim)] bg-[var(--color-bg)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Proje</th>
                  <th className="text-left px-4 py-2 font-medium">Müşteri</th>
                  <th className="text-center px-4 py-2 font-medium">Dolap</th>
                  <th className="text-left px-4 py-2 font-medium">Son değişiklik</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {projects.map((sp) => (
                  <tr key={sp.id} className="hover:bg-[var(--color-bg-hover)]/40 group">
                    <td className="px-4 py-2.5">
                      <button className="font-medium text-[var(--color-text)] hover:text-[var(--color-accent)] text-left" onClick={() => openWithoutSaving(sp.data)}>
                        {sp.data.name}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{sp.data.customerName || '—'}</td>
                    <td className="px-4 py-2.5 text-center font-mono">{sp.data.cabinets?.length ?? 0}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)] text-xs">{formatDateTime(sp.savedAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="primary" onClick={() => openWithoutSaving(sp.data)}><FolderOpen size={13} /> Aç</Button>
                        <Button size="sm" variant="ghost" title="Çoğalt" aria-label="Çoğalt" onClick={() => handleDuplicate(sp)}><Copy size={13} /></Button>
                        <Button size="sm" variant="ghost" title="Yedek al (.dolap.json)" aria-label="Yedek al"
                          onClick={() => saveText(exportProjectJSON(sp.data), `${safeFileName(sp.data.name)}.dolap.json`, 'application/json')}>
                          <Download size={13} />
                        </Button>
                        <Button size="sm" variant="danger" title="Sil" aria-label="Sil" onClick={() => handleDelete(sp)}><Trash2 size={13} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
