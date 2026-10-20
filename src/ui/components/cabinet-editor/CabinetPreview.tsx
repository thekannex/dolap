import { useState, useCallback, useMemo, useRef } from 'react';
import { useUIStore } from '../../../stores/ui-store';
import type { ProjectCabinet } from '../../../core/models/cabinet';
import type { CalculationTrace } from '../../../core/models/common';
import type { ComputedPart } from '../../../core/engine/compute-cabinet';
import { hasRails, jointsOf } from '../../../core/engine/compute-cabinet';
import { COUNTERTOP_OVERHANG } from '../../../core/layout/scene-layout';
import SinkTopView from './SinkTopView';
import InteriorSvg from '../interior/InteriorSvg';
import type { CellRef } from '../interior/InteriorSvg';
import InteriorDims from '../interior/InteriorDims';
import type { DimFocus } from '../interior/InteriorDims';
import { useInteriorFrame } from '../interior/use-interior-frame';
import { layoutInterior, moveDivider, movePartition, moveShelf } from '../../../core/engine/interior';
import { useCabinetCalculations } from '../../hooks/use-cabinet-calculations';
import { useProjectStore } from '../../../stores/project-store';
import { useZoomPan } from '../shared/use-zoom-pan';
import ZoomControls from '../shared/ZoomControls';

type PreviewDrag =
  | { kind: 'w'; cab: ProjectCabinet }
  | { kind: 'h'; cab: ProjectCabinet }
  | { kind: 'wh'; cab: ProjectCabinet }
  | { kind: 'divider'; index: number; cab: ProjectCabinet }
  | { kind: 'partition'; col: number; cell: number; cab: ProjectCabinet }
  | { kind: 'shelf'; col: number; cell: number; index: number; cab: ProjectCabinet };

const snap10 = (v: number) => Math.round(v / 10) * 10;

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

export default function CabinetPreview({ cabinet: base, selectedCell = null, onSelectCell }: {
  cabinet: ProjectCabinet; selectedCell?: CellRef | null; onSelectCell?: (ref: CellRef | null) => void;
}) {
  const [drag, setDrag] = useState<PreviewDrag | null>(null);
  // Sürüklerken taslak dolap çizilir; bırakınca kaydedilir
  const cabinet = drag?.cab ?? base;
  const computed = useCabinetCalculations(cabinet);
  const frame = useInteriorFrame(base);
  const updateCabinet = useProjectStore((s) => s.updateCabinet);
  const setBoxGeometry = useProjectStore((s) => s.setBoxGeometry);
  const svgRef = useRef<SVGSVGElement>(null);
  const setHoveredPartId = useUIStore((s) => s.setHoveredPartId);
  const hoveredPartId = useUIStore((s) => s.hoveredPartId);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; trace: CalculationTrace; name: string; dims: string } | null>(null);
  const [showFronts, setShowFronts] = useState(true);
  const [view, setView] = useState<'front' | 'top'>('front');

  const { width: W, height: Htot, bodyThickness: t, doorGap: d } = cabinet;
  // Ayaklı dolapta gövde ayak kadar yukarıda başlar
  const legs = computed.legHeight;
  const H = Htot - legs;
  // Yazı boyutu dolap ölçüsüyle ölçeklenir ki küçük/büyük dolapta okunur kalsın
  const fs = Math.max(14, Math.max(base.width, base.height) / 32);
  const padding = Math.max(90, fs * 4);
  const svgW = base.width + padding * 2;
  const svgH = base.height + padding * 2;
  const ox = padding;
  const bottomY = padding + base.height;
  const oy = bottomY - Htot;
  const zp = useZoomPan({ x: 0, y: 0, w: svgW, h: svgH }, svgRef);

  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM()!.inverse());
  };
  const begin = (d: PreviewDrag) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* yakalanamayan işaretçi: sürükleme yine çalışır */ }
    setDrag(d);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toSvg(e);
    if (drag.kind === 'w' || drag.kind === 'h' || drag.kind === 'wh') {
      const width = drag.kind === 'h' ? base.width : Math.min(3000, Math.max(100, snap10(p.x - ox)));
      const height = drag.kind === 'w' ? base.height : Math.min(2800, Math.max(100, snap10(bottomY - p.y)));
      setDrag({ ...drag, cab: { ...base, width, height } });
      return;
    }
    if (!base.interior) return;
    const lx = p.x - ox;
    const ly = bottomY - legs - p.y;
    const geo = layoutInterior(base.interior, frame);
    let interior = base.interior;
    if (drag.kind === 'divider') {
      const colX = geo.columns[drag.index].x;
      interior = moveDivider(drag.index, colX + snap10(lx - frame.t / 2 - colX))(base.interior, frame);
    } else {
      const cell = geo.cells.find((c) => c.col === drag.col && c.cell === drag.cell);
      if (!cell) return;
      interior = drag.kind === 'partition'
        ? movePartition(drag.col, drag.cell, cell.opening.y + snap10(ly - frame.t / 2 - cell.opening.y))(base.interior, frame)
        : moveShelf(drag.col, drag.cell, drag.index, snap10(ly - cell.opening.y - frame.t / 2))(base.interior, frame);
    }
    setDrag({ ...drag, cab: { ...base, interior } });
  };
  const onUp = () => {
    if (!drag) return;
    const c = drag.cab;
    if (drag.kind === 'w' || drag.kind === 'h' || drag.kind === 'wh') {
      if (c.width !== base.width || c.height !== base.height) {
        if (base.groupId) setBoxGeometry(base.id, { width: c.width, height: c.height });
        else updateCabinet(base.id, { width: c.width, height: c.height });
      }
    } else if (c.interior) {
      updateCabinet(base.id, { interior: c.interior });
    }
    setDrag(null);
  };
  const focus: DimFocus = drag?.kind === 'divider' ? { kind: 'divider', index: drag.index }
    : drag?.kind === 'partition' ? { kind: 'partition', col: drag.col, cell: drag.cell }
      : drag?.kind === 'shelf' ? { kind: 'shelf', col: drag.col, cell: drag.cell, index: drag.index } : null;
  const resizing = drag?.kind === 'w' || drag?.kind === 'h' || drag?.kind === 'wh';

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
  // Tabla birleşimi: tam en tabla dikmenin üstüne/altına biner
  const joints = jointsOf(cabinet);
  const hasDrawers = computed.drawerFrontHeights.length > 0;
  const liftUp = cabinet.doorOpening === 'up';

  // Kapak arkasındaki yan dikmeler (tam bindirmede etkisiz)
  const lb = cabinet.doorOverlayType !== 'full' && Boolean(cabinet.leftSideBehind) && partMap.has('side-left');
  const rb = cabinet.doorOverlayType !== 'full' && Boolean(cabinet.rightSideBehind);
  const behindMark = (on: boolean) => (on ? { stroke: '#ea580c', strokeDasharray: '6,3', strokeWidth: 1.4 } : {});
  // Kapak başlangıç noktası ve adımı, kapak tipine göre
  let doorX0 = ox + d / 2;
  let doorStep = computed.doorWidth + d;
  let doorY0 = oy + d / 2;
  if (cabinet.doorOverlayType === 'inset') {
    doorX0 = ox + (lb ? 0 : t) + d;
    doorStep = computed.doorWidth + 2 * d;
    doorY0 = oy + t + d;
  } else if (cabinet.doorOverlayType === 'half') {
    doorX0 = ox + (lb ? 0 : t - cabinet.halfOverlayAmount) + d / 2;
  }

  const shelfCount = cabinet.shelfCount + cabinet.fixedShelfCount;
  const P = Math.max(0, Math.min(cabinet.plinthHeight || 0, H / 2));
  const topOver = joints.topOver && !withRails;
  const bottomOver = joints.bottomOver && P === 0 && partMap.has('bottom');
  const sideY = oy + (topOver ? t : 0);
  const sideH = H - (topOver ? t : 0) - (bottomOver ? t : 0);
  const span = (over: boolean) => (over ? { x: ox, width: W } : { x: ox + t, width: W - 2 * t });
  const innerTop = oy + t;
  const innerH = H - 2 * t - P;
  const rods = Math.max(0, Math.floor(cabinet.hangerRodCount || 0));
  // Askılı dolapta raflar üstte şapkalık olarak 300mm aralıkla dizilir, askı rafın altına gelir
  const shelfY = (i: number) => (rods > 0
    ? innerTop + Math.min(300 * (i + 1), innerH * 0.4) - t / 2
    : innerTop + (innerH / (shelfCount + 1)) * (i + 1) - t / 2);
  const rodTop = rods > 0 && shelfCount > 0 ? shelfY(shelfCount - 1) + t + 60 : innerTop + 80;
  const rodYs = Array.from({ length: rods }, (_, i) => rodTop + i * ((innerTop + innerH - rodTop) / rods));

  return (
    <div data-tour="editor-preview" className="relative flex-1 flex flex-col overflow-hidden bg-[var(--color-bg)]">
      <div className="flex items-center gap-3 px-4 py-2 text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
        {computed.sink ? (
          <div role="radiogroup" aria-label="Görünüş" className="flex rounded-md border border-[var(--color-border)] overflow-hidden">
            {([['front', 'Önden'], ['top', 'Tezgâh (üstten)']] as const).map(([val, label]) => (
              <button key={val} role="radio" aria-checked={view === val} onClick={() => setView(val)}
                className={`px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors ${view === val ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]/60'}`}>
                {label}
              </button>
            ))}
          </div>
        ) : <span>Önden görünüş</span>}
        <label className={`flex items-center gap-1.5 cursor-pointer ${computed.sink && view === 'top' ? 'invisible' : ''}`}>
          <input type="checkbox" checked={showFronts} onChange={(e) => setShowFronts(e.target.checked)} className="accent-[var(--color-accent)]" />
          Kapak ve klapaları göster
        </label>
        <span className="ml-auto text-[var(--color-text-dim)]">Kenar tutamaçlarıyla boyutlandırın · Tekerlek: yakınlaştır · Parçanın üzerine gelin: hesabı</span>
      </div>
      <div className="relative flex-1 flex items-center justify-center overflow-hidden p-4">
        {computed.sink && view === 'top' ? (
          <SinkTopView layout={computed.sink} width={W} depth={cabinet.depth} thickness={t} overhang={COUNTERTOP_OVERHANG} />
        ) : (
        <svg ref={svgRef} {...zp.svgProps} className="max-w-full max-h-full w-full h-full select-none touch-none"
          onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}>
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--color-text-dim)" strokeWidth="0.8" />
            </marker>
          </defs>

          {/* İç boşluk */}
          <rect x={ox + t} y={oy + t} width={W - 2 * t} height={innerH} fill={cabinet.hasBackPanel ? '#f4f4f5' : 'none'} stroke="none" />

          {partMap.has('side-left')
            ? <rect x={ox} y={sideY} width={t} height={sideH} stroke="#a8916f" strokeWidth={0.8} {...partProps('side-left')} {...behindMark(lb)} />
            : <rect x={ox} y={oy} width={t} height={H} fill="none" stroke="#a8916f" strokeWidth={0.8} strokeDasharray="6,4"><title>Sol dikme komşu kutuyla ortak</title></rect>}
          <rect x={ox + W - t} y={sideY} width={t} height={sideH} stroke="#a8916f" strokeWidth={0.8} {...partProps('side-right')} {...behindMark(rb)} />
          {partMap.has('bottom')
            ? <rect {...span(bottomOver)} y={oy + H - P - t} height={t} stroke="#a8916f" strokeWidth={0.8} {...partProps('bottom')} />
            : <rect x={ox + t} y={oy + H - P} width={W - 2 * t} height={t} fill="none" stroke="#a8916f" strokeWidth={0.8} strokeDasharray="6,4"><title>Alt tabla komşu kutuyla ortak</title></rect>}
          {P > 0 && (
            <rect x={ox + t} y={oy + H - P} width={W - 2 * t} height={P} stroke="#a8916f" strokeWidth={0.8} {...partProps('plinth')} />
          )}
          {withRails ? (
            <rect x={ox + t} y={oy} width={W - 2 * t} height={t} stroke="#a8916f" strokeWidth={0.8} strokeDasharray="4,2" {...partProps('rail-front')} />
          ) : (
            <rect {...span(topOver)} y={oy} height={t} stroke="#a8916f" strokeWidth={0.8} {...partProps('top')} />
          )}

          {computed.interior ? (
            <>
              <InteriorSvg geo={computed.interior} fs={fs} X={(x) => ox + x} Y={(y) => oy + H - y} showFronts={showFronts && !drag}
                selected={selectedCell}
                onCellDown={(ref) => (e) => { if (e.button === 0) onSelectCell?.(ref); }}
                onDividerDown={(index) => begin({ kind: 'divider', index, cab: base })}
                onPartitionDown={(col, cell) => begin({ kind: 'partition', col, cell, cab: base })}
                onShelfDown={(col, cell, index) => begin({ kind: 'shelf', col, cell, index, cab: base })} />
              <InteriorDims geo={computed.interior} fs={fs} t={t} X={(x) => ox + x} Y={(y) => oy + H - y}
                activeCol={focus && focus.kind !== 'divider' ? focus.col : selectedCell?.col ?? 0} focus={focus} />
            </>
          ) : (
          <>
          {/* Raflar */}
          {Array.from({ length: shelfCount }, (_, i) => {
            const y = shelfY(i);
            const fixed = i >= cabinet.shelfCount;
            const id = fixed ? 'fixed-shelf' : 'adj-shelf';
            return (
              <rect key={`shelf-${i}`} x={ox + t + (fixed ? 0 : 1)} y={y} width={W - 2 * t - (fixed ? 0 : 2)} height={t}
                stroke="#a8916f" strokeWidth={0.8} strokeDasharray={fixed ? undefined : '6,3'} {...partProps(id)} />
            );
          })}

          {/* Askı borusu */}
          {rodYs.map((y, i) => (
            <g key={`rod-${i}`} pointerEvents="none">
              <line x1={ox + t + 6} y1={y} x2={ox + W - t - 6} y2={y} stroke="#71717a" strokeWidth={Math.max(6, fs * 0.5)} strokeLinecap="round" />
              <text x={ox + W / 2} y={y + fs * 1.4} textAnchor="middle" fill="#71717a" fontSize={fs * 0.9}>askı</text>
            </g>
          ))}

          {/* Kapaklar */}
          {showFronts && liftUp && computed.doorCount > 0 && Array.from({ length: computed.doorCount }, (_, i) => {
            // Yukarı açılır: paneller üst üste, menteşeler her panelin üst kenarında, kulp en alttaki panelde
            const x = doorX0;
            const y = doorY0 + i * (computed.doorHeight + d);
            const last = i === computed.doorCount - 1;
            return (
              <g key={`door-${i}`} opacity={0.88}>
                <rect x={x} y={y} width={computed.doorWidth} height={computed.doorHeight} stroke="#6ba3d6" strokeWidth={1} rx={2} {...partProps('door', true)} />
                {computed.hingePositions.map((pos, hi) => (
                  <circle key={hi} cx={x + pos} cy={y + 22.5} r={17.5} fill="none" stroke="var(--color-warning)" strokeWidth={1.5} pointerEvents="none" />
                ))}
                {last && (
                  <line x1={x + computed.doorWidth / 2 - 64} y1={y + computed.doorHeight - 35} x2={x + computed.doorWidth / 2 + 64} y2={y + computed.doorHeight - 35}
                    stroke="#52525b" strokeWidth={5} strokeLinecap="round" pointerEvents="none" />
                )}
                {i === 0 && (
                  <text x={x + computed.doorWidth / 2} y={y + computed.doorHeight / 2} textAnchor="middle" dominantBaseline="middle"
                    fill="#6b8fb3" fontSize={fs * 1.6} pointerEvents="none">↑</text>
                )}
              </g>
            );
          })}
          {showFronts && !liftUp && computed.doorCount > 0 && Array.from({ length: computed.doorCount }, (_, i) => {
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

          </>
          )}

          {legs > 0 && [ox + Math.min(60, W * 0.08), ox + W - Math.min(60, W * 0.08) - 30].map((lx, i) => (
            <path key={`leg-${i}`} d={`M ${lx} ${oy + H} h 30 l -8 ${legs} h -14 z`} fill="#d4af37" stroke="#a16207" strokeWidth={0.8} />
          ))}

          <DimLine x1={ox} y1={oy + Htot} x2={ox + W} y2={oy + Htot} label={`${W}`} offset={fs * 2} fs={fs} />
          <DimLine x1={ox} y1={oy} x2={ox} y2={oy + Htot} label={`${Htot}`} offset={fs * 2} side="left" fs={fs} />
          {!showFronts && (
            <DimLine x1={ox + t} y1={oy + H - t} x2={ox + W - t} y2={oy + H - t} label={`iç ${computed.innerWidth}`} offset={fs} fs={fs * 0.85} />
          )}

          {/* Boyut tutamaçları: sağ kenar genişlik, üst kenar yükseklik, köşe ikisi birden */}
          {[
            { kind: 'w' as const, x: ox + W, y: oy + Htot / 2, cursor: 'ew-resize', title: 'Genişliği sürükle' },
            { kind: 'h' as const, x: ox + W / 2, y: oy, cursor: 'ns-resize', title: 'Yüksekliği sürükle' },
            { kind: 'wh' as const, x: ox + W, y: oy, cursor: 'nesw-resize', title: 'Genişlik ve yüksekliği sürükle' },
          ].map((h) => (
            <rect key={h.kind} x={h.x - fs * 0.45} y={h.y - fs * 0.45} width={fs * 0.9} height={fs * 0.9} rx={fs * 0.15}
              fill="#fff" stroke="#ea580c" strokeWidth={fs * 0.12} style={{ cursor: h.cursor }}
              onPointerDown={begin({ kind: h.kind, cab: base } as PreviewDrag)}>
              <title>{h.title}</title>
            </rect>
          ))}
          {resizing && (
            <text x={ox + W / 2} y={oy - fs * 1.2} textAnchor="middle" fontSize={fs * 1.3} fontWeight={700} fill="#ea580c"
              stroke="#fff" strokeWidth={fs * 0.2} paintOrder="stroke" fontFamily="var(--font-mono)">{W} × {Htot}</text>
          )}
        </svg>
        )}
        {!(computed.sink && view === 'top') && <ZoomControls zoom={zp.zoom} onIn={zp.zoomIn} onOut={zp.zoomOut} onFit={zp.fit} />}
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
