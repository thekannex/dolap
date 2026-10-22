import { Ruler } from 'lucide-react';
import type { Wall } from '../../../core/models/project';
import { wallRange } from '../../../core/layout/wall-survey';
import { formatNumber } from '../../../core/utils/format';
import { useUIStore } from '../../../stores/ui-store';
import { Button } from '../shared/ui';

/** Sonraki adımlarda duvarın kısa özeti; ölçü "Duvar ölçüsü" adımında düzenlenir. */
export default function WallSummary({ wall }: { wall: Wall }) {
  const setActivePage = useUIStore((s) => s.setActivePage);
  const r = wallRange(wall);
  return (
    <div data-tour="wall-measure" className="border border-[var(--color-border)] rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Duvar ölçüsü</h3>
        <span className="text-[10px] text-[var(--color-text-dim)]">{wall.survey ? 'ayrıntılı ölçü' : 'basit ölçü'}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-[var(--color-text-dim)]">Duvar boyu</span><p className="font-mono font-semibold">{formatNumber(r.length)} mm</p></div>
        <div><span className="text-[var(--color-text-dim)]">Dolap sığan alan</span><p className="font-mono font-semibold text-[var(--color-accent)]">{formatNumber(Math.round(r.x1 - r.x0))} × {formatNumber(Math.round(r.height))}</p></div>
      </div>
      <Button size="sm" onClick={() => setActivePage('wall-survey')}><Ruler size={13} /> Ölçüyü düzenle (1. adım)</Button>
    </div>
  );
}
