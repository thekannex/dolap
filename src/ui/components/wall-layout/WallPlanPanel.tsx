import { useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
import type { Wall } from '../../../core/models/project';
import { planKitchenWall, kitchenRowSummary, DEFAULT_KITCHEN_PLAN } from '../../../core/layout/kitchen-fit';
import { useProjectStore } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';
import { Button, Toggle } from '../shared/ui';

const ALL_WIDTHS = [300, 350, 400, 450, 500, 600, 800, 900, 1000];

/**
 * Otomatik yerleşim: seçilen genişliklerle alt ve üst sıra. Duvar dolabıyla aynı engel hesabı:
 * kolon önüne sığ dolap, kiriş altında kısa üst dolap, pencere ve cihaz boşluğunun önü boş.
 */
export default function WallPlanPanel({ wall }: { wall: Wall }) {
  const applyKitchenPlan = useProjectStore((s) => s.applyKitchenPlan);
  const existing = useProjectStore((s) => s.project?.cabinets.filter((c) => c.wallId === wall.id && !c.groupId).length ?? 0);
  const confirm = useUIStore((s) => s.confirm);
  const notify = useUIStore((s) => s.notify);
  const [widths, setWidths] = useState<number[]>(wall.kitchenPlan?.widths ?? DEFAULT_KITCHEN_PLAN.widths);
  const [includeUpper, setIncludeUpper] = useState(wall.kitchenPlan?.includeUpper ?? DEFAULT_KITCHEN_PLAN.includeUpper);

  const plan = useMemo(() => planKitchenWall(wall, { widths, includeUpper }), [wall, widths, includeUpper]);
  const cabinets = plan.modules.filter((m) => m.kind === 'cabinet');
  const shallow = cabinets.filter((m) => m.backOffset > 0).length;
  const shortUpper = cabinets.filter((m) => m.row === 'wall' && m.height < 720).length;

  const toggle = (w: number) => setWidths((cur) => (cur.includes(w) ? cur.filter((x) => x !== w) : [...cur, w]));

  const apply = async () => {
    if (existing > 0) {
      const ok = await confirm({
        title: 'Duvardaki dolaplar değiştirilsin mi?',
        message: `Bu duvarda ${existing} dolap var. Otomatik yerleşim bunları silip yeniden oluşturur.`,
        confirmLabel: 'Değiştir',
        danger: true,
      });
      if (!ok) return;
    }
    const n = applyKitchenPlan(wall.id, plan.modules, { widths, includeUpper });
    notify('success', `${n} dolap/dolgu eklendi. Çizimde sürükleyerek ya da sağdaki panelden düzenleyebilirsiniz.`);
  };

  const row = (r: 'base' | 'wall', label: string) => {
    const text = kitchenRowSummary(plan.modules, r);
    return (
      <p><span className="text-[var(--color-text-dim)] font-sans">{label}: </span>{text || <span className="text-[var(--color-text-dim)]">dolap yok</span>}</p>
    );
  };

  return (
    <div data-tour="wall-plan" className="border border-[var(--color-border)] rounded-lg p-3 flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Otomatik yerleşim</h3>
      <div>
        <p className="text-[11px] text-[var(--color-text-dim)] mb-1.5">Kullanılacak dolap genişlikleri (mm)</p>
        <div className="flex flex-wrap gap-1">
          {ALL_WIDTHS.map((w) => (
            <button key={w} onClick={() => toggle(w)} aria-pressed={widths.includes(w)}
              className={`px-2 py-0.5 rounded text-xs font-mono border transition-colors ${
                widths.includes(w)
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-dim)]'
              }`}>{w}</button>
          ))}
        </div>
      </div>

      <div className="text-xs rounded-md bg-[var(--color-bg)] p-2 font-mono leading-relaxed flex flex-col gap-1">
        {row('base', 'Alt')}
        {includeUpper && row('wall', 'Üst')}
      </div>
      {(shallow > 0 || shortUpper > 0 || plan.blocked.length > 0) && (
        <p className="text-[11px] text-[var(--color-text-muted)]">
          Duvar şekline göre: {[
            shallow > 0 && `${shallow} sığ dolap (kolon/çıkıntı önü)`,
            shortUpper > 0 && `${shortUpper} kısa üst dolap (kiriş altı)`,
            plan.blocked.length > 0 && `${plan.blocked.length} boş bölge (pencere, kapı, cihaz)`,
          ].filter(Boolean).join(' · ')}
        </p>
      )}
      {plan.warnings.map((w) => <p key={w} className="text-[11px] text-[var(--color-warning)]">{w}</p>)}

      <Toggle label="Üst dolapları da ekle" checked={includeUpper} onChange={setIncludeUpper} />
      <Button variant="primary" onClick={apply} disabled={widths.length === 0 || cabinets.length === 0}>
        <Wand2 size={15} /> Öneriyi uygula
      </Button>
    </div>
  );
}
