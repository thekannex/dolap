import { useProjectStore } from '../../../stores/project-store';
import type { Wall } from '../../../core/models/project';
import { NumInput, TextInput } from '../shared/ui';

export default function WallMeasurementForm({ wall }: { wall: Wall }) {
  const updateWall = useProjectStore((s) => s.updateWall);
  const update = (updates: Partial<Wall>) => updateWall(wall.id, updates);

  const squareDiff = Math.abs(wall.widthLeft - wall.widthRight);
  const minWidth = Math.min(wall.widthLeft, wall.widthCenter, wall.widthRight);

  return (
    <div className="border border-[var(--color-border)] rounded-lg p-3 flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Saha ölçüleri</h3>
      <TextInput label="Duvar adı" value={wall.name} onChange={(v) => update({ name: v })} />

      <div>
        <p className="text-[11px] text-[var(--color-text-dim)] mb-1">Genişlik — alttan, ortadan, üstten ölçün</p>
        <div className="grid grid-cols-3 gap-2">
          <NumInput label="Alt" value={wall.widthLeft} onChange={(v) => update({ widthLeft: v })} min={100} max={20000} suffix="" />
          <NumInput label="Orta" value={wall.widthCenter} onChange={(v) => update({ widthCenter: v })} min={100} max={20000} suffix="" />
          <NumInput label="Üst" value={wall.widthRight} onChange={(v) => update({ widthRight: v })} min={100} max={20000} suffix="" />
        </div>
      </div>

      <div>
        <p className="text-[11px] text-[var(--color-text-dim)] mb-1">Yükseklik — sol, orta, sağ</p>
        <div className="grid grid-cols-3 gap-2">
          <NumInput label="Sol" value={wall.heightLeft} onChange={(v) => update({ heightLeft: v })} min={100} max={6000} suffix="" />
          <NumInput label="Orta" value={wall.heightCenter} onChange={(v) => update({ heightCenter: v })} min={100} max={6000} suffix="" />
          <NumInput label="Sağ" value={wall.heightRight} onChange={(v) => update({ heightRight: v })} min={100} max={6000} suffix="" />
        </div>
      </div>

      <NumInput label="Montaj payı" value={wall.installGap} onChange={(v) => update({ installGap: v })} min={0} max={50}
        hint="Dolapların duvara sığması için en dar ölçüden düşülecek pay" />

      <div className="flex items-center gap-4 pt-2 border-t border-[var(--color-border)]">
        <div>
          <span className="text-[10px] text-[var(--color-text-dim)] uppercase">Kullanılabilir genişlik</span>
          <p className="text-sm font-mono font-bold text-[var(--color-accent)]">{wall.effectiveWidth} mm</p>
          <p className="text-[10px] text-[var(--color-text-dim)]">en dar ölçü {minWidth} − pay {wall.installGap}</p>
        </div>
        {squareDiff > 0 && (
          <div>
            <span className="text-[10px] text-[var(--color-text-dim)] uppercase">Alt–üst farkı</span>
            <p className={`text-sm font-mono font-bold ${squareDiff <= 3 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
              {squareDiff} mm {squareDiff <= 3 ? '✓' : '⚠'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
