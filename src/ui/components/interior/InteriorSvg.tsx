import type { IRect, InteriorGeometry } from '../../../core/engine/interior';

export interface CellRef { col: number; cell: number }

type Down = (e: React.PointerEvent) => void;

/**
 * Bölmeli iç düzenin SVG çizimi. X/Y, gövde koordinatlarını (mm, y yukarı) SVG'ye çevirir.
 * Etkileşim işleyicileri verilirse dikme, tabla ve raflar sürüklenebilir, gözler seçilebilir.
 */
export default function InteriorSvg({ geo, X, Y, fs, showFronts = true, selected, onCellDown, onDividerDown, onPartitionDown, onShelfDown }: {
  geo: InteriorGeometry;
  X: (x: number) => number;
  Y: (y: number) => number;
  fs: number;
  showFronts?: boolean;
  selected?: CellRef | null;
  onCellDown?: (ref: CellRef) => Down;
  /** Kilitli dikme için undefined döndürülür. */
  onDividerDown?: (index: number) => Down | undefined;
  onPartitionDown?: (col: number, cell: number) => Down;
  onShelfDown?: (col: number, cell: number, index: number) => Down;
}) {
  const box = (r: IRect) => ({ x: X(r.x), y: Y(r.y + r.h), width: Math.max(0, X(r.x + r.w) - X(r.x)), height: Math.max(0, Y(r.y) - Y(r.y + r.h)) });
  const grab = (horizontal: boolean) => ({ style: { cursor: horizontal ? 'ns-resize' : 'ew-resize' } });
  const knob = Math.max(6, fs * 0.35);

  return (
    <g>
      {/* Gözler: seçim alanı ve vurgusu */}
      {geo.cells.map((c) => {
        const isSel = selected?.col === c.col && selected?.cell === c.cell;
        return (
          <rect key={`cell-${c.col}-${c.cell}`} {...box(c.opening)}
            fill={isSel ? '#fed7aa' : 'transparent'} fillOpacity={isSel ? 0.55 : 0}
            stroke={isSel ? '#ea580c' : 'none'} strokeWidth={fs * 0.12} strokeDasharray={`${fs * 0.5},${fs * 0.3}`}
            onPointerDown={onCellDown?.({ col: c.col, cell: c.cell })} pointerEvents={onCellDown ? 'all' : 'none'} />
        );
      })}

      {geo.shelves.map((s) => (
        <rect key={`shelf-${s.col}-${s.cell}-${s.index}`} {...box(s.rect)} fill="#c9ad85" stroke="#a8916f" strokeWidth={fs * 0.05}
          strokeDasharray={s.fixed ? undefined : `${fs * 0.4},${fs * 0.2}`}
          {...(onShelfDown ? grab(true) : {})} onPointerDown={onShelfDown?.(s.col, s.cell, s.index)} pointerEvents={onShelfDown ? 'all' : 'none'} />
      ))}

      {geo.rods.map((r, i) => (
        <line key={`rod-${i}`} x1={X(r.x1 + 15)} y1={Y(r.y)} x2={X(r.x2 - 15)} y2={Y(r.y)} stroke="#71717a" strokeWidth={Math.max(4, fs * 0.3)} strokeLinecap="round" pointerEvents="none" />
      ))}

      {geo.partitions.map((p) => (
        <rect key={`part-${p.col}-${p.cell}`} {...box(p)} fill="#e7d5b9" stroke="#a8916f" strokeWidth={fs * 0.05}
          {...(onPartitionDown ? grab(true) : {})} onPointerDown={onPartitionDown?.(p.col, p.cell)} pointerEvents={onPartitionDown ? 'all' : 'none'} />
      ))}

      {geo.dividers.map((d) => {
        const handler = onDividerDown?.(d.index);
        const locked = Boolean(onDividerDown) && !handler;
        return (
          <rect key={`div-${d.index}`} {...box(d)} fill={locked ? '#f1e4cf' : d.behind ? '#fed7aa' : '#e7d5b9'} stroke={d.behind ? '#ea580c' : '#a8916f'} strokeWidth={fs * 0.05}
            strokeDasharray={locked || d.behind ? `${fs * 0.3},${fs * 0.2}` : undefined}
            style={{ cursor: handler ? 'ew-resize' : locked ? 'not-allowed' : undefined }}
            onPointerDown={handler ?? (locked ? (e) => e.stopPropagation() : undefined)} pointerEvents={onDividerDown ? 'all' : 'none'}>
            {locked ? <title>Bu dikme taşınamaz</title> : d.behind ? <title>Kapağın arkasında ({d.behind === 'left' ? 'soldaki' : 'sağdaki'} kapak örter)</title> : null}
          </rect>
        );
      })}

      {showFronts && geo.fronts.map((f) => {
        const b = box(f.rect);
        // Kulp: yana açılan kapakta menteşenin karşı kenarı, yukarı açılanda ve çekmecede altta/ortada
        let kx = b.x + b.width / 2;
        let ky = b.y + b.height / 2;
        if (f.kind === 'door' && f.opening === 'side') {
          kx = f.hinge === 'left' ? b.x + b.width - knob * 3 : b.x + knob * 3;
          ky = b.y + Math.min(b.height / 2, knob * 14);
        } else if (f.kind === 'door') {
          ky = b.y + b.height - knob * 3;
        }
        return (
          <g key={`front-${f.col}-${f.cell}-${f.index}`} pointerEvents="none">
            <rect {...b} fill="#c7a27a" fillOpacity={0.82} stroke="#8a6a48" strokeWidth={fs * 0.07} rx={fs * 0.1} />
            <circle cx={kx} cy={ky} r={knob} fill="#d4af37" stroke="#a16207" strokeWidth={fs * 0.05} />
            {f.kind === 'door' && f.opening === 'up' && (
              <text x={b.x + b.width / 2} y={b.y + b.height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={fs} fill="#5b4329">↑</text>
            )}
          </g>
        );
      })}
    </g>
  );
}
