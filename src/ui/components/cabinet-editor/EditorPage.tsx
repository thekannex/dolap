import { useMemo, useState } from 'react';
import { jobContent } from '../../../core/project/jobs';
import type { CellRef } from '../interior/InteriorSvg';
import { Copy, Trash2, PenTool } from 'lucide-react';
import { useProjectStore, useActiveCabinet } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';
import { useCabinetCalculations } from '../../hooks/use-cabinet-calculations';
import CabinetParams from './CabinetParams';
import CabinetPreview from './CabinetPreview';
import { PartsList, WarningsPanel, TipsPanel } from './DetailPanels';
import AddCabinetMenu from '../shared/AddCabinetMenu';
import { CABINET_TYPE_ICONS } from '../shared/cabinet-icons';
import { Button, EmptyState } from '../shared/ui';
import type { ProjectCabinet } from '../../../core/models/cabinet';

/** Açık işin dolapları; duvar ve çizim başlıkları altında gruplu. */
function CabinetList({ activeId }: { activeId: string | undefined }) {
  const project = useProjectStore((s) => s.project);
  const activeJobId = useProjectStore((s) => s.activeJobId);
  const setActiveCabinet = useProjectStore((s) => s.setActiveCabinet);
  const addCabinet = useProjectStore((s) => s.addCabinet);
  const groups = useMemo(() => {
    if (!project || !activeJobId) return [];
    const c = jobContent(project, activeJobId);
    const out: Array<{ key: string; title: string; items: ProjectCabinet[] }> = [];
    const used = new Set<string>();
    const take = (key: string, title: string, items: ProjectCabinet[]) => {
      items.forEach((x) => used.add(x.id));
      if (items.length > 0) out.push({ key, title, items });
    };
    for (const sp of c.spaces) for (const w of sp.walls) take(w.id, c.spaces.length > 1 ? `${sp.name} · ${w.name}` : w.name, c.cabinets.filter((x) => x.wallId === w.id && !x.groupId));
    for (const comp of c.compositions) take(comp.id, comp.name, c.cabinets.filter((x) => x.groupId === comp.id));
    take('loose', out.length > 0 ? 'Tek dolaplar' : '', c.cabinets.filter((x) => !used.has(x.id)));
    return out;
  }, [project, activeJobId]);

  return (
    <nav aria-label="Dolaplar" className="w-52 shrink-0 h-full overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col">
      <div className="p-2 border-b border-[var(--color-border)] flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] pl-1">Dolaplar</span>
        <AddCabinetMenu label="Ekle" onAdd={(t) => addCabinet(t)} />
      </div>
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col">
          {g.title && <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)] truncate">{g.title}</p>}
          <ul className="px-1.5 pb-1 flex flex-col gap-0.5">
            {g.items.map((c) => {
              const Icon = CABINET_TYPE_ICONS[c.type];
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <button onClick={() => setActiveCabinet(c.id)} aria-current={active}
                    className={`w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      active ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]/60'
                    }`}>
                    <Icon size={14} className="mt-0.5 shrink-0 opacity-70" />
                    <span className="min-w-0">
                      <span className="font-mono font-semibold">{c.code}</span>
                      {c.quantity > 1 && <span className="ml-1 opacity-70">×{c.quantity}</span>}
                      <span className="block truncate opacity-80">{c.name}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function EditorWorkspace({ cabinet }: { cabinet: ProjectCabinet }) {
  const computed = useCabinetCalculations(cabinet);
  const [cellSel, setCellSel] = useState<CellRef | null>(null);
  const duplicateCabinet = useProjectStore((s) => s.duplicateCabinet);
  const removeCabinet = useProjectStore((s) => s.removeCabinet);
  const confirm = useUIStore((s) => s.confirm);

  return (
    <>
      <CabinetParams cabinet={cabinet} selectedCell={cellSel} onSelectCell={setCellSel} />
      <CabinetPreview cabinet={cabinet} selectedCell={cellSel} onSelectCell={setCellSel} />
      <aside className="w-[340px] shrink-0 h-full overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <span className="text-xs text-[var(--color-text-muted)] font-mono truncate">
            {cabinet.code} · {computed.parts.reduce((s, p) => s + p.quantity, 0)} parça
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => duplicateCabinet(cabinet.id)} title="Bu dolabı çoğalt"><Copy size={13} /> Çoğalt</Button>
            <Button size="sm" variant="danger" aria-label="Dolabı sil" title="Dolabı sil" onClick={async () => {
              if (await confirm({ title: 'Dolap silinsin mi?', message: `${cabinet.code} · ${cabinet.name} projeden çıkarılacak.`, confirmLabel: 'Sil', danger: true })) {
                removeCabinet(cabinet.id);
              }
            }}><Trash2 size={13} /></Button>
          </div>
        </div>
        <WarningsPanel computed={computed} />
        <PartsList computed={computed} />
        <TipsPanel cabinet={cabinet} />
      </aside>
    </>
  );
}

export default function EditorPage() {
  const cabinet = useActiveCabinet();
  const hasAny = useProjectStore((s) => s.project?.cabinets.some((c) => c.jobId === s.activeJobId) ?? false);
  const addCabinet = useProjectStore((s) => s.addCabinet);

  return (
    <div className="flex-1 flex overflow-hidden">
      <CabinetList activeId={cabinet?.id} />
      {cabinet && hasAny ? (
        <EditorWorkspace key={cabinet.id} cabinet={cabinet} />
      ) : (
        <EmptyState icon={<PenTool size={32} />} title="Bu işte henüz dolap yok"
          text="Dolaplar ilk adımda oluşur: mutfakta öneriyi uygulayın, duvar dolabında alanı çizip dolabı oluşturun, bağımsız ünitede çizin. İsterseniz buradan tek dolap da ekleyebilirsiniz."
          action={<AddCabinetMenu onAdd={(t) => addCabinet(t)} />} />
      )}
    </div>
  );
}
