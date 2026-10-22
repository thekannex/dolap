import { useMemo, useRef, useState } from 'react';
import type { Obstacle, SideObstacle, WallSurvey } from '../../../core/models/project';
import { analyzeWall, angleSlope, interpolate } from '../../../core/layout/wall-survey';
import type { WallAnalysisOptions } from '../../../core/layout/wall-survey';
import { WALL_SHAPE_TYPES } from '../../../core/layout/wall-fit';
import { formatNumber } from '../../../core/utils/format';
import { useZoomPan } from '../shared/use-zoom-pan';
import ZoomControls from '../shared/ZoomControls';

/** Çizim için sapmaları büyütülmüş ölçü: küçük farklar (birkaç mm) gözle görülsün. */
function exaggerate(s: WallSurvey, k: number, refTop: number): WallSurvey {
  if (k === 1) return s;
  const floorAt = (x: number) => interpolate(s.floor, x, 0);
  return {
    ...s,
    leftLean: s.leftLean * k,
    rightLean: s.rightLean * k,
    leftAngle: Math.min(150, Math.max(30, 90 + (s.leftAngle - 90) * k)),
    rightAngle: Math.min(150, Math.max(30, 90 + (s.rightAngle - 90) * k)),
    floor: s.floor.map((p) => ({ x: p.x, v: p.v * k })),
    ceiling: s.ceiling.map((p) => {
      const elev = floorAt(p.x) + p.v;
      return { x: p.x, v: refTop + (elev - refTop) * k - floorAt(p.x) * k };
    }),
  };
}

/** Duvarın önden ve üstten çizimi: tavan ve zemin profili, yan duvarlar, dolap sığan alan, kama boşluklar. */
export default function SurveyDrawing({ survey, opts, obstacles, sideObstacles = [] }: { survey: WallSurvey; opts: WallAnalysisOptions; obstacles: Obstacle[]; sideObstacles?: SideObstacle[] }) {
  const [k, setK] = useState(10);
  const real = useMemo(() => analyzeWall(survey, opts), [survey, opts]);
  const refTop = real.baseLevel + real.height;
  const s = useMemo(() => exaggerate(survey, k, refTop), [survey, k, refTop]);
  const a = useMemo(() => analyzeWall(s, opts), [s, opts]);

  const L = s.length;
  const floorAt = (x: number) => interpolate(s.floor, x, 0);
  const ceilAt = (x: number) => floorAt(x) + interpolate(s.ceiling, x, 2500);
  const xs = [...new Set([0, L, ...s.floor.map((p) => p.x), ...s.ceiling.map((p) => p.x)].filter((x) => x >= 0 && x <= L))].sort((p, q) => p - q);
  const top = Math.max(...xs.map(ceilAt)) + 150;
  const minFloor = Math.min(0, ...xs.map(floorAt));
  const Y = (elev: number) => top - elev;
  const fs = Math.max(40, L / 42);

  // Üstten görünüş (önden çizimin altında): duvar yüzü z=0, oda aşağıda
  const planTop = Y(minFloor) + fs * 5;
  const D = opts.depth;
  const Z = (z: number) => planTop + z;
  const zMax = Math.max(D * 1.6, ...sideObstacles.map((o) => o.x + o.width + 150));
  const sL = angleSlope(s.leftAngle);
  const sR = angleSlope(s.rightAngle);

  const svgRef = useRef<SVGSVGElement>(null);
  const pad = fs * 4;
  const zp = useZoomPan({ x: -pad, y: -fs * 2, w: L + pad * 2, h: Z(zMax) + fs * 4 }, svgRef);

  const floorPath = xs.map((x, i) => `${i ? 'L' : 'M'} ${x} ${Y(floorAt(x))}`).join(' ');
  const ceilPath = xs.map((x, i) => `${i ? 'L' : 'M'} ${x} ${Y(ceilAt(x))}`).join(' ');
  const leftTop = { x: s.leftLean, y: Y(ceilAt(0)) };
  const rightTop = { x: L - s.rightLean, y: Y(ceilAt(L)) };

  return (
    <div className="relative flex-1 min-w-0 min-h-0 flex flex-col bg-[var(--color-bg)]" data-tour="survey-drawing">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] text-xs text-[var(--color-text-muted)]">
        <span className="font-semibold text-[var(--color-text)]">Önden ve üstten görünüş</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={k > 1} onChange={(e) => setK(e.target.checked ? 10 : 1)} className="accent-[var(--color-accent)]" />
          Farkları 10 kat büyüt (şakul, açı, tavan ve zemin farkı)
        </label>
        <span className="ml-auto">Turuncu: dolabın sığdığı alan · Mor: kama boşluk</span>
      </div>
      <div className="relative flex-1 min-h-0 overflow-hidden p-3">
        <svg ref={svgRef} {...zp.svgProps} className="w-full h-full select-none touch-none">
          <defs>
            <pattern id="sv-hatch" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="40" stroke="#a8a29e" strokeWidth="6" opacity="0.5" />
            </pattern>
          </defs>

          {/* Duvar yüzü: yan duvarlar, tavan, zemin */}
          <path d={`${floorPath} L ${rightTop.x} ${rightTop.y} ${[...xs].reverse().map((x) => `L ${x} ${Y(ceilAt(x))}`).join(' ')} L ${leftTop.x} ${leftTop.y} Z`}
            fill="#f5f5f4" stroke="none" />
          <path d={ceilPath} fill="none" stroke="#57534e" strokeWidth={fs * 0.15} />
          <path d={`${ceilPath} L ${L} ${Y(top)} L 0 ${Y(top)} Z`} fill="url(#sv-hatch)" />
          <path d={floorPath} fill="none" stroke="#57534e" strokeWidth={fs * 0.15} />
          <path d={`${floorPath} L ${L} ${Y(minFloor) + fs * 1.5} L 0 ${Y(minFloor) + fs * 1.5} Z`} fill="url(#sv-hatch)" />
          <line x1={0} y1={Y(floorAt(0))} x2={leftTop.x} y2={leftTop.y} stroke="#57534e" strokeWidth={fs * 0.15} />
          <line x1={L} y1={Y(floorAt(L))} x2={rightTop.x} y2={rightTop.y} stroke="#57534e" strokeWidth={fs * 0.15} />

          {/* Engeller */}
          {obstacles.map((o) => {
            const shape = WALL_SHAPE_TYPES.has(o.type);
            const opening = o.type === 'window' || o.type === 'door';
            if (!shape && !opening && o.type !== 'pipe') return null;
            return <rect key={o.id} x={o.x} y={Y(o.y + o.height)} width={o.width} height={o.height}
              fill={opening ? '#bae6fd' : '#d6d3d1'} fillOpacity={0.7} stroke={opening ? '#0284c7' : '#78716c'} strokeWidth={fs * 0.08}
              strokeDasharray={o.type === 'recess' ? `${fs * 0.5},${fs * 0.3}` : undefined} />;
          })}

          {/* Yan duvar engelleri (önden izdüşüm, köşede) */}
          {sideObstacles.filter((o) => o.depth > 0).map((o) => {
            const w = o.depth;
            const x = o.side === 'left' ? 0 : L - w;
            return <rect key={`fv-${o.id}`} x={x} y={Y(o.y + o.height)} width={w} height={o.height}
              fill="#78716c" fillOpacity={0.25} stroke="#57534e" strokeWidth={fs * 0.06} strokeDasharray={`${fs * 0.3},${fs * 0.2}`}>
              <title>Yan duvardaki engel (köşeden {o.x} mm)</title>
            </rect>;
          })}

          {/* Dolabın sığdığı alan (terazide) */}
          {a.width > 0 && (
            <g>
              <rect x={a.x0} y={Y(a.baseLevel + a.height)} width={a.x1 - a.x0} height={a.height}
                fill="#ea580c" fillOpacity={0.08} stroke="#ea580c" strokeWidth={fs * 0.12} strokeDasharray={`${fs * 0.6},${fs * 0.3}`} />
              <text x={(a.x0 + a.x1) / 2} y={Y(a.baseLevel + a.height / 2)} textAnchor="middle" fontSize={fs * 1.2} fill="#c2410c" fontWeight={600}>
                {formatNumber(real.width)} × {formatNumber(real.height)}
              </text>
              <text x={(a.x0 + a.x1) / 2} y={Y(a.baseLevel + a.height / 2) + fs * 1.5} textAnchor="middle" fontSize={fs * 0.8} fill="#9a3412">
                dolap sığan alan (genişlik × yükseklik, mm)
              </text>
            </g>
          )}

          {/* Ölçü noktaları */}
          {survey.ceiling.map((p, i) => (
            <g key={`c${i}`}>
              <circle cx={p.x} cy={Y(ceilAt(p.x))} r={fs * 0.25} fill="#2563eb" />
              <text x={p.x} y={Y(ceilAt(p.x)) + fs * 1.2} textAnchor="middle" fontSize={fs * 0.75} fill="#1d4ed8" fontFamily="var(--font-mono)">{formatNumber(p.v)}</text>
            </g>
          ))}
          {survey.floor.map((p, i) => (
            <g key={`f${i}`}>
              <circle cx={p.x} cy={Y(floorAt(p.x))} r={fs * 0.25} fill="#16a34a" />
              <text x={p.x} y={Y(floorAt(p.x)) - fs * 0.6} textAnchor="middle" fontSize={fs * 0.75} fill="#15803d" fontFamily="var(--font-mono)">{p.v > 0 ? '+' : ''}{formatNumber(p.v)}</text>
            </g>
          ))}
          <text x={0} y={Y(minFloor) + fs * 2.8} fontSize={fs * 0.8} fill="#78716c">{formatNumber(survey.length)} mm (köşeden köşeye)</text>

          {/* Üstten görünüş */}
          <text x={0} y={planTop - fs * 0.8} fontSize={fs * 0.8} fill="#57534e" fontWeight={600}>Üstten görünüş (dolap derinliği {formatNumber(D)} mm)</text>
          <line x1={0} y1={Z(0)} x2={L} y2={Z(0)} stroke="#57534e" strokeWidth={fs * 0.15} />
          <line x1={0} y1={Z(0)} x2={zMax * sL} y2={Z(zMax)} stroke="#57534e" strokeWidth={fs * 0.15} />
          <line x1={L} y1={Z(0)} x2={L - zMax * sR} y2={Z(zMax)} stroke="#57534e" strokeWidth={fs * 0.15} />
          {a.width > 0 && <rect x={a.x0} y={Z(0)} width={a.x1 - a.x0} height={D} fill="#ea580c" fillOpacity={0.12} stroke="#ea580c" strokeWidth={fs * 0.1} />}
          {/* Kama boşluklar: dolap yanı ile duvar arası */}
          {a.width > 0 && (
            <>
              <path d={`M ${Math.max(0, s.leftLean)} ${Z(0)} L ${a.x0} ${Z(0)} L ${a.x0} ${Z(D)} L ${D * sL} ${Z(D)} Z`} fill="#a855f7" fillOpacity={0.35} />
              <path d={`M ${L - Math.max(0, s.rightLean)} ${Z(0)} L ${a.x1} ${Z(0)} L ${a.x1} ${Z(D)} L ${L - D * sR} ${Z(D)} Z`} fill="#a855f7" fillOpacity={0.35} />
            </>
          )}
          {/* Yan duvar engelleri, yan duvar boyunca */}
          {sideObstacles.map((o) => {
            const sl = o.side === 'left' ? sL : sR;
            const at = (z: number) => (o.side === 'left' ? z * sl : L - z * sl);
            const off = o.side === 'left' ? o.depth : -o.depth;
            const z0 = o.x;
            const z1 = o.x + o.width;
            const pts = [[at(z0), Z(z0)], [at(z1), Z(z1)], [at(z1) + off, Z(z1)], [at(z0) + off, Z(z0)]];
            return <polygon key={`pv-${o.id}`} points={pts.map((p) => p.join(',')).join(' ')}
              fill={o.depth > 0 ? '#78716c' : '#f59e0b'} fillOpacity={0.6} stroke="#44403c" strokeWidth={fs * 0.06} />;
          })}
          <text x={0} y={Z(zMax) + fs * 1.2} fontSize={fs * 0.8} fill="#78716c">sol köşe {formatNumber(survey.leftAngle)}°</text>
          <text x={L} y={Z(zMax) + fs * 1.2} textAnchor="end" fontSize={fs * 0.8} fill="#78716c">sağ köşe {formatNumber(survey.rightAngle)}°</text>
        </svg>
        <ZoomControls zoom={zp.zoom} onIn={zp.zoomIn} onOut={zp.zoomOut} onFit={zp.fit} />
      </div>
    </div>
  );
}
