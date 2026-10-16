import type { SinkLayout } from '../../../core/engine/sink';
import { formatNumber } from '../../../core/utils/format';

/**
 * Tezgâhın üstten görünüşü: önü aşağıda, duvar yukarıda.
 * Ölçüler dolabın sol kenarından (x) ve tezgâhın ön kenarından (y) verilir.
 */
export default function SinkTopView({ layout, width, depth, thickness, overhang }: {
  layout: SinkLayout; width: number; depth: number; thickness: number; overhang: number;
}) {
  const Dc = layout.countertopDepth;
  const left = Math.min(0, layout.outer.x) - 60;
  const right = Math.max(width, layout.outer.x + layout.outer.w) + 60;
  const spanW = right - left;
  const fs = Math.max(16, spanW / 36);
  const pad = fs * 5;
  const vbX = left - pad;
  const vbW = spanW + pad * 2;
  const vbH = Dc + pad * 2.6;
  const top = pad * 1.3;
  // Ön kenardan y (mm) → SVG y (aşağı doğru): ön kenar en altta
  const Y = (y: number) => top + (Dc - y);
  const { cutout, faucet } = layout;

  const dimH = (x1: number, x2: number, y: number, label: string, above = true) => (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#71717a" strokeWidth={fs * 0.08} markerStart="url(#tarrow)" markerEnd="url(#tarrow)" />
      <text x={(x1 + x2) / 2} y={y + (above ? -fs * 0.35 : fs * 1.1)} textAnchor="middle" fontSize={fs} fill="#3f3f46" fontFamily="var(--font-mono)">{label}</text>
    </g>
  );
  const dimV = (y1: number, y2: number, x: number, label: string) => (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke="#71717a" strokeWidth={fs * 0.08} markerStart="url(#tarrow)" markerEnd="url(#tarrow)" />
      <text x={x - fs * 0.4} y={(y1 + y2) / 2} textAnchor="middle" fontSize={fs} fill="#3f3f46" fontFamily="var(--font-mono)"
        transform={`rotate(-90, ${x - fs * 0.4}, ${(y1 + y2) / 2})`}>{label}</text>
    </g>
  );

  return (
    <svg viewBox={`${vbX} 0 ${vbW} ${vbH}`} className="w-full h-full max-h-full" role="img" aria-label="Tezgâh üstten görünüş">
      <defs>
        <marker id="tarrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="none" stroke="#71717a" strokeWidth="0.8" />
        </marker>
        <pattern id="drain" patternUnits="userSpaceOnUse" width={fs} height={fs}>
          <line x1="0" y1="0" x2="0" y2={fs} stroke="#a1a1aa" strokeWidth={fs * 0.12} />
        </pattern>
      </defs>

      <text x={left} y={top - fs * 2.6} fontSize={fs} fill="#71717a">Duvar</text>
      <line x1={left} y1={top} x2={right} y2={top} stroke="#52525b" strokeWidth={fs * 0.3} />

      {/* Tezgâh */}
      <rect x={left} y={Y(Dc)} width={spanW} height={Dc} fill="#e7e5e4" stroke="#a8a29e" strokeWidth={fs * 0.1} />
      {/* Dolap gövdesi (tezgâhın altında) */}
      <rect x={0} y={Y(Dc)} width={width} height={depth} fill="none" stroke="#a8916f" strokeWidth={fs * 0.1} strokeDasharray={`${fs * 0.6},${fs * 0.4}`} />
      <rect x={0} y={Y(Dc)} width={thickness} height={depth} fill="#d6bd96" opacity={0.6} />
      <rect x={width - thickness} y={Y(Dc)} width={thickness} height={depth} fill="#d6bd96" opacity={0.6} />
      <text x={width / 2} y={Y(Dc) + depth + fs * 0.1 - overhang / 2} textAnchor="middle" fontSize={fs * 0.75} fill="#a8916f" dominantBaseline="middle">dolap önü</text>

      {/* Evye dış kenarı, çanaklar, damlalık */}
      <rect x={layout.outer.x} y={Y(layout.outer.y + layout.outer.h)} width={layout.outer.w} height={layout.outer.h} rx={fs * 0.6}
        fill="#f4f4f5" stroke="#71717a" strokeWidth={fs * 0.1} strokeDasharray={`${fs * 0.4},${fs * 0.3}`} />
      {layout.drainer && (
        <rect x={layout.drainer.x} y={Y(layout.drainer.y + layout.drainer.h)} width={layout.drainer.w} height={layout.drainer.h} fill="url(#drain)" />
      )}
      {layout.bowls.map((b, i) => (
        <rect key={i} x={b.x} y={Y(b.y + b.h)} width={b.w} height={b.h} rx={fs * 0.9} fill="#bfdbfe" stroke="#3b82f6" strokeWidth={fs * 0.08} />
      ))}
      {/* Kesim */}
      <rect x={cutout.x} y={Y(cutout.y + cutout.h)} width={cutout.w} height={cutout.h} fill="none" stroke="#ea580c" strokeWidth={fs * 0.22} />

      {/* Batarya */}
      {faucet && (
        <g>
          <circle cx={faucet.x} cy={Y(faucet.y)} r={faucet.diameter / 2} fill="#27272a" />
          <line x1={faucet.x} y1={Y(faucet.y)} x2={faucet.x} y2={Y(0) + fs * 2.2} stroke="#27272a" strokeWidth={fs * 0.06} strokeDasharray={`${fs * 0.3},${fs * 0.3}`} />
          <text x={faucet.x + fs * 0.6} y={Y(faucet.y) - fs * 0.6} fontSize={fs * 0.85} fill="#27272a">batarya Ø{faucet.diameter}</text>
        </g>
      )}

      {/* Ölçüler: kesimin dolap soluna uzaklığı ve genişliği (üstte), derinlik ve ön pay (solda), batarya (altta) */}
      {dimH(0, cutout.x, top - fs * 0.9, formatNumber(cutout.x))}
      {dimH(cutout.x, cutout.x + cutout.w, top - fs * 0.9, `kesim ${formatNumber(cutout.w)}`)}
      {dimV(Y(cutout.y), Y(0), left - fs * 1.2, formatNumber(cutout.y))}
      {dimV(Y(cutout.y + cutout.h), Y(cutout.y), left - fs * 1.2, `kesim ${formatNumber(cutout.h)}`)}
      {dimH(0, width, Y(0) + fs * 1.4, `dolap ${formatNumber(width)}`, false)}
      {faucet && dimH(0, faucet.x, Y(0) + fs * 3.4, `batarya ${formatNumber(faucet.x)} · önden ${formatNumber(faucet.y)}`, false)}
    </svg>
  );
}
