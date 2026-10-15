import { AlertTriangle, AlertCircle, Info, Lightbulb } from 'lucide-react';
import type { ComputedCabinet, ComputedPart, PartGroup } from '../../../core/engine/compute-cabinet';
import type { CabinetState } from '../../../core/models/cabinet';
import type { ValidationWarning } from '../../../core/models/common';
import { PRACTICAL_TIPS } from '../../../core/rules/tips';
import { bandLabel } from '../../../core/utils/format';
import { useUIStore } from '../../../stores/ui-store';

const GROUPS: PartGroup[] = ['body', 'shelf', 'door', 'drawer'];
const GROUP_LABELS: Record<PartGroup, string> = { body: 'Gövde', door: 'Ön yüz', shelf: 'Raf', drawer: 'Çekmece' };

export function PartsList({ computed }: { computed: ComputedCabinet }) {
  const hoveredPartId = useUIStore((s) => s.hoveredPartId);
  const setHoveredPartId = useUIStore((s) => s.setHoveredPartId);

  return (
    <div className="flex flex-col gap-2 mt-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Parça listesi</h3>
      {GROUPS.map((g) => {
        const parts: ComputedPart[] = computed.parts.filter((p) => p.group === g);
        if (parts.length === 0) return null;
        return (
          <div key={g}>
            <p className="text-[10px] font-semibold uppercase text-[var(--color-text-dim)] mb-1">{GROUP_LABELS[g]}</p>
            <table className="w-full text-xs">
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id}
                    onMouseEnter={() => setHoveredPartId(p.id)} onMouseLeave={() => setHoveredPartId(null)}
                    className={`border-b border-[var(--color-border)]/50 transition-colors ${hoveredPartId === p.id ? 'bg-[var(--color-accent)]/10' : ''}`}>
                    <td className="py-1.5 pr-2">
                      <span className="text-[var(--color-text)]">{p.name}</span>
                      <span className="block text-[10px] text-[var(--color-text-dim)]">{bandLabel(p.bands)} {p.material === 'back' ? '· arkalık levhası' : p.material === 'front' ? '· kapak levhası' : ''}</span>
                    </td>
                    <td className="py-1.5 text-right font-mono whitespace-nowrap">{p.length} × {p.width}</td>
                    <td className="py-1.5 text-right text-[var(--color-text-dim)] pl-2 font-mono">×{p.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {computed.hardware.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase text-[var(--color-text-dim)] mb-1 mt-2">Hırdavat</p>
          <table className="w-full text-xs">
            <tbody>
              {computed.hardware.map((hw, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]/50">
                  <td className="py-1.5">{hw.name}</td>
                  <td className="py-1.5 text-right font-mono">{hw.quantity} {hw.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const SEVERITY_ICON = {
  error: <AlertCircle size={14} className="text-[var(--color-error)] shrink-0" />,
  warning: <AlertTriangle size={14} className="text-[var(--color-warning)] shrink-0" />,
  info: <Info size={14} className="text-[var(--color-info)] shrink-0" />,
};

export function WarningItem({ w, prefix }: { w: ValidationWarning; prefix?: string }) {
  return (
    <div className="flex gap-2 p-2 rounded-md bg-[var(--color-bg)] border-l-2"
      style={{ borderLeftColor: w.severity === 'error' ? 'var(--color-error)' : w.severity === 'warning' ? 'var(--color-warning)' : 'var(--color-info)' }}>
      {SEVERITY_ICON[w.severity]}
      <div className="text-xs">
        <p className="text-[var(--color-text)]">{prefix && <b className="font-mono mr-1">{prefix}</b>}{w.message}</p>
        {w.suggestion && <p className="text-[var(--color-text-dim)] mt-0.5">{w.suggestion}</p>}
      </div>
    </div>
  );
}

export function WarningsPanel({ computed }: { computed: ComputedCabinet }) {
  if (computed.warnings.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-warning)]">Uyarılar</h3>
      {computed.warnings.map((w) => <WarningItem key={w.id} w={w} />)}
    </div>
  );
}

export function TipsPanel({ cabinet }: { cabinet: CabinetState }) {
  const tips = PRACTICAL_TIPS.filter((tip) => {
    if (cabinet.drawerCount > 0 && tip.id === 'TIP_DRAWER_RAIL') return true;
    if (cabinet.doorCount > 0 && tip.id === 'TIP_DOOR_SHORTCUT') return true;
    if (cabinet.shelfCount > 0 && tip.id === 'TIP_ADJ_SHELF') return true;
    if (tip.category === 'measurement') return true;
    return tip.id === 'TIP_FIXED_FIRST' || tip.id === 'TIP_FILLER';
  }).slice(0, 3);

  if (tips.length === 0) return null;
  return (
    <details className="mt-4 group">
      <summary className="text-xs font-bold uppercase tracking-wider text-[var(--color-success)] cursor-pointer">Pratik ipuçları</summary>
      <div className="flex flex-col gap-2 mt-2">
        {tips.map((tip) => (
          <div key={tip.id} className="flex gap-2 p-2 rounded-md bg-[var(--color-bg)] border-l-2 border-l-[var(--color-accent)]">
            <Lightbulb size={14} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-[var(--color-text)]">{tip.title}</p>
              <p className="text-[var(--color-text-dim)] mt-0.5">{tip.content}</p>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
