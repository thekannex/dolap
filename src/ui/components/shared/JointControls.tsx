import type { CabinetState } from '../../../core/models/cabinet';
import { hasRails, jointsOf } from '../../../core/engine/compute-cabinet';

type Joint = 'between' | 'over';
type JointCab = Pick<CabinetState, 'assemblyType' | 'topJoint' | 'bottomJoint' | 'plinthHeight' | 'type' | 'railWidth'>;

/** Gövdenin küçük şeması: vurgulanan tablanın dikmelere göre konumu. */
function JointIcon({ edge, joint }: { edge: 'top' | 'bottom'; joint: Joint }) {
  const t = 4;
  const sideY = edge === 'top' ? (joint === 'over' ? t : 0) : 0;
  const sideH = 28 - (joint === 'over' ? t : 0);
  const panelX = joint === 'over' ? 0 : t;
  const panelW = joint === 'over' ? 24 : 24 - 2 * t;
  const panelY = edge === 'top' ? 0 : 28 - t;
  return (
    <svg width="22" height="26" viewBox="-1 -1 26 30" aria-hidden className="shrink-0">
      <rect x={0} y={edge === 'bottom' ? 0 : sideY} width={t} height={sideH} className="fill-[var(--color-text-dim)]" />
      <rect x={24 - t} y={edge === 'bottom' ? 0 : sideY} width={t} height={sideH} className="fill-[var(--color-text-dim)]" />
      <rect x={panelX} y={panelY} width={panelW} height={t} className="fill-[var(--color-accent)]" />
    </svg>
  );
}

function JointRow({ label, edge, value, options, disabled, hint, onChange }: {
  label: string; edge: 'top' | 'bottom'; value: Joint; disabled?: boolean; hint?: string;
  options: Array<{ value: Joint; label: string }>; onChange: (v: Joint) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} disabled={disabled}
              onClick={() => onChange(o.value)}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                on ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'}`}>
              <JointIcon edge={edge} joint={o.value} />
              {o.label}
            </button>
          );
        })}
      </div>
      {hint && <p className="text-[11px] text-[var(--color-text-dim)]">{hint}</p>}
    </div>
  );
}

/** Üst ve alt tablanın dikmelerle birleşimi: arada mı, dikmelerin üstünde/altında mı. */
export default function JointControls({ cabinet, onChange }: { cabinet: JointCab; onChange: (patch: Partial<CabinetState>) => void }) {
  const j = jointsOf(cabinet);
  const rails = hasRails(cabinet as CabinetState);
  const plinth = cabinet.plinthHeight > 0;
  const top: Joint = j.topOver && !rails ? 'over' : 'between';
  const bottom: Joint = j.bottomOver && !plinth ? 'over' : 'between';
  const commit = (topJoint: Joint, bottomJoint: Joint) => onChange({
    topJoint, bottomJoint,
    // Eski montaj tipi alanı da tutarlı kalsın
    assemblyType: topJoint === 'over' && bottomJoint === 'over' ? 'sides_in' : 'sides_out',
  });
  return (
    <div className="flex flex-col gap-3">
      <JointRow label="Üst tabla" edge="top" value={top} disabled={rails}
        hint={rails ? 'Kuşaklı alt dolapta üst tabla yok; kuşaklar dikmelerin arasına girer.' : undefined}
        options={[{ value: 'between', label: 'Dikmelerin arasında' }, { value: 'over', label: 'Dikmelerin üstünde' }]}
        onChange={(v) => commit(v, j.bottomOver ? 'over' : 'between')} />
      <JointRow label="Alt tabla" edge="bottom" value={bottom} disabled={plinth}
        hint={plinth ? 'Bazalı dolapta alt tabla dikmelerin arasında kalır.' : undefined}
        options={[{ value: 'between', label: 'Dikmelerin arasında' }, { value: 'over', label: 'Dikmelerin altında' }]}
        onChange={(v) => commit(j.topOver ? 'over' : 'between', v)} />
    </div>
  );
}
