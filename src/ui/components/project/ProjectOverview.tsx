import { useState } from 'react';
import { ArrowLeft, Download, Plus, Trash2, MapPin, ChevronRight, Pencil, Copy, AlertTriangle } from 'lucide-react';
import { useProjectStore } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';
import { saveNow } from '../../../stores/autosave';
import { exportProjectJSON } from '../../../core/persistence/json-io';
import { CABINET_TYPE_LABELS } from '../../../core/engine/cabinet-factory';
import { formatMoney, safeFileName } from '../../../core/utils/format';
import { useProjectComputation } from '../../hooks/use-cabinet-calculations';
import { saveText } from '../../lib/files';
import { Button, Card, Stat, TextInput } from '../shared/ui';
import AddCabinetMenu from '../shared/AddCabinetMenu';

export default function ProjectOverview() {
  const project = useProjectStore((s) => s.project)!;
  const updateProjectInfo = useProjectStore((s) => s.updateProjectInfo);
  const closeProject = useProjectStore((s) => s.closeProject);
  const addSpace = useProjectStore((s) => s.addSpace);
  const removeSpace = useProjectStore((s) => s.removeSpace);
  const addWall = useProjectStore((s) => s.addWall);
  const removeWall = useProjectStore((s) => s.removeWall);
  const setActiveSpace = useProjectStore((s) => s.setActiveSpace);
  const setActiveWall = useProjectStore((s) => s.setActiveWall);
  const setActiveCabinet = useProjectStore((s) => s.setActiveCabinet);
  const addCabinet = useProjectStore((s) => s.addCabinet);
  const removeCabinet = useProjectStore((s) => s.removeCabinet);
  const duplicateCabinet = useProjectStore((s) => s.duplicateCabinet);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const confirm = useUIStore((s) => s.confirm);
  const computation = useProjectComputation();

  const [newSpaceName, setNewSpaceName] = useState('');

  const wallNames = new Map(project.spaces.flatMap((s) => s.walls.map((w) => [w.id, `${s.name} · ${w.name}`] as const)));
  const errorCount = computation?.warnings.filter((w) => w.severity === 'error').length ?? 0;

  const goToWall = (spaceId: string, wallId: string) => {
    setActiveSpace(spaceId);
    setActiveWall(wallId);
    setActivePage('wall-layout');
  };

  const editCabinet = (id: string) => {
    setActiveCabinet(id);
    setActivePage('editor');
  };

  const handleClose = async () => {
    await saveNow();
    closeProject();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleClose}><ArrowLeft size={14} /> Tüm projeler</Button>
          <Button size="sm" onClick={() => saveText(exportProjectJSON(project), `${safeFileName(project.name)}.dolap.json`, 'application/json')}>
            <Download size={14} /> Yedek al
          </Button>
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
            <Card title={`Dolaplar (${project.cabinets.length})`}
              actions={<AddCabinetMenu onAdd={(type) => { const id = addCabinet(type); if (id) editCabinet(id); }} />}>
              {project.cabinets.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">
                  Henüz dolap yok. Duvar ölçüsünden otomatik yerleşim için bir duvar seçin ya da elle dolap ekleyin.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-[var(--color-text-dim)] bg-[var(--color-bg)]">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Kod</th>
                      <th className="text-left px-4 py-2 font-medium">Dolap</th>
                      <th className="text-left px-4 py-2 font-medium">G × Y × D</th>
                      <th className="text-left px-4 py-2 font-medium">Duvar</th>
                      <th className="text-center px-2 py-2 font-medium">Adet</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {project.cabinets.map((c) => (
                      <tr key={c.id} className="hover:bg-[var(--color-bg-hover)]/40">
                        <td className="px-4 py-2 font-mono text-xs">{c.code}</td>
                        <td className="px-4 py-2">
                          <button className="text-left hover:text-[var(--color-accent)]" onClick={() => editCabinet(c.id)}>{c.name}</button>
                          <div className="text-[11px] text-[var(--color-text-dim)]">{CABINET_TYPE_LABELS[c.type]}</div>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{c.width} × {c.height} × {c.depth}</td>
                        <td className="px-4 py-2 text-xs text-[var(--color-text-muted)]">{c.wallId ? wallNames.get(c.wallId) ?? '—' : '—'}</td>
                        <td className="px-2 py-2 text-center font-mono">{c.quantity}</td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" title="Düzenle" aria-label="Düzenle" onClick={() => editCabinet(c.id)}><Pencil size={13} /></Button>
                            <Button size="sm" variant="ghost" title="Çoğalt" aria-label="Çoğalt" onClick={() => duplicateCabinet(c.id)}><Copy size={13} /></Button>
                            <Button size="sm" variant="danger" title="Sil" aria-label="Sil" onClick={async () => {
                              if (await confirm({ title: 'Dolap silinsin mi?', message: `${c.code} · ${c.name} projeden çıkarılacak.`, confirmLabel: 'Sil', danger: true })) removeCabinet(c.id);
                            }}><Trash2 size={13} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Mekânlar ve duvarlar">
              <div className="flex flex-col divide-y divide-[var(--color-border)]">
                {project.spaces.map((space) => (
                  <div key={space.id}>
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-bg)]">
                      <div>
                        <span className="text-sm font-semibold">{space.name}</span>
                        <span className="text-xs text-[var(--color-text-dim)] ml-2">Tavan {space.ceilingHeight} mm</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => addWall(space.id, `${String.fromCharCode(65 + space.walls.length)} Duvarı`)}>
                          <Plus size={13} /> Duvar
                        </Button>
                        <Button size="sm" variant="danger" aria-label="Mekânı sil" title="Mekânı sil" onClick={async () => {
                          if (await confirm({ title: 'Mekân silinsin mi?', message: `"${space.name}" ve duvarları silinecek. Dolaplar projede kalır.`, confirmLabel: 'Sil', danger: true })) removeSpace(space.id);
                        }}><Trash2 size={13} /></Button>
                      </div>
                    </div>
                    {space.walls.map((wall) => {
                      const count = project.cabinets.filter((c) => c.wallId === wall.id).length;
                      return (
                        <div key={wall.id} role="button" tabIndex={0}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--color-bg-hover)]/40 cursor-pointer group"
                          onClick={() => goToWall(space.id, wall.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') goToWall(space.id, wall.id); }}>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-[var(--color-text-dim)]" />
                            <span className="text-sm">{wall.name}</span>
                            <span className="text-xs text-[var(--color-text-dim)]">
                              {wall.effectiveWidth} mm · {count} dolap{wall.obstacles.length > 0 && ` · ${wall.obstacles.length} engel`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button aria-label="Duvarı sil" title="Duvarı sil"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (await confirm({ title: 'Duvar silinsin mi?', message: `"${wall.name}" silinecek. Üzerindeki dolaplar projede kalır.`, confirmLabel: 'Sil', danger: true })) removeWall(wall.id);
                              }}
                              className="p-1 text-[var(--color-text-dim)] hover:text-[var(--color-error)] opacity-0 group-hover:opacity-100 focus:opacity-100">
                              <Trash2 size={13} />
                            </button>
                            <ChevronRight size={16} className="text-[var(--color-text-dim)]" />
                          </div>
                        </div>
                      );
                    })}
                    {space.walls.length === 0 && <p className="px-4 py-2.5 text-xs text-[var(--color-text-dim)]">Henüz duvar yok</p>}
                  </div>
                ))}
                <form className="flex items-center gap-2 p-3"
                  onSubmit={(e) => { e.preventDefault(); if (newSpaceName.trim()) { addSpace(newSpaceName.trim(), 'custom', 2500); setNewSpaceName(''); } }}>
                  <input value={newSpaceName} onChange={(e) => setNewSpaceName(e.target.value)} placeholder="Yeni mekân adı (örn: Banyo, Yatak odası)"
                    className="flex-1 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm focus:border-[var(--color-border-focus)] focus:outline-none" />
                  <Button type="submit" size="sm" disabled={!newSpaceName.trim()}><Plus size={13} /> Mekân ekle</Button>
                </form>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
