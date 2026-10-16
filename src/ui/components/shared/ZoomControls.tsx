import { Maximize2, Minus, Plus } from 'lucide-react';

/** Çizim alanının köşesindeki yakınlaştırma düğmeleri. */
export default function ZoomControls({ zoom, onIn, onOut, onFit }: { zoom: number; onIn: () => void; onOut: () => void; onFit: () => void }) {
  const btn = 'p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]/70 transition-colors';
  return (
    <div className="absolute bottom-3 right-3 z-10 flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]/95 shadow-sm overflow-hidden"
      title="Tekerlek: yakınlaştır · Orta tuş ya da Boşluk + sürükle: kaydır">
      <button className={btn} onClick={onOut} aria-label="Uzaklaştır"><Minus size={14} /></button>
      <button className="px-2 text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text)] min-w-12" onClick={onFit} aria-label="Sığdır">
        %{zoom}
      </button>
      <button className={btn} onClick={onIn} aria-label="Yakınlaştır"><Plus size={14} /></button>
      <button className={`${btn} border-l border-[var(--color-border)]`} onClick={onFit} aria-label="Ekrana sığdır" title="Ekrana sığdır"><Maximize2 size={13} /></button>
    </div>
  );
}
