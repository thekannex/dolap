import { useState, useCallback, useMemo } from 'react';
import { useUIStore } from '../../../stores/ui-store';
import type { CabinetState } from '../../../core/models/cabinet';
import type { CalculationTrace } from '../../../core/models/common';
import type { ComputedCabinet, ComputedPart } from '../../../core/engine/compute-cabinet';
import { hasRails } from '../../../core/engine/compute-cabinet';

function DimLine({ x1, y1, x2, y2, label, offset = 20, side = 'bottom', fs = 12 }: {
  x1: number; y1: number; x2: number; y2: number; label: string;
  offset?: number; side?: 'bottom' | 'left'; fs?: number;
}) {
  if (side === 'bottom') {
    const ly = y1 + offset;
    return (
      <g>
        <line x1={x1} y1={y1} x2={x1} y2={ly + 4} stroke="var(--color-text-dim)" strokeWidth={0.5} />
        <line x1={x2} y1={y2} x2={x2} y2={ly + 4} stroke="var(--color-text-dim)" strokeWidth={0.5} />
        <line x1={x1} y1={ly} x2={x2} y2={ly} stroke="var(--color-text-dim)" strokeWidth={0.8} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        <text x={(x1 + x2) / 2} y={ly + fs * 1.15} textAnchor="middle" fill="var(--color-text-muted)" fontSize={fs} fontFamily="var(--font-mono)">{label}</text>
      </g>
    );
  }
  const lx = x1 - offset;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={lx - 4} y2={y1} stroke="var(--color-text-dim)" strokeWidth={0.5} />
      <line x1={x2} y1={y2} x2={lx - 4} y2={y2} stroke="var(--color-text-dim)" strokeWidth={0.5} />
      <line x1={lx} y1={y1} x2={lx} y2={y2} stroke="var(--color-text-dim)" strokeWidth={0.8} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <text x={lx - fs * 0.45} y={my} textAnchor="middle" fill="var(--color-text-muted)" fontSize={fs} fontFamily="var(--font-mono)"
        transform={`rotate(-90, ${lx - fs * 0.45}, ${my})`}>{label}</text>
    </g>
  );
}

const BODY = '#e7d5b9';
const BODY_HOVER = '#d6bd96';
const FRONT = '#dbe8f4';
const FRONT_HOVER = '#c3d7ea';

export default function CabinetPreview({ cabinet, computed }: { cabinet: CabinetState; computed: ComputedCabinet }) {
  const setHoveredPartId = useUIStore((s) => s.setHoveredPartId);
  const hoveredPartId = useUIStore((s) => s.hoveredPartId);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; trace: CalculationTrace; name: string; dims: string } | null>(null);
  const [showFronts, setShowFronts] = useState(true);

  const { width: W, height: H, bodyThickness: t, doorGap: d } = cabinet;
  // Yazı boyutu dolap ölçüsüyle ölçeklenir ki küçük/büyük dolapta okunur kalsın
  const fs = Math.max(14, Math.max(W, H) / 32);
  const padding = Math.max(90, fs * 4);
  const svgW = W + padding * 2;
  const svgH = H + padding * 2;
  const ox = padding;
  const oy = padding;

  const partMap = useMemo(() => new Map(computed.parts.map((p: ComputedPart) => [p.id, p])), [computed.parts]);

  const hover = useCallback((partId: string | null, evt?: React.MouseEvent) => {
    setHoveredPartId(partId);
    const part = partId ? partMap.get(partId) : undefined;
    if (part && evt) {
      setTooltip({ x: evt.clientX, y: evt.clientY, trace: part.trace, name: part.name, dims: `${part.length} × ${part.width} × ${part.thickness}` });
    } else {
      setTooltip(null);
    }
  }, [setHoveredPartId, partMap]);

  const partProps = (id: string, front = false) => ({
    fill: hoveredPartId === id ? (front ? FRONT_HOVER : BODY_HOVER) : (front ? FRONT : BODY),
    onMouseEnter: (e: React.MouseEvent) => hover(id, e),
    onMouseMove: (e: React.MouseEvent) => hover(id, e),
    onMouseLeave: () => hover(null),
    className: 'cursor-help',
  });

  if (cabinet.type === 'filler') {
    return (
      <div className="relative flex-1 flex items-center justify-center overflow-auto bg-[var(--color-bg)] p-4">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="max-w-full max-h-full w-full h-full">
          <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--color-text-dim)" strokeWidth="0.8" /></marker></defs>
          <rect x={ox} y={oy} width={W} height={H} stroke="#6ba3d6" strokeWidth={1} {...partProps('filler', true)} />
          <DimLine x1={ox} y1={oy + H} x2={ox + W} y2={oy + H} label={`${W}`} offset={fs * 2} fs={fs} />
          <DimLine x1={ox} y1={oy} x2={ox} y2={oy + H} label={`${H}`} offset={fs * 2} side="left" fs={fs} />
        </svg>
        {tooltip && <Tooltip tooltip={tooltip} />}
      </div>
    );
  }

  const withRails = hasRails(cabinet);
  const hasDrawers = computed.drawerFrontHeights.length > 0;

  // Kapak başlangıç noktası ve adımı, kapak tipine göre
  let doorX0 = ox + d / 2;
  let doorStep = computed.doorWidth + d;
  let doorY0 = oy + d / 2;
  if (cabinet.doorOverlayType === 'inset') {
    doorX0 = ox + t + d;
    doorStep = computed.doorWidth + 2 * d;
    doorY0 = oy + t + d;
  } else if (cabinet.doorOverlayType === 'half') {
    doorX0 = ox + (t - cabinet.halfOverlayAmount) + d / 2;
  }

  const shelfCount = cabinet.shelfCount + cabinet.fixedShelfCount;

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden bg-[var(--color-bg)]">
      <div className="flex items-center gap-3 px-4 py-2 text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <span>Önden görünüş</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={showFronts} onChange={(e) => setShowFronts(e.target.checked)} className="accent-[var(--color-accent)]" />
          Kapak ve klapaları göster
        </label>
        <span className="ml-auto text-[var(--color-text-dim)]">Hesabı görmek için bir parçanın üzerine gelin</span>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="max-w-full max-h-full w-full h-full">
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--color-text-dim)" strokeWidth="0.8" />
            </marker>
          </defs>

          {/* İç boşluk */}
          <rect x={ox + t} y={oy + t} width={W - 2 * t} height={H - 2 * t} fill={cabinet.hasBackPanel ? '#f4f4f5' : 'none'} stroke="none" />

          <rect x={ox} y={oy} width={t} height={H} stroke="#a8916f" strokeWidth={0.8} {...partProps('side-left')} />
          <rect x={ox + W - t} y={oy} width={t} height={H} stroke="#a8916f" strokeWidth={0.8} {...partProps('side-right')} />
          <rect x={ox + t} y={oy + H - t} width={W - 2 * t} height={t} stroke="#a8916f" strokeWidth={0.8} {...partProps('bottom')} />
          {withRails ? (
            <rect x={ox + t} y={oy} width={W - 2 * t} height={t} stroke="#a8916f" strokeWidth={0.8} strokeDasharray="4,2" {...partProps('rail-front')} />
          ) : (
            <rect x={ox + t} y={oy} width={W - 2 * t} height={t} stroke="#a8916f" strokeWidth={0.8} {...partProps('top')} />
          )}

          {/* Raflar */}
          {Array.from({ length: shelfCount }, (_, i) => {
            const y = oy + t + ((H - 2 * t) / (shelfCount + 1)) * (i + 1) - t / 2;
            const fixed = i >= cabinet.shelfCount;
            const id = fixed ? 'fixed-shelf' : 'adj-shelf';
            return (
              <rect key={`shelf-${i}`} x={ox + t + (fixed ? 0 : 1)} y={y} width={W - 2 * t - (fixed ? 0 : 2)} height={t}
                stroke="#a8916f" strokeWidth={0.8} strokeDasharray={fixed ? undefined : '6,3'} {...partProps(id)} />
            );
          })}

          {/* Kapaklar */}
          {showFronts && computed.doorCount > 0 && Array.from({ length: computed.doorCount }, (_, i) => {
            const x = doorX0 + i * doorStep;
            const hingeOnLeft = cabinet.doorHingeSide === 'both' ? i % 2 === 0 : cabinet.doorHingeSide === 'left';
            return (
              <g key={`door-${i}`} opacity={0.88}>
                <rect x={x} y={doorY0} width={computed.doorWidth} height={computed.doorHeight} stroke="#6ba3d6" strokeWidth={1} rx={2} {...partProps('door', true)} />
                {computed.hingePositions.map((pos, hi) => (
                  <circle key={hi} cx={hingeOnLeft ? x + 22.5 : x + computed.doorWidth - 22.5} cy={doorY0 + pos} r={17.5}
                    fill="none" stroke="var(--color-warning)" strokeWidth={1.5} pointerEvents="none" />
                ))}
                <line x1={hingeOnLeft ? x + computed.doorWidth - 35 : x + 35} y1={doorY0 + Math.min(150, computed.doorHeight * 0.15)}
                  x2={hingeOnLeft ? x + computed.doorWidth - 35 : x + 35} y2={doorY0 + Math.min(150, computed.doorHeight * 0.15) + 96}
                  stroke="#52525b" strokeWidth={5} strokeLinecap="round" pointerEvents="none" />
              </g>
            );
          })}

          {/* Çekmece klapaları */}
          {showFronts && hasDrawers && (() => {
            let y = oy + d / 2;
            return computed.drawerFrontHeights.map((fh, i) => {
              const dy = y;
              y += fh + d;
              const id = `drawer-front-${i}`;
              return (
                <g key={id} opacity={0.88}>
                  <rect x={ox + d / 2} y={dy} width={computed.drawerFrontWidth} height={fh} stroke="#6ba3d6" strokeWidth={1} rx={2} {...partProps(id, true)} />
                  <line x1={ox + W / 2 - 64} y1={dy + Math.min(40, fh / 2)} x2={ox + W / 2 + 64} y2={dy + Math.min(40, fh / 2)}
                    stroke="#52525b" strokeWidth={5} strokeLinecap="round" pointerEvents="none" />
                  <text x={ox + W - 20} y={dy + fh - 12} textAnchor="end" fill="#6b7280" fontSize={fs * 0.9} fontFamily="var(--font-mono)" pointerEvents="none">{fh}</text>
                </g>
              );
            });
          })()}

          <DimLine x1={ox} y1={oy + H} x2={ox + W} y2={oy + H} label={`${W}`} offset={fs * 2} fs={fs} />
          <DimLine x1={ox} y1={oy} x2={ox} y2={oy + H} label={`${H}`} offset={fs * 2} side="left" fs={fs} />
          {!showFronts && (
            <DimLine x1={ox + t} y1={oy + H - t} x2={ox + W - t} y2={oy + H - t} label={`iç ${computed.innerWidth}`} offset={fs} fs={fs * 0.85} />
          )}
        </svg>
      </div>
      {tooltip && <Tooltip tooltip={tooltip} />}
    </div>
  );
}

function Tooltip({ tooltip }: { tooltip: { x: number; y: number; trace: CalculationTrace; name: string; dims: string } }) {
  return (
    <div className="fixed z-50 p-3 rounded-lg shadow-xl border max-w-xs pointer-events-none bg-[var(--color-bg-card)] border-[var(--color-border)]"
      style={{ left: Math.min(tooltip.x + 14, window.innerWidth - 300), top: tooltip.y + 14 }}>
      <p className="text-xs font-semibold text-[var(--color-accent)]">{tooltip.name}</p>
      <p className="text-xs font-mono text-[var(--color-text)] mt-0.5">{tooltip.dims} mm</p>
      <p className="text-xs text-[var(--color-text-muted)] font-mono mt-1">{tooltip.trace.formula}</p>
      <div className="mt-1 text-[11px] text-[var(--color-text-dim)]">
        {Object.entries(tooltip.trace.inputs).map(([k, v]) => <span key={k} className="mr-2">{k}={String(v)}</span>)}
      </div>
      <p className="mt-1 text-xs text-[var(--color-text)]">{tooltip.trace.description}</p>
    </div>
  );
}
