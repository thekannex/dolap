import type { InteriorGeometry } from '../../../core/engine/interior';
import { formatNumber } from '../../../core/utils/format';

export type DimFocus =
  | { kind: 'divider'; index: number }
  | { kind: 'partition'; col: number; cell: number }
  | { kind: 'shelf'; col: number; cell: number; index: number }
  | null;

const NORMAL = '#52525b';
const HOT = '#ea580c';

/**
 * Seçili kutunun kenarlarına ölçü zinciri çizer: üstte bölme genişlikleri, sağda etkin bölmenin göz yükseklikleri.
 * Sürüklenen dikme/tabla/rafın iki yanındaki ölçüler vurgulanır; rafta alt ve üst boşluk ayrıca yazılır.
 */
export default function InteriorDims({ geo, X, Y, fs, t, activeCol, focus }: {
  geo: InteriorGeometry;
  X: (x: number) => number;
  Y: (y: number) => number;
  fs: number;
  t: number;
  activeCol: number;
  focus: DimFocus;
}) {
  const right = geo.inner.x + geo.inner.w + t;
  const top = geo.inner.y + geo.inner.h + t;
  const sw = fs * 0.06;
  const tick = fs * 0.35;
  const txt = fs * 0.78;

  const hotCol = (i: number) => focus?.kind === 'divider' && (i === focus.index || i === focus.index + 1);
  const hotCell = (j: number) => focus?.kind === 'partition' && focus.col === activeCol && (j === focus.cell || j === focus.cell + 1);

  const hy = Y(top) - fs * 1.7;
  const vx = X(right) + fs * 1.7;
  const col = geo.columns[activeCol] ? activeCol : 0;
  const cells = geo.cells.filter((c) => c.col === col);

  // Raf boşlukları
  let shelfGaps: Array<{ y1: number; y2: number; x: number }> = [];
  if (focus?.kind === 'shelf') {
    const cell = geo.cells.find((c) => c.col === focus.col && c.cell === focus.cell);
    const shelves = geo.shelves.filter((s) => s.col === focus.col && s.cell === focus.cell).map((s) => s.rect.y).sort((a, b) => a - b);
    const me = shelves[focus.index];
    if (cell && me !== undefined) {
      const below = focus.index > 0 ? shelves[focus.index - 1] + t : cell.opening.y;
      const above = focus.index < shelves.length - 1 ? shelves[focus.index + 1] : cell.opening.y + cell.opening.h;
      const x = cell.opening.x + cell.opening.w * 0.72;
      shelfGaps = [{ y1: below, y2: me, x }, { y1: me + t, y2: above, x }];
    }
  }

  return (
    <g pointerEvents="none" fontFamily="var(--font-mono)">
      {/* Üst kenar: bölme genişlikleri */}
      {geo.columns.map((c, i) => {
        const hot = hotCol(i);
        const color = hot ? HOT : NORMAL;
        return (
          <g key={`w-${i}`}>
            <line x1={X(c.x)} y1={hy} x2={X(c.x + c.w)} y2={hy} stroke={color} strokeWidth={hot ? sw * 2 : sw} />
            <line x1={X(c.x)} y1={hy - tick} x2={X(c.x)} y2={hy + tick} stroke={color} strokeWidth={sw} />
            <line x1={X(c.x + c.w)} y1={hy - tick} x2={X(c.x + c.w)} y2={hy + tick} stroke={color} strokeWidth={sw} />
            <text x={(X(c.x) + X(c.x + c.w)) / 2} y={hy - fs * 0.35} textAnchor="middle" fontSize={hot ? txt * 1.15 : txt}
              fontWeight={hot ? 700 : 400} fill={color} stroke="#fff" strokeWidth={txt * 0.15} paintOrder="stroke">{formatNumber(c.w)}</text>
          </g>
        );
      })}

      {/* Gruplar: ölçü zincirinin üstünde parantez ve grup toplamı */}
      {geo.groups.map((g) => {
        const y = hy - fs * 1.45;
        const x1 = X(g.x);
        const x2 = X(g.x + g.w);
        return (
          <g key={`grp-${g.id}`}>
            <path d={`M ${x1} ${y + tick} V ${y} H ${x2} V ${y + tick}`} fill="none" stroke={HOT} strokeWidth={sw * 1.5} />
            <text x={(x1 + x2) / 2} y={y - fs * 0.3} textAnchor="middle" fontSize={txt * 0.9} fontWeight={700} fill={HOT}
              stroke="#fff" strokeWidth={txt * 0.15} paintOrder="stroke" fontFamily="var(--font-sans)">grup {formatNumber(g.w)}</text>
          </g>
        );
      })}

      {/* Sağ kenar: etkin bölmenin göz yükseklikleri */}
      {cells.map((c) => {
        const hot = hotCell(c.cell);
        const color = hot ? HOT : NORMAL;
        const y1 = Y(c.opening.y);
        const y2 = Y(c.opening.y + c.opening.h);
        const ty = (y1 + y2) / 2;
        return (
          <g key={`h-${c.cell}`}>
            <line x1={vx} y1={y1} x2={vx} y2={y2} stroke={color} strokeWidth={hot ? sw * 2 : sw} />
            <line x1={vx - tick} y1={y1} x2={vx + tick} y2={y1} stroke={color} strokeWidth={sw} />
            <line x1={vx - tick} y1={y2} x2={vx + tick} y2={y2} stroke={color} strokeWidth={sw} />
            <text x={vx + fs * 0.45} y={ty} textAnchor="middle" fontSize={hot ? txt * 1.15 : txt} fontWeight={hot ? 700 : 400} fill={color}
              stroke="#fff" strokeWidth={txt * 0.15} paintOrder="stroke" transform={`rotate(-90, ${vx + fs * 0.45}, ${ty})`}>{formatNumber(c.opening.h)}</text>
          </g>
        );
      })}
      {cells.length > 0 && geo.columns.length > 1 && (
        <text x={vx} y={Y(top) + fs * 0.1} textAnchor="middle" fontSize={txt * 0.8} fill={NORMAL} fontFamily="var(--font-sans)">
          {col + 1}. bölme
        </text>
      )}

      {/* Raf sürüklenirken alt ve üst boşluk */}
      {shelfGaps.map((g, i) => {
        const y1 = Y(g.y1);
        const y2 = Y(g.y2);
        const x = X(g.x);
        const ty = (y1 + y2) / 2;
        return (
          <g key={`s-${i}`}>
            <line x1={x} y1={y1} x2={x} y2={y2} stroke={HOT} strokeWidth={sw * 2} />
            <line x1={x - tick} y1={y1} x2={x + tick} y2={y1} stroke={HOT} strokeWidth={sw} />
            <line x1={x - tick} y1={y2} x2={x + tick} y2={y2} stroke={HOT} strokeWidth={sw} />
            <text x={x - fs * 0.45} y={ty} textAnchor="middle" fontSize={txt * 1.1} fontWeight={700} fill={HOT}
              stroke="#fff" strokeWidth={txt * 0.18} paintOrder="stroke" transform={`rotate(-90, ${x - fs * 0.45}, ${ty})`}>{formatNumber(g.y2 - g.y1)}</text>
          </g>
        );
      })}
    </g>
  );
}
