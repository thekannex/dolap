import { useMemo, useRef, useState } from 'react';
import type { CabinetInterior, ProjectCabinet } from '../../../core/models/cabinet';
import { interiorFrameOf, layoutInterior, moveDivider, movePartition, moveShelf, cellContentLabel } from '../../../core/engine/interior';
import { compositionComputeOptions } from '../../../core/layout/composition';
import InteriorSvg from '../interior/InteriorSvg';
import { useZoomPan } from '../shared/use-zoom-pan';
import ZoomControls from '../shared/ZoomControls';
import InteriorDims from '../interior/InteriorDims';
import type { DimFocus } from '../interior/InteriorDims';
import type { CellRef } from '../interior/InteriorSvg';
import type { ComputedCabinet } from '../../../core/engine/compute-cabinet';
import { hasRails, jointsOf } from '../../../core/engine/compute-cabinet';
import { boxesOverlap, compositionBounds, detectBoxContent, boxContentLabel } from '../../../core/layout/composition';
import { formatNumber } from '../../../core/utils/format';

export interface Rect { x: number; y: number; w: number; h: number }

type Handle = 'l' | 'r' | 't' | 'b' | 'tl' | 'tr' | 'bl' | 'br';

type Drag =
  | { kind: 'draw'; start: { x: number; y: number }; rect: Rect }
  | { kind: 'move'; id: string; grab: { x: number; y: number }; orig: Rect; rect: Rect; moved: boolean }
  | { kind: 'resize'; id: string; handle: Handle; orig: Rect; rect: Rect }
  | { kind: 'empty-click'; start: { x: number; y: number } }
  | { kind: 'divider'; id: string; index: number; draft: CabinetInterior }
  | { kind: 'partition'; id: string; col: number; cell: number; draft: CabinetInterior }
  | { kind: 'shelf'; id: string; col: number; cell: number; index: number; draft: CabinetInterior };

const GRID = 10;
const MIN = 100;

const rectOf = (c: ProjectCabinet): Rect => ({ x: c.x ?? 0, y: c.elevation ?? 0, w: c.width, h: c.height });
const snapGrid = (v: number) => Math.round(v / GRID) * GRID;

/** v'yi adaylardan tol içindeki en yakına yapıştırır; yoksa ızgaraya. */
function snap(v: number, candidates: number[], tol: number): number {
  let best = snapGrid(v);
  let bestD = tol + 1;
  for (const c of candidates) {
    const d = Math.abs(c - v);
    if (d <= tol && d < bestD) { best = c; bestD = d; }
  }
  return best;
}

export default function ComposerCanvas({ boxes, computedById, selectedId, onSelect, onCommit, onDraw, onDelete, onNudge, selectedCell, onSelectCell, onInteriorCommit }: {
  boxes: ProjectCabinet[];
  computedById: Map<string, ComputedCabinet>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCommit: (id: string, rect: Rect) => void;
  onDraw: (rect: Rect) => void;
  onDelete: (id: string) => void;
  onNudge: (id: string, dx: number, dy: number) => void;
  selectedCell: CellRef | null;
  onSelectCell: (id: string, ref: CellRef | null) => void;
  onInteriorCommit: (id: string, interior: CabinetInterior) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const bounds = compositionBounds(boxes);
  const wsW = Math.max(bounds.width + 1200, 3200);
  const wsH = Math.max(bounds.height + 700, 2700);
  const pad = 260;
  const fs = Math.max(26, Math.min(wsW, wsH * 1.4) / 70);
  const zp = useZoomPan({ x: -pad, y: -pad, w: wsW + pad * 2, h: wsH + pad * 1.6 }, svgRef);

  // mm → svg: y yukarı doğru, zemin en altta
  const SY = (y: number) => wsH - y;

  const xEdges = useMemo(() => [0, ...boxes.flatMap((b) => [b.x ?? 0, (b.x ?? 0) + b.width])], [boxes]);
  const yEdges = useMemo(() => [0, ...boxes.flatMap((b) => [b.elevation ?? 0, (b.elevation ?? 0) + b.height])], [boxes]);

  const toMm = (e: React.PointerEvent | PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: wsH - p.y };
  };
  const tolerance = () => {
    const ctm = svgRef.current?.getScreenCTM();
    return ctm ? 14 / ctm.a : 30;
  };

  const otherEdges = (id: string | null) => ({
    xs: [0, ...boxes.filter((b) => b.id !== id).flatMap((b) => [b.x ?? 0, (b.x ?? 0) + b.width])],
    ys: [0, ...boxes.filter((b) => b.id !== id).flatMap((b) => [b.elevation ?? 0, (b.elevation ?? 0) + b.height])],
  });

  const onPointerDownEmpty = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = toMm(e);
    const tol = tolerance();
    const start = { x: snap(p.x, xEdges, tol), y: Math.max(0, snap(p.y, yEdges, tol)) };
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* yakalanamayan işaretçi: sürükleme yine çalışır */ }
    setDrag({ kind: 'empty-click', start });
  };

  const onPointerDownBox = (e: React.PointerEvent, b: ProjectCabinet) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(b.id);
    const p = toMm(e);
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* yakalanamayan işaretçi: sürükleme yine çalışır */ }
    setDrag({ kind: 'move', id: b.id, grab: { x: p.x - (b.x ?? 0), y: p.y - (b.elevation ?? 0) }, orig: rectOf(b), rect: rectOf(b), moved: false });
  };

  const onPointerDownHandle = (e: React.PointerEvent, b: ProjectCabinet, handle: Handle) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* yakalanamayan işaretçi: sürükleme yine çalışır */ }
    setDrag({ kind: 'resize', id: b.id, handle, orig: rectOf(b), rect: rectOf(b) });
  };

  const frameFor = (b: ProjectCabinet, r: Rect = rectOf(b)) =>
    interiorFrameOf({ ...b, width: r.w, height: r.h }, compositionComputeOptions(b, boxes));
  const legsOf = (b: ProjectCabinet, h: number) => Math.max(0, Math.min(b.legHeight || 0, h / 2));

  const startInterior = (b: ProjectCabinet, d: Drag) => (e: React.PointerEvent) => {
    if (e.button !== 0 || !b.interior) return;
    e.stopPropagation();
    onSelect(b.id);
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* yakalanamayan işaretçi: sürükleme yine çalışır */ }
    setDrag(d);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toMm(e);
    const tol = tolerance();
    if (drag.kind === 'divider' || drag.kind === 'partition' || drag.kind === 'shelf') {
      const b = boxes.find((x) => x.id === drag.id);
      if (!b?.interior) return;
      const frame = frameFor(b);
      // Gövde koordinatı: kutunun sol-alt köşesi, ayaklar hariç. Bölme, göz ve raf ölçüleri 10mm'ye yuvarlanır.
      const lx = p.x - (b.x ?? 0);
      const ly = p.y - (b.elevation ?? 0) - legsOf(b, b.height);
      const geo = layoutInterior(b.interior, frame);
      if (drag.kind === 'divider') {
        const colX = geo.columns[drag.index].x;
        setDrag({ ...drag, draft: moveDivider(drag.index, colX + snapGrid(lx - frame.t / 2 - colX))(b.interior, frame) });
      } else if (drag.kind === 'partition') {
        const cell = geo.cells.find((c) => c.col === drag.col && c.cell === drag.cell);
        if (cell) setDrag({ ...drag, draft: movePartition(drag.col, drag.cell, cell.opening.y + snapGrid(ly - frame.t / 2 - cell.opening.y))(b.interior, frame) });
      } else {
        const cell = geo.cells.find((c) => c.col === drag.col && c.cell === drag.cell);
        if (cell) setDrag({ ...drag, draft: moveShelf(drag.col, drag.cell, drag.index, snapGrid(ly - cell.opening.y - frame.t / 2))(b.interior, frame) });
      }
      return;
    }
    if (drag.kind === 'empty-click' || drag.kind === 'draw') {
      const start = drag.start;
      const { xs, ys } = otherEdges(null);
      const cx = snap(p.x, xs, tol);
      const cy = Math.max(0, snap(p.y, ys, tol));
      if (drag.kind === 'empty-click' && Math.abs(cx - start.x) < MIN / 2 && Math.abs(cy - start.y) < MIN / 2) return;
      setDrag({ kind: 'draw', start, rect: { x: Math.min(start.x, cx), y: Math.min(start.y, cy), w: Math.abs(cx - start.x), h: Math.abs(cy - start.y) } });
      return;
    }
    const { xs, ys } = otherEdges(drag.id);
    if (drag.kind === 'move') {
      const o = drag.orig;
      let x = p.x - drag.grab.x;
      let y = p.y - drag.grab.y;
      // Sol ya da sağ kenarı en yakın komşu kenara yapıştır
      const sxL = snap(x, xs, tol); const sxR = snap(x + o.w, xs, tol) - o.w;
      x = Math.abs(sxL - x) <= Math.abs(sxR - x) ? sxL : sxR;
      const syB = snap(y, ys, tol); const syT = snap(y + o.h, ys, tol) - o.h;
      y = Math.max(0, Math.abs(syB - y) <= Math.abs(syT - y) ? syB : syT);
      const moved = drag.moved || Math.abs(x - o.x) >= GRID || Math.abs(y - o.y) >= GRID;
      setDrag({ ...drag, rect: { ...o, x, y }, moved });
      return;
    }
    // resize
    const o = drag.orig;
    let { x, y, w, h } = o;
    const right = o.x + o.w;
    const top = o.y + o.h;
    if (drag.handle.includes('l')) { const nx = Math.min(snap(p.x, xs, tol), right - MIN); w = right - nx; x = nx; }
    if (drag.handle.includes('r')) { const nr = Math.max(snap(p.x, xs, tol), o.x + MIN); w = nr - o.x; }
    if (drag.handle.includes('b')) { const ny = Math.max(0, Math.min(snap(p.y, ys, tol), top - MIN)); h = top - ny; y = ny; }
    if (drag.handle.includes('t')) { const nt = Math.max(snap(p.y, ys, tol), o.y + MIN); h = nt - o.y; }
    setDrag({ ...drag, rect: { x, y, w, h } });
  };

  const onPointerUp = () => {
    if (!drag) return;
    if (drag.kind === 'empty-click') onSelect(null);
    else if (drag.kind === 'draw') {
      if (drag.rect.w >= MIN && drag.rect.h >= MIN) onDraw(drag.rect);
    } else if (drag.kind === 'move') {
      if (drag.moved) onCommit(drag.id, drag.rect);
    } else if (drag.kind === 'resize') {
      onCommit(drag.id, drag.rect);
    } else if (drag.kind === 'divider' || drag.kind === 'partition' || drag.kind === 'shelf') {
      onInteriorCommit(drag.id, drag.draft);
    }
    setDrag(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedId) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onDelete(selectedId); return; }
    const step = e.shiftKey ? 50 : GRID;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const m = moves[e.key];
    if (m) { e.preventDefault(); onNudge(selectedId, m[0], m[1]); }
    if (e.key === 'Escape') onSelect(null);
  };

  const draftFor = (id: string): Rect | null => (drag && (drag.kind === 'move' || drag.kind === 'resize') && drag.id === id ? drag.rect : null);
  const overlapIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      if (boxesOverlap(rectOf(boxes[i]), rectOf(boxes[j]))) { ids.add(boxes[i].id); ids.add(boxes[j].id); }
    }
    return ids;
  }, [boxes]);

  const hs = fs * 0.55; // tutamaç boyutu

  return (
    <div className="relative w-full h-full">
    <svg ref={svgRef} tabIndex={0} onKeyDown={onKeyDown} {...zp.svgProps}
      className="w-full h-full outline-none select-none touch-none" role="application" aria-label="Serbest çizim alanı"
      onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)}>
      <defs>
        <pattern id="grid-minor" width={100} height={100} patternUnits="userSpaceOnUse" x={0} y={wsH % 100}>
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e4e4e7" strokeWidth={1.5} />
        </pattern>
        <pattern id="grid-major" width={500} height={500} patternUnits="userSpaceOnUse" x={0} y={wsH % 500}>
          <rect width={500} height={500} fill="url(#grid-minor)" />
          <path d="M 500 0 L 0 0 0 500" fill="none" stroke="#d4d4d8" strokeWidth={3} />
        </pattern>
      </defs>

      {/* Çalışma alanı ve zemin */}
      <rect x={0} y={0} width={wsW} height={wsH} fill="url(#grid-major)" onPointerDown={onPointerDownEmpty} className="cursor-crosshair" />
      <line x1={-pad / 2} y1={SY(0)} x2={wsW + pad / 2} y2={SY(0)} stroke="#52525b" strokeWidth={8} />
      <text x={-pad / 2} y={SY(0) + fs * 1.4} fontSize={fs * 0.8} fill="#71717a">zemin</text>
      {[500, 1000, 1500, 2000, 2500].filter((v) => v < wsH).map((v) => (
        <text key={v} x={-fs * 0.4} y={SY(v)} textAnchor="end" dominantBaseline="middle" fontSize={fs * 0.7} fill="#a1a1aa" fontFamily="var(--font-mono)">{v}</text>
      ))}

      {boxes.map((b) => {
        const draft = draftFor(b.id);
        const r = draft ?? rectOf(b);
        const comp = computedById.get(b.id);
        const sel = b.id === selectedId;
        const bad = overlapIds.has(b.id);
        const t = b.bodyThickness;
        const hasLeft = comp ? comp.parts.some((p) => p.id === 'side-left') : true;
        const hasBottom = comp ? comp.parts.some((p) => p.id === 'bottom') : true;
        const plinth = Math.min(b.plinthHeight || 0, r.h / 2);
        const jt = jointsOf(b);
        const topOver = jt.topOver && !hasRails(b);
        const bottomOver = jt.bottomOver && plinth === 0 && hasBottom;
        // Kapak arkasındaki yan dikme turuncu kesikli çizilir
        const sideStroke = (on: boolean) => (on && b.doorOverlayType !== 'full'
          ? { stroke: '#ea580c', strokeWidth: fs * 0.12, strokeDasharray: `${fs * 0.4},${fs * 0.25}` }
          : { stroke: '#c9b089', strokeWidth: fs * 0.03 });
        const content = detectBoxContent(b);
        const X = r.x;
        const top = SY(r.y + r.h);
        const legs = legsOf(b, r.h);
        const bottom = SY(r.y + legs);
        const draftInterior = drag && 'draft' in drag && drag.id === b.id ? drag.draft : null;
        const interior = draftInterior ?? b.interior;
        const geo = interior ? layoutInterior(interior, frameFor(b, r)) : null;
        const selCell = sel && selectedCell ? selectedCell : null;
        const interactive = sel && !draft;
        const lockedLabel = geo ? 'Bölmeli' : boxContentLabel(content);
        const label = Math.min(fs * 1.1, r.w / 7, r.h / 3.2);
        return (
          <g key={b.id} opacity={draft ? 0.85 : 1}>
            {legs > 0 && [X + Math.min(60, r.w * 0.08), X + r.w - Math.min(60, r.w * 0.08) - 30].map((lx, i) => (
              <path key={i} d={`M ${lx} ${bottom} h 30 l -8 ${legs} h -14 z`} fill="#d4af37" stroke="#a16207" strokeWidth={fs * 0.05} pointerEvents="none" />
            ))}
            <rect x={X} y={top} width={r.w} height={r.h - legs} fill="#fdf8f1" stroke={bad ? '#dc2626' : sel ? '#ea580c' : '#a8916f'}
              strokeWidth={sel ? fs * 0.22 : fs * 0.1} onPointerDown={(e) => onPointerDownBox(e, b)} className="cursor-move" />
            {/* Gövde panelleri */}
            {hasLeft
              ? <rect x={X} y={top + (topOver ? t : 0)} width={t} height={r.h - legs - (topOver ? t : 0) - (bottomOver ? t : 0)} fill="#e7d5b9" {...sideStroke(Boolean(b.leftSideBehind))} pointerEvents="none" />
              : <line x1={X} y1={top} x2={X} y2={bottom} stroke="#a8916f" strokeWidth={fs * 0.1} strokeDasharray={`${fs * 0.5},${fs * 0.35}`} pointerEvents="none" />}
            <rect x={X + r.w - t} y={top + (topOver ? t : 0)} width={t} height={r.h - legs - (topOver ? t : 0) - (bottomOver ? t : 0)} fill="#e7d5b9" {...sideStroke(Boolean(b.rightSideBehind))} pointerEvents="none" />
            <rect x={topOver ? X : X + t} y={top} width={topOver ? r.w : r.w - 2 * t} height={t} fill="#e7d5b9" stroke="#c9b089" strokeWidth={fs * 0.03} pointerEvents="none" />
            {hasBottom && <rect x={bottomOver ? X : X + t} y={bottom - plinth - t} width={bottomOver ? r.w : r.w - 2 * t} height={t} fill="#e7d5b9" stroke="#c9b089" strokeWidth={fs * 0.03} pointerEvents="none" />}
            {plinth > 0 && <rect x={X + t} y={bottom - plinth} width={r.w - 2 * t} height={plinth} fill="#d6c3a5" pointerEvents="none" />}

            {/* Ön yüz şeması / bölmeli iç düzen */}
            {geo ? (
              <InteriorSvg geo={geo} fs={fs} X={(x) => X + x} Y={(y) => SY(r.y + legs + y)} selected={selCell}
                onCellDown={(ref) => (e) => { onSelectCell(b.id, ref); onPointerDownBox(e, b); }}
                onDividerDown={interactive ? (index) => startInterior(b, { kind: 'divider', id: b.id, index, draft: b.interior! }) : undefined}
                onPartitionDown={interactive ? (col, cell) => startInterior(b, { kind: 'partition', id: b.id, col, cell, draft: b.interior! }) : undefined}
                onShelfDown={interactive ? (col, cell, index) => startInterior(b, { kind: 'shelf', id: b.id, col, cell, index, draft: b.interior! }) : undefined} />
            ) : (!draft && comp && <Fronts b={b} comp={comp} X={X} top={top} plinth={plinth} fs={fs} />)}
            {geo && sel && !draft && (() => {
              const focus: DimFocus = drag && 'draft' in drag && drag.id === b.id
                ? (drag.kind === 'divider' ? { kind: 'divider', index: drag.index }
                  : drag.kind === 'partition' ? { kind: 'partition', col: drag.col, cell: drag.cell }
                    : drag.kind === 'shelf' ? { kind: 'shelf', col: drag.col, cell: drag.cell, index: drag.index } : null)
                : null;
              const activeCol = focus && focus.kind !== 'divider' ? focus.col : selCell ? selCell.col : 0;
              return <InteriorDims geo={geo} fs={fs} t={t} X={(x) => X + x} Y={(y) => SY(r.y + legs + y)} activeCol={activeCol} focus={focus} />;
            })()}

            <text x={X + r.w / 2} y={top + r.h / 2 - label * 0.3} textAnchor="middle" fontSize={label} fontWeight={700} fill="#27272a" stroke="#fff" strokeWidth={label * 0.18} paintOrder="stroke" pointerEvents="none">{b.code}</text>
            <text x={X + r.w / 2} y={top + r.h / 2 + label * 0.85} textAnchor="middle" fontSize={label * 0.75} fill="#3f3f46" stroke="#fff" strokeWidth={label * 0.14} paintOrder="stroke" pointerEvents="none">
              {lockedLabel} · {formatNumber(r.w)}×{formatNumber(r.h)}
            </text>

            {sel && !drag && (['l', 'r', 't', 'b', 'tl', 'tr', 'bl', 'br'] as Handle[]).map((h) => {
              const hx = h.includes('l') ? X : h.includes('r') ? X + r.w : X + r.w / 2;
              const hy = h.includes('t') ? top : h.includes('b') ? bottom : top + r.h / 2;
              const cursor = h === 'l' || h === 'r' ? 'ew-resize' : h === 't' || h === 'b' ? 'ns-resize' : h === 'tl' || h === 'br' ? 'nwse-resize' : 'nesw-resize';
              return (
                <rect key={h} x={hx - hs / 2} y={hy - hs / 2} width={hs} height={hs} fill="#fff" stroke="#ea580c" strokeWidth={fs * 0.1}
                  style={{ cursor }} onPointerDown={(e) => onPointerDownHandle(e, b, h)} />
              );
            })}
            {sel && selCell && geo && !draft && (() => {
              const c = geo.cells.find((x) => x.col === selCell.col && x.cell === selCell.cell);
              return c ? (
                <text x={X + r.w / 2} y={top - fs * 3.1} textAnchor="middle" fontSize={fs * 0.8} fill="#ea580c" pointerEvents="none">
                  {`${selCell.col + 1}${String.fromCharCode(65 + selCell.cell)}: ${cellContentLabel(c.data)} · ${formatNumber(c.opening.w)}×${formatNumber(c.opening.h)}`}
                </text>
              ) : null;
            })()}
            {draft && (
              <text x={X + r.w / 2} y={top - fs * 0.5} textAnchor="middle" fontSize={fs * 0.9} fill="#ea580c" fontFamily="var(--font-mono)" pointerEvents="none">
                {formatNumber(r.w)} × {formatNumber(r.h)} · yerden {formatNumber(r.y)}
              </text>
            )}
          </g>
        );
      })}

      {drag?.kind === 'draw' && (
        <g pointerEvents="none">
          <rect x={drag.rect.x} y={SY(drag.rect.y + drag.rect.h)} width={drag.rect.w} height={drag.rect.h}
            fill="#ea580c" fillOpacity={0.08} stroke="#ea580c" strokeWidth={fs * 0.15} strokeDasharray={`${fs * 0.6},${fs * 0.4}`} />
          <text x={drag.rect.x + drag.rect.w / 2} y={SY(drag.rect.y + drag.rect.h) - fs * 0.5} textAnchor="middle" fontSize={fs * 0.9} fill="#ea580c" fontFamily="var(--font-mono)">
            {formatNumber(drag.rect.w)} × {formatNumber(drag.rect.h)} · yerden {formatNumber(drag.rect.y)}
          </text>
        </g>
      )}

      {/* Toplam ölçüler */}
      {boxes.length > 0 && (
        <g pointerEvents="none">
          <line x1={0} y1={SY(0) + fs * 2.6} x2={bounds.width} y2={SY(0) + fs * 2.6} stroke="#71717a" strokeWidth={fs * 0.08} />
          <text x={bounds.width / 2} y={SY(0) + fs * 2.3} textAnchor="middle" fontSize={fs * 0.9} fill="#27272a" fontFamily="var(--font-mono)">{formatNumber(bounds.width)}</text>
          <line x1={-fs * 2.4} y1={SY(0)} x2={-fs * 2.4} y2={SY(bounds.height)} stroke="#71717a" strokeWidth={fs * 0.08} />
          <text x={-fs * 2.8} y={SY(bounds.height / 2)} textAnchor="middle" fontSize={fs * 0.9} fill="#27272a" fontFamily="var(--font-mono)"
            transform={`rotate(-90, ${-fs * 2.8}, ${SY(bounds.height / 2)})`}>{formatNumber(bounds.height)}</text>
        </g>
      )}
    </svg>
    <ZoomControls zoom={zp.zoom} onIn={zp.zoomIn} onOut={zp.zoomOut} onFit={zp.fit} />
    </div>
  );
}

/** Kapak, çekmece ve raf çizgileri (yalnızca şema). */
function Fronts({ b, comp, X, top, plinth, fs }: { b: ProjectCabinet; comp: ComputedCabinet; X: number; top: number; plinth: number; fs: number }) {
  const d = b.doorGap;
  const frontH = b.height - plinth;
  const sw = fs * 0.08;
  const front = { fill: '#dbeafe', fillOpacity: 0.55, stroke: '#60a5fa', strokeWidth: sw, pointerEvents: 'none' as const };
  if (comp.drawerFrontHeights.length > 0) {
    const ys = comp.drawerFrontHeights.map((_, i) => top + d / 2 + comp.drawerFrontHeights.slice(0, i).reduce((s, h) => s + h + d, 0));
    return (
      <>
        {comp.drawerFrontHeights.map((h, i) => <rect key={i} x={X + d / 2} y={ys[i]} width={b.width - d} height={h} {...front} />)}
      </>
    );
  }
  if (comp.doorCount > 0) {
    if (b.doorOpening === 'up') {
      const h = (frontH - comp.doorCount * d) / comp.doorCount;
      return <>{Array.from({ length: comp.doorCount }, (_, i) => <rect key={i} x={X + d / 2} y={top + d / 2 + i * (h + d)} width={b.width - d} height={h} {...front} />)}</>;
    }
    const w = (b.width - comp.doorCount * d) / comp.doorCount;
    return <>{Array.from({ length: comp.doorCount }, (_, i) => <rect key={i} x={X + d / 2 + i * (w + d)} y={top + d / 2} width={w} height={frontH - d} {...front} />)}</>;
  }
  const shelves = b.shelfCount + b.fixedShelfCount;
  const innerTop = top + b.bodyThickness;
  const innerH = frontH - 2 * b.bodyThickness;
  return (
    <>
      {Array.from({ length: shelves }, (_, i) => {
        const y = innerTop + (innerH / (shelves + 1)) * (i + 1);
        return <line key={i} x1={X + b.bodyThickness} y1={y} x2={X + b.width - b.bodyThickness} y2={y} stroke="#a8916f" strokeWidth={b.bodyThickness} pointerEvents="none" />;
      })}
    </>
  );
}
