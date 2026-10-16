import { useMemo, useState } from 'react';
import { Plus, Trash2, Shapes, Pencil, Box as BoxIcon, ArrowRight, ArrowUp, Link2, Unlink2, LayoutTemplate, Columns3 } from 'lucide-react';
import { useProjectStore } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';
import { useProjectComputation } from '../../hooks/use-cabinet-calculations';
import type { ProjectCabinet } from '../../../core/models/cabinet';
import type { ComputedCabinet } from '../../../core/engine/compute-cabinet';
import {
  BOX_CONTENTS, COMPOSITION_TEMPLATES, boxesOverlap, checkSharing, compositionBounds, detectBoxContent, validateComposition,
} from '../../../core/layout/composition';
import type { BoxContent } from '../../../core/layout/composition';
import { formatNumber } from '../../../core/utils/format';
import { Button, Card, EmptyState, NumInput, Section, TextInput, Toggle } from '../shared/ui';
import { WarningItem } from '../cabinet-editor/DetailPanels';
import ComposerCanvas from './ComposerCanvas';
import InteriorEditor from '../interior/InteriorEditor';
import JointControls from '../shared/JointControls';
import BehindDoorControl from '../shared/BehindDoorControl';
import type { CellRef } from '../interior/InteriorSvg';
import { interiorFromCabinet } from '../../../core/engine/interior';
import type { Rect } from './ComposerCanvas';

function ContentPicker({ value, onChange }: { value: BoxContent; onChange: (v: BoxContent) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Kutu içeriği">
      {BOX_CONTENTS.map((c) => (
        <button key={c.value} role="radio" aria-checked={value === c.value} title={c.hint} onClick={() => onChange(c.value)}
          className={`px-2 py-1.5 rounded-md text-xs font-medium border text-left transition-colors ${
            value === c.value
              ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
              : 'bg-[var(--color-bg-input)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
          }`}>{c.label}</button>
      ))}
    </div>
  );
}

function BoxPanel({ box, group, selectedCell, onSelectCell }: {
  box: ProjectCabinet; group: ProjectCabinet[]; selectedCell: CellRef | null; onSelectCell: (ref: CellRef | null) => void;
}) {
  const setBoxGeometry = useProjectStore((s) => s.setBoxGeometry);
  const setBoxContent = useProjectStore((s) => s.setBoxContent);
  const updateCabinet = useProjectStore((s) => s.updateCabinet);
  const removeCabinet = useProjectStore((s) => s.removeCabinet);
  const addBox = useProjectStore((s) => s.addBox);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const notify = useUIStore((s) => s.notify);
  const confirm = useUIStore((s) => s.confirm);
  const check = checkSharing(box, group);
  const content = detectBoxContent(box);
  const bx = box.x ?? 0;
  const by = box.elevation ?? 0;

  const addAdjacent = (where: 'right' | 'top') => {
    const rect = where === 'right'
      ? { x: bx + box.width, y: by, w: 600, h: box.height }
      : { x: bx, y: by + box.height, w: box.width, h: 400 };
    if (group.some((o) => boxesOverlap(rect, { x: o.x ?? 0, y: o.elevation ?? 0, w: o.width, h: o.height }))) {
      notify('error', where === 'right' ? 'Sağında yer yok; başka bir kutu var.' : 'Üstünde yer yok; başka bir kutu var.');
      return;
    }
    addBox(box.groupId!, { x: rect.x, elevation: rect.y, width: rect.w, height: rect.h, depth: box.depth }, where === 'top' ? 'doors' : content);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold">{box.code}</p>
          <p className="text-xs text-[var(--color-text-muted)] truncate">{box.name}</p>
        </div>
        <Button size="sm" variant="danger" aria-label="Kutuyu sil" title="Kutuyu sil" onClick={async () => {
          if (await confirm({ title: 'Kutu silinsin mi?', message: `${box.code} kompozisyondan çıkarılacak.`, confirmLabel: 'Sil', danger: true })) removeCabinet(box.id);
        }}><Trash2 size={14} /></Button>
      </div>

      <Section title={box.interior ? 'Bölmeler ve gözler' : 'İçerik'}>
        {box.interior ? (
          <InteriorEditor cabinet={box} selected={selectedCell} onSelect={onSelectCell} />
        ) : (
          <>
            <ContentPicker value={content} onChange={(v) => setBoxContent(box.id, v)} />
            <Button size="sm" onClick={() => updateCabinet(box.id, { interior: interiorFromCabinet(box) })}>
              <Columns3 size={13} /> Bölmelere ayır (kapak, çekmece, raf karışık)
            </Button>
          </>
        )}
      </Section>

      <Section title="Ölçü ve konum">
        <div className="grid grid-cols-3 gap-2">
          <NumInput label="Genişlik" value={box.width} onChange={(v) => setBoxGeometry(box.id, { width: v })} min={100} max={3000} />
          <NumInput label="Yükseklik" value={box.height} onChange={(v) => setBoxGeometry(box.id, { height: v })} min={100} max={2800} />
          <NumInput label="Derinlik" value={box.depth} onChange={(v) => setBoxGeometry(box.id, { depth: v })} min={100} max={1200} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumInput label="Soldan" value={bx} onChange={(v) => setBoxGeometry(box.id, { x: v })} max={20000} />
          <NumInput label="Yerden" value={by} onChange={(v) => setBoxGeometry(box.id, { elevation: v })} max={3000} />
        </div>
        {by === 0 && (
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="Baza" value={box.plinthHeight} onChange={(v) => updateCabinet(box.id, { plinthHeight: v, ...(v > 0 ? { legHeight: 0 } : {}) })} max={200} />
            <NumInput label="Ayak yüksekliği" value={box.legHeight} onChange={(v) => updateCabinet(box.id, { legHeight: v, ...(v > 0 ? { plinthHeight: 0 } : {}) })} max={400} />
          </div>
        )}
      </Section>

      <Section title="Dikmeler ve tablalar">
        <BehindDoorControl cabinet={box} onChange={(patch) => updateCabinet(box.id, patch)} />
        <JointControls cabinet={box} onChange={(patch) => updateCabinet(box.id, patch)} />
      </Section>

      <Section title="Ortak panel">
        <Toggle label={`Sol dikme ortak${check.left.neighbor ? ` (${check.left.neighbor} ile)` : ''}`}
          checked={box.shareLeft && check.left.possible}
          onChange={(v) => updateCabinet(box.id, { shareLeft: v })} />
        {!check.left.possible && <p className="text-[11px] text-[var(--color-text-dim)] -mt-2 pl-6">{check.left.reason}</p>}
        <Toggle label={`Alt tabla ortak${check.bottom.neighbor ? ` (${check.bottom.neighbor} ile)` : ''}`}
          checked={box.shareBottom && check.bottom.possible}
          onChange={(v) => updateCabinet(box.id, { shareBottom: v })} />
        {!check.bottom.possible && <p className="text-[11px] text-[var(--color-text-dim)] -mt-2 pl-6">{check.bottom.reason}</p>}
        <p className="text-[11px] text-[var(--color-text-dim)]">
          Ortak panelde komşunun dikmesi ya da tablası kullanılır; bu kutunun o paneli kesim listesinden düşer.
        </p>
      </Section>

      <div className="flex flex-col gap-2 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => addAdjacent('right')}><ArrowRight size={13} /> Sağına ekle</Button>
          <Button size="sm" onClick={() => addAdjacent('top')}><ArrowUp size={13} /> Üstüne ekle</Button>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setActivePage('editor')}><Pencil size={13} /> Dolap editöründe ayrıntılar</Button>
      </div>
    </div>
  );
}

function GroupPanel({ groupId, group, newContent, newDepth }: { groupId: string; group: ProjectCabinet[]; newContent: BoxContent; newDepth: number }) {
  const addBox = useProjectStore((s) => s.addBox);
  const applyTemplate = useProjectStore((s) => s.applyTemplate);
  const setSharingForGroup = useProjectStore((s) => s.setSharingForGroup);
  const confirm = useUIStore((s) => s.confirm);
  const notify = useUIStore((s) => s.notify);
  const bounds = compositionBounds(group);
  const [form, setForm] = useState({ width: 600, height: 700, x: bounds.width, elevation: 0 });
  const warnings = useMemo(() => validateComposition(group), [group]);

  const addByForm = () => {
    const rect = { x: form.x, y: form.elevation, w: form.width, h: form.height };
    if (group.some((o) => boxesOverlap(rect, { x: o.x ?? 0, y: o.elevation ?? 0, w: o.width, h: o.height }))) {
      notify('error', 'Bu konumda başka bir kutu var.');
      return;
    }
    addBox(groupId, { x: form.x, elevation: form.elevation, width: form.width, height: form.height, depth: newDepth }, newContent);
    setForm((f) => ({ ...f, x: f.x + f.width }));
  };

  return (
    <div className="flex flex-col">
      <p className="text-xs text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border)]">
        {group.length} kutu · toplam {formatNumber(bounds.width)} × {formatNumber(bounds.height)} × {formatNumber(bounds.depth)} mm
      </p>

      {warnings.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-3">{warnings.map((w) => <WarningItem key={w.id} w={w} />)}</div>
      )}

      <Section title="Ölçüyle kutu ekle">
        <div className="grid grid-cols-2 gap-2">
          <NumInput label="Genişlik" value={form.width} onChange={(v) => setForm({ ...form, width: v })} min={100} max={3000} />
          <NumInput label="Yükseklik" value={form.height} onChange={(v) => setForm({ ...form, height: v })} min={100} max={2800} />
          <NumInput label="Soldan" value={form.x} onChange={(v) => setForm({ ...form, x: v })} max={20000} />
          <NumInput label="Yerden" value={form.elevation} onChange={(v) => setForm({ ...form, elevation: v })} max={3000} />
        </div>
        <p className="text-[11px] text-[var(--color-text-dim)]">İçerik ve derinlik soldaki "Yeni kutu" ayarından alınır.</p>
        <Button size="sm" variant="primary" onClick={addByForm}><Plus size={13} /> Kutuyu ekle</Button>
      </Section>

      {group.length > 1 && (
        <Section title="Ortak paneller">
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => setSharingForGroup(groupId, true)}><Link2 size={13} /> Hepsinde ortak</Button>
            <Button size="sm" onClick={() => setSharingForGroup(groupId, false)}><Unlink2 size={13} /> Hepsi ayrı</Button>
          </div>
          <p className="text-[11px] text-[var(--color-text-dim)]">"Hepsinde ortak", komşusu tam kaplayan her kutuda sol dikmeyi ve alt tablayı ortak yapar.</p>
        </Section>
      )}

      <Section title="Hazır şablon" defaultOpen={group.length === 0}>
        {COMPOSITION_TEMPLATES.map((t) => (
          <Button key={t.id} size="sm" className="justify-start text-left" onClick={async () => {
            if (group.length > 0 && !(await confirm({ title: 'Şablon uygulansın mı?', message: 'Bu kompozisyondaki kutular silinip şablonla değiştirilecek.', confirmLabel: 'Uygula', danger: true }))) return;
            applyTemplate(groupId, t.id);
          }}><LayoutTemplate size={13} className="shrink-0" /> {t.name}</Button>
        ))}
      </Section>
    </div>
  );
}

export default function ComposerPage() {
  const project = useProjectStore((s) => s.project)!;
  const activeId = useProjectStore((s) => s.activeCompositionId);
  const activeCabinetId = useProjectStore((s) => s.activeCabinetId);
  const setActiveComposition = useProjectStore((s) => s.setActiveComposition);
  const addComposition = useProjectStore((s) => s.addComposition);
  const renameComposition = useProjectStore((s) => s.renameComposition);
  const removeComposition = useProjectStore((s) => s.removeComposition);
  const setActiveCabinet = useProjectStore((s) => s.setActiveCabinet);
  const addBox = useProjectStore((s) => s.addBox);
  const setBoxGeometry = useProjectStore((s) => s.setBoxGeometry);
  const removeCabinet = useProjectStore((s) => s.removeCabinet);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const confirm = useUIStore((s) => s.confirm);
  const notify = useUIStore((s) => s.notify);
  const computation = useProjectComputation();
  const [newContent, setNewContent] = useState<BoxContent>('doors');
  const [newDepth, setNewDepth] = useState(400);
  const [cellSel, setCellSel] = useState<{ boxId: string; ref: CellRef } | null>(null);

  const composition = project.compositions.find((c) => c.id === activeId) ?? project.compositions[0];
  const group = useMemo(() => project.cabinets.filter((c) => composition && c.groupId === composition.id), [project.cabinets, composition]);
  const computedById = useMemo(
    () => new Map<string, ComputedCabinet>(computation?.cabinets.map((c) => [c.cabinet.id, c.computed]) ?? []),
    [computation],
  );
  const selected = group.find((c) => c.id === activeCabinetId) ?? null;
  const selectedCell = selected && cellSel?.boxId === selected.id ? cellSel.ref : null;
  const updateCabinet = useProjectStore((s) => s.updateCabinet);

  if (!composition) {
    return (
      <EmptyState icon={<Shapes size={32} />} title="Serbest çizim"
        text="TV ünitesi, kitaplık duvarı, gardırop gibi birden çok kutudan oluşan mobilyaları önden görünüşte çizin ya da ölçüyle kurun. Çizdiğiniz her kutu bir dolap olarak kesim listesine ve teklife girer."
        action={<Button variant="primary" onClick={() => addComposition()}><Plus size={15} /> Kompozisyon oluştur</Button>} />
    );
  }

  const overlapsOthers = (id: string | null, r: Rect) =>
    group.some((o) => o.id !== id && boxesOverlap(r, { x: o.x ?? 0, y: o.elevation ?? 0, w: o.width, h: o.height }));

  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-60 shrink-0 h-full overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Kompozisyonlar</span>
          <Button size="sm" variant="ghost" onClick={() => addComposition()} aria-label="Yeni kompozisyon" title="Yeni kompozisyon"><Plus size={14} /></Button>
        </div>
        <ul className="flex flex-col gap-0.5">
          {project.compositions.map((c) => (
            <li key={c.id}>
              <button onClick={() => setActiveComposition(c.id)} aria-current={c.id === composition.id}
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                  c.id === composition.id ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium' : 'hover:bg-[var(--color-bg-hover)]/60'
                }`}>
                {c.name}
                <span className="block text-[11px] text-[var(--color-text-dim)]">{project.cabinets.filter((x) => x.groupId === c.id).length} kutu</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t border-[var(--color-border)] pt-3 flex flex-col gap-2">
          <TextInput label="Kompozisyon adı" value={composition.name} onChange={(v) => renameComposition(composition.id, v)} />
          <Button size="sm" variant="danger" className="self-start" onClick={async () => {
            if (await confirm({ title: 'Kompozisyon silinsin mi?', message: `"${composition.name}" ve içindeki ${group.length} kutu silinecek.`, confirmLabel: 'Sil', danger: true })) removeComposition(composition.id);
          }}><Trash2 size={13} /> Kompozisyonu sil</Button>
        </div>

        <div className="border-t border-[var(--color-border)] pt-3 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Yeni kutu</span>
          <ContentPicker value={newContent} onChange={setNewContent} />
          <NumInput label="Derinlik" value={newDepth} onChange={setNewDepth} min={100} max={1200} />
          <p className="text-[11px] text-[var(--color-text-dim)]">
            Boş alanda sürükleyerek kutu çizin. Kutuyu sürükleyip taşıyın, kenarlarından boyutlandırın. Delete: sil · Oklar: 10mm kaydır (Shift: 50mm).
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg)]">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] text-xs text-[var(--color-text-muted)]">
          <span className="font-semibold text-[var(--color-text)]">{composition.name}</span>
          <span>Önden görünüş · ölçüler mm · ızgara 100mm</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setActivePage('3d-preview')}><BoxIcon size={13} /> 3D'de gör</Button>
          </div>
        </div>
        <div className="flex-1 p-3 overflow-hidden">
          <ComposerCanvas
            boxes={group}
            computedById={computedById}
            selectedId={selected?.id ?? null}
            onSelect={(id) => setActiveCabinet(id)}
            selectedCell={selectedCell}
            onSelectCell={(id, ref) => setCellSel(ref ? { boxId: id, ref } : null)}
            onInteriorCommit={(id, interior) => updateCabinet(id, { interior })}
            onDraw={(r) => {
              if (overlapsOthers(null, r)) { notify('error', 'Kutular üst üste binemez.'); return; }
              addBox(composition.id, { x: r.x, elevation: r.y, width: r.w, height: r.h, depth: newDepth }, newContent);
            }}
            onCommit={(id, r) => {
              if (overlapsOthers(id, r)) { notify('error', 'Kutular üst üste binemez; eski yerine döndü.'); return; }
              setBoxGeometry(id, { x: r.x, elevation: r.y, width: r.w, height: r.h });
            }}
            onDelete={async (id) => {
              const b = group.find((x) => x.id === id);
              if (b && await confirm({ title: 'Kutu silinsin mi?', message: `${b.code} kompozisyondan çıkarılacak.`, confirmLabel: 'Sil', danger: true })) removeCabinet(id);
            }}
            onNudge={(id, dx, dy) => {
              const b = group.find((x) => x.id === id);
              if (!b) return;
              const r = { x: Math.max(0, (b.x ?? 0) + dx), y: Math.max(0, (b.elevation ?? 0) + dy), w: b.width, h: b.height };
              if (!overlapsOthers(id, r)) setBoxGeometry(id, { x: r.x, elevation: r.y });
            }}
          />
        </div>
      </div>

      <aside className="w-80 shrink-0 h-full overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        {selected ? <BoxPanel box={selected} group={group} selectedCell={selectedCell} onSelectCell={(ref) => setCellSel(ref ? { boxId: selected.id, ref } : null)} /> : (
          <Card className="border-0">
            <GroupPanel groupId={composition.id} group={group} newContent={newContent} newDepth={newDepth} />
          </Card>
        )}
      </aside>
    </div>
  );
}
