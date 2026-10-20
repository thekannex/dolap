import { useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
import type { Wall } from '../../../core/models/project';
import { planModules } from '../../../core/layout/module-planner';
import { useProjectStore } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';
import { Button, Toggle } from '../shared/ui';

const ALL_WIDTHS = [300, 350, 400, 450, 500, 600, 800, 900, 1000];
const DEFAULT_WIDTHS = [300, 400, 450, 500, 600];

function useWallPlan(wall: Wall, widths: number[]) {
  return useMemo(() => {
    const fixed = wall.obstacles
      .filter((o) => o.type === 'appliance')
      .map((o) => ({ x: o.x, width: o.width, name: 'Cihaz' }));
    return planModules({
      effectiveWidth: wall.effectiveWidth,
      standardWidths: [...widths].sort((a, b) => a - b),
      fixedModules: fixed,
      minFillerWidth: 30,
      maxFillerWidth: 150,
    });
  }, [wall.effectiveWidth, wall.obstacles, widths]);
}

export default function WallPlanPanel({ wall }: { wall: Wall }) {
  const applyWallPlan = useProjectStore((s) => s.applyWallPlan);
  const existing = useProjectStore((s) => s.project?.cabinets.filter((c) => c.wallId === wall.id).length ?? 0);
  const confirm = useUIStore((s) => s.confirm);
  const notify = useUIStore((s) => s.notify);
  const [widths, setWidths] = useState<number[]>(DEFAULT_WIDTHS);
  const [includeUpper, setIncludeUpper] = useState(true);

  const plan = useWallPlan(wall, widths);
  const cabinets = plan.modules.filter((m) => m.type !== 'appliance');

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
    const n = applyWallPlan(wall.id, plan.modules, { includeUpper, replace: true });
    notify('success', `${n} dolap/dolgu eklendi. Dolaplar sayfasından ayrıntıları düzenleyebilirsiniz.`);
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

      <div className="text-xs rounded-md bg-[var(--color-bg)] p-2 font-mono leading-relaxed">
        {cabinets.length === 0 ? <span className="text-[var(--color-text-dim)]">Öneri yok</span> : cabinets.map((m, i) => (
          <span key={i} className={m.type === 'filler' ? 'text-[var(--color-warning)]' : ''}>
            {i > 0 && ' + '}{m.type === 'filler' ? `dolgu ${m.width}` : m.width}
          </span>
        ))}
      </div>
      {plan.warning && <p className="text-[11px] text-[var(--color-warning)]">{plan.warning}</p>}

      <Toggle label="Üst dolapları da ekle" checked={includeUpper} onChange={setIncludeUpper} />
      <Button variant="primary" onClick={apply} disabled={widths.length === 0 || cabinets.length === 0}>
        <Wand2 size={15} /> Öneriyi uygula
      </Button>
    </div>
  );
}
