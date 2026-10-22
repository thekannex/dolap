import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SurveyPoint, Wall, WallSurvey } from '../../../core/models/project';
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
function SideInputs({ label, lean, angle, onLean, onAngle }: {
  label: string; lean: number; angle: number; onLean: (v: number) => void; onAngle: (v: number) => void;
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
          onLean={(v) => set({ leftLean: v })} onAngle={(v) => set({ leftAngle: v })} />
        <SideInputs label="Sağ yan duvar" lean={survey.rightLean} angle={survey.rightAngle}
          onLean={(v) => set({ rightLean: v })} onAngle={(v) => set({ rightAngle: v })} />
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
