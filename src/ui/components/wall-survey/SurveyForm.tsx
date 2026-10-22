import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SideObstacle, SurveyPoint, Wall, WallSurvey } from '../../../core/models/project';
import { angleFromOffset } from '../../../core/layout/wall-survey';
import { useProjectStore } from '../../../stores/project-store';
import { NumInput, Section, TextInput } from '../shared/ui';

/** Ölçü noktaları listesi (soldan uzaklık + değer). */
function PointList({ points, valueLabel, hint, min, max, onChange, newPoint }: {
  points: SurveyPoint[]; valueLabel: string; hint: string; min: number; max: number;
  onChange: (p: SurveyPoint[]) => void; newPoint: () => SurveyPoint;
}) {
  // Yazarken satırlar yer değiştirmesin: liste girildiği sırada gösterilir, odak listeden çıkınca soldan sağa dizilir
  const rows = points.map((p, i) => ({ ...p, i }));
  const sortOnLeave = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
    const sorted = [...points].sort((a, b) => a.x - b.x);
    if (sorted.some((p, i) => p !== points[i])) onChange(sorted);
  };
  const set = (i: number, patch: Partial<SurveyPoint>) => onChange(points.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  return (
    <div className="flex flex-col gap-1.5" onBlur={sortOnLeave}>
      <p className="text-[11px] text-[var(--color-text-dim)]">{hint}</p>
      {rows.map((p) => (
        <div key={p.i} className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-end">
          <NumInput label="Soldan" value={p.x} onChange={(v) => set(p.i, { x: v })} max={20000} />
          <NumInput label={valueLabel} value={p.v} onChange={(v) => set(p.i, { v })} min={min} max={max} />
          <button onClick={() => onChange(points.filter((_, k) => k !== p.i))} aria-label="Noktayı sil"
            className="mb-1.5 p-1 text-[var(--color-text-dim)] hover:text-[var(--color-error)]"><Trash2 size={13} /></button>
        </div>
      ))}
      <button onClick={() => onChange([...points, newPoint()])}
        className="self-start flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"><Plus size={12} /> Nokta ekle</button>
    </div>
  );
}

/** Yan duvar: şakul sapması ve köşe açısı (derece ya da "1 m'de kaç mm" ölçüsünden). */
const SIDE_TYPES: Array<{ type: string; label: string; size: { x: number; width: number; y: number; height: number | null; depth: number } }> = [
  { type: 'column', label: 'Kolon', size: { x: 0, width: 300, y: 0, height: null, depth: 120 } },
  { type: 'protrusion', label: 'Çıkıntı / kasa', size: { x: 0, width: 100, y: 0, height: 2100, depth: 50 } },
  { type: 'pipe', label: 'Boru', size: { x: 50, width: 60, y: 0, height: null, depth: 60 } },
  { type: 'outlet', label: 'Priz', size: { x: 300, width: 80, y: 1100, height: 80, depth: 0 } },
  { type: 'custom', label: 'Diğer', size: { x: 0, width: 200, y: 0, height: 200, depth: 100 } },
];
const sideLabel = (t: string) => SIDE_TYPES.find((x) => x.type === t)?.label ?? 'Engel';

/** Yan duvardaki engeller: köşeye yakın olanlar dolabın o yanını etkiler, 3D'de de görünür. */
function SideObstacleList({ wall, side, ceiling }: { wall: Wall; side: 'left' | 'right'; ceiling: number }) {
  const updateWall = useProjectStore((st) => st.updateWall);
  const all = wall.sideObstacles ?? [];
  const mine = all.filter((o) => o.side === side);
  const save = (next: SideObstacle[]) => updateWall(wall.id, { sideObstacles: next });
  const patch = (id: string, p: Partial<SideObstacle>) => save(all.map((o) => (o.id === id ? { ...o, ...p } : o)));
  const add = (type: string) => {
    const sz = SIDE_TYPES.find((x) => x.type === type)!.size;
    save([...all, { id: crypto.randomUUID(), wallId: wall.id, side, type, x: sz.x, width: sz.width, y: sz.y, height: sz.height ?? ceiling, depth: sz.depth }]);
  };
  return (
    <div className="flex flex-col gap-1.5 pt-1 border-t border-[var(--color-border)]">
      <span className="text-[11px] text-[var(--color-text-muted)]">Bu duvardaki engeller {mine.length > 0 && `(${mine.length})`}</span>
      {mine.map((o) => (
        <div key={o.id} className="rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] p-1.5 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{sideLabel(o.type)}</span>
            <button onClick={() => save(all.filter((x) => x.id !== o.id))} aria-label="Engeli sil"
              className="p-0.5 text-[var(--color-text-dim)] hover:text-[var(--color-error)]"><Trash2 size={12} /></button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <NumInput label="Köşeden" value={o.x} onChange={(v) => patch(o.id, { x: v })} max={10000} suffix="" />
            <NumInput label="En" value={o.width} onChange={(v) => patch(o.id, { width: v })} min={1} max={10000} suffix="" />
            <NumInput label="Taşma" value={o.depth} onChange={(v) => patch(o.id, { depth: v })} max={2000} suffix="" />
            <NumInput label="Yerden" value={o.y} onChange={(v) => patch(o.id, { y: v })} max={6000} suffix="" />
            <NumInput label="Boy" value={o.height} onChange={(v) => patch(o.id, { height: v })} min={1} max={6000} suffix="" />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-1">
        {SIDE_TYPES.map((t) => (
          <button key={t.type} onClick={() => add(t.type)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
            <Plus size={10} /> {t.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)]">"Köşeden": ana duvardan odaya doğru yan duvar boyunca uzaklık; "Taşma": yan duvardan odaya ne kadar çıktığı. Dolabın derinliğine giren engel o yükseklikte dolabı içeri iter.</p>
    </div>
  );
}

function SideInputs({ label, lean, angle, onLean, onAngle, children }: {
  label: string; lean: number; angle: number; onLean: (v: number) => void; onAngle: (v: number) => void; children?: React.ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-[var(--color-bg)] p-2">
      <span className="text-xs font-semibold">{label}</span>
      <div className="grid grid-cols-2 gap-1.5">
        <NumInput label="Şakul sapması" value={lean} onChange={onLean} min={-300} max={300}
          hint="Tavana doğru dolap tarafına kaçıyorsa +" />
        <NumInput label="Köşe açısı" value={angle} onChange={onAngle} min={45} max={135} suffix="°" step={0.1}
          hint="90 dik; odaya doğru kapanıyorsa 90'dan küçük" />
      </div>
      <div className="flex items-end gap-1.5">
        <NumInput label="ya da 1 m ileride içeri giriş" value={offset} onChange={setOffset} min={-500} max={500} />
        <button onClick={() => onAngle(angleFromOffset(offset, 1000))}
          className="mb-1.5 px-2 py-1 rounded-md text-xs border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] whitespace-nowrap">Açıya çevir</button>
      </div>
      {children}
    </div>
  );
}

/** Ayrıntılı duvar ölçüsü girişi. Değişiklikler hemen kaydedilir; genişlik ve yükseklik bundan hesaplanır. */
export default function SurveyForm({ wall, survey }: { wall: Wall; survey: WallSurvey }) {
  const updateWall = useProjectStore((s) => s.updateWall);
  const setWallSurvey = useProjectStore((s) => s.setWallSurvey);
  const set = (patch: Partial<WallSurvey>) => setWallSurvey(wall.id, { ...survey, ...patch });
  const L = survey.length;

  return (
    <div data-tour="survey-form" className="flex flex-col gap-1">
      <TextInput label="Duvar adı" value={wall.name} onChange={(v) => updateWall(wall.id, { name: v })} />
      <Section title="Boy ve yan duvarlar">
        <NumInput label="Duvar boyu (köşeden köşeye, zemin hizasında)" value={L} onChange={(v) => set({ length: v })} min={100} max={20000} />
        <SideInputs label="Sol yan duvar" lean={survey.leftLean} angle={survey.leftAngle}
          onLean={(v) => set({ leftLean: v })} onAngle={(v) => set({ leftAngle: v })}>
          <SideObstacleList wall={wall} side="left" ceiling={survey.ceiling[0]?.v ?? 2500} />
        </SideInputs>
        <SideInputs label="Sağ yan duvar" lean={survey.rightLean} angle={survey.rightAngle}
          onLean={(v) => set({ rightLean: v })} onAngle={(v) => set({ rightAngle: v })}>
          <SideObstacleList wall={wall} side="right" ceiling={survey.ceiling[survey.ceiling.length - 1]?.v ?? 2500} />
        </SideInputs>
        <NumInput label="Montaj payı" value={wall.installGap} onChange={(v) => updateWall(wall.id, { installGap: v })} max={50}
          hint="Dolapların sığması için kullanılabilir genişlikten düşülen toplam pay" />
      </Section>
      <Section title="Tavan">
        <PointList points={survey.ceiling} valueLabel="Yükseklik" min={500} max={6000}
          hint="Duvar boyunca ölçtüğünüz yerlerde yerden tavana yükseklik. Basık ya da şişik yerlerde ek nokta girin."
          onChange={(p) => set({ ceiling: p })} newPoint={() => ({ x: Math.round(L / 2), v: survey.ceiling[0]?.v ?? 2500 })} />
      </Section>
      <Section title="Zemin" defaultOpen={survey.floor.length > 0}>
        <PointList points={survey.floor} valueLabel="Fark (+ yüksek)" min={-300} max={300}
          hint="Lazer ya da terazi ile ölçülen zemin farkı (sol köşeye göre). Boşsa zemin düz kabul edilir."
          onChange={(p) => set({ floor: p })} newPoint={() => ({ x: survey.floor.length === 0 ? 0 : L, v: 0 })} />
      </Section>
    </div>
  );
}
