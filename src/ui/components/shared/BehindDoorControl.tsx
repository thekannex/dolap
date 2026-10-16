import { useMemo } from 'react';
import type { CabinetInterior, ProjectCabinet } from '../../../core/models/cabinet';
import { interiorFromCabinet, layoutInterior, setDividerBehind } from '../../../core/engine/interior';
import { useInteriorFrame } from '../interior/use-interior-frame';

type Behind = 'left' | 'right' | null;

/**
 * Kapağın arkasında kalacak dikmeleri seçme şeridi (üstten görünüş).
 * Yan dikmeye tıklamak işareti açar/kapatır; ara dikmede sırayla "soldaki kapak örter", "sağdaki kapak örter", "yok".
 */
export default function BehindDoorControl({ cabinet, onChange }: {
  cabinet: ProjectCabinet; onChange: (patch: Partial<ProjectCabinet>) => void;
}) {
  const frame = useInteriorFrame(cabinet);
  const inset = cabinet.doorOverlayType === 'inset';
  const full = cabinet.doorOverlayType === 'full';
  const interior: CabinetInterior = useMemo(() => cabinet.interior ?? interiorFromCabinet(cabinet), [cabinet]);
  const geo = useMemo(() => layoutInterior(interior, { ...frame, inset }), [interior, frame, inset]);

  const { W, t } = frame;
  // Çizim ölçeği: genişlik 280px'e sığar, dikme en az 5px görünür
  const k = 280 / W;
  const tw = Math.max(5, t * k);
  const depth = 64;
  const doorT = 7;
  const setback = inset ? doorT + 2 : 0;
  const frontY = depth; // gövdenin ön yüzü
  const hasLeft = !frame.omitLeft;
  const leftOn = Boolean(cabinet.leftSideBehind) && hasLeft && !full;
  const rightOn = Boolean(cabinet.rightSideBehind) && !full;

  // Ön yüzlerin yatay kapladığı aralıklar (üstten bakınca tek bant)
  const spans = geo.fronts.map((f) => [f.rect.x, f.rect.x + f.rect.w] as const);

  const dikmeler: Array<{ key: string; x: number; behind: boolean; label: string; onClick?: () => void; title: string }> = [];
  if (hasLeft) {
    dikmeler.push({
      key: 'L', x: 0, behind: leftOn, label: 'Sol',
      onClick: full ? undefined : () => onChange({ leftSideBehind: !cabinet.leftSideBehind }),
      title: full ? 'Tam bindirmede yan dikme zaten kapağın arkasında' : leftOn ? 'Sol yan dikme kapağın arkasında (tıkla: kaldır)' : 'Sol yan dikmeyi kapağın arkasına al',
    });
  }
  geo.dividers.forEach((d) => {
    const next: Behind = d.behind === null ? 'left' : d.behind === 'left' ? 'right' : null;
    dikmeler.push({
      key: `D${d.index}`, x: d.x, behind: d.behind !== null, label: `${d.index + 1}`,
      onClick: () => onChange({ interior: setDividerBehind(d.index, next)(interior, frame) }),
      title: d.behind === 'left' ? `${d.index + 1}. ara dikme: soldaki bölmenin kapağı örter (tıkla: sağdaki örtsün)`
        : d.behind === 'right' ? `${d.index + 1}. ara dikme: sağdaki bölmenin kapağı örter (tıkla: kaldır)`
          : `${d.index + 1}. ara dikmeyi kapağın arkasına al`,
    });
  });
  dikmeler.push({
    key: 'R', x: W - t, behind: rightOn, label: 'Sağ',
    onClick: full ? undefined : () => onChange({ rightSideBehind: !cabinet.rightSideBehind }),
    title: full ? 'Tam bindirmede yan dikme zaten kapağın arkasında' : rightOn ? 'Sağ yan dikme kapağın arkasında (tıkla: kaldır)' : 'Sağ yan dikmeyi kapağın arkasına al',
  });

  const marked = dikmeler.filter((d) => d.behind);
  const describe = (key: string) => {
    if (key === 'L') return 'Sol yan dikme';
    if (key === 'R') return 'Sağ yan dikme';
    const d = geo.dividers.find((x) => `D${x.index}` === key)!;
    return `${d.index + 1}. ara dikme (${d.behind === 'left' ? 'soldaki' : 'sağdaki'} kapak örter)`;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-[var(--color-text-muted)]">Kapağın arkasındaki dikmeler</span>
      <svg viewBox={`-8 -14 ${W * k + 16} ${depth + doorT + 30}`} className="w-full h-auto select-none" role="group" aria-label="Kapağın arkasındaki dikmeler">
        <text x={W * k / 2} y={-5} textAnchor="middle" fontSize={9} className="fill-[var(--color-text-dim)]">arka ↑ · üstten görünüş · ↓ ön</text>
        {/* Arkalık */}
        <rect x={0} y={0} width={W * k} height={2} className="fill-[var(--color-text-dim)]" opacity={0.5} />
        {/* Ön yüzler */}
        {spans.map(([a, b], i) => (
          <rect key={i} x={a * k} y={inset ? frontY - doorT : frontY + 1} width={Math.max(1, (b - a) * k)} height={doorT} rx={1}
            fill="#6ba3d6" opacity={0.55} pointerEvents="none" />
        ))}
        {dikmeler.map((d) => {
          const h = depth - (d.behind ? setback : 0);
          const x = d.key === 'R' ? W * k - tw : d.key === 'L' ? 0 : d.x * k + (t * k - tw) / 2;
          return (
            <g key={d.key} onClick={d.onClick} style={{ cursor: d.onClick ? 'pointer' : 'not-allowed' }} role="button" aria-pressed={d.behind}
              aria-label={d.title}>
              <title>{d.title}</title>
              {/* Geniş tıklama alanı */}
              <rect x={x - 5} y={-2} width={tw + 10} height={depth + doorT + 4} fill="transparent" />
              <rect x={x} y={0} width={tw} height={h} rx={1}
                fill={d.behind ? '#fed7aa' : '#e7d5b9'} stroke={d.behind ? '#ea580c' : '#a8916f'} strokeWidth={d.behind ? 1.4 : 0.8}
                strokeDasharray={d.behind ? '3,2' : undefined} opacity={d.onClick ? 1 : 0.5} />
              <text x={x + tw / 2} y={depth + doorT + 13} textAnchor={d.key === 'L' ? 'start' : d.key === 'R' ? 'end' : 'middle'} fontSize={10}
                fontWeight={d.behind ? 700 : 400} fill={d.behind ? '#ea580c' : 'var(--color-text-muted)'}>{d.label}</text>
            </g>
          );
        })}
      </svg>
      {marked.length > 0 ? (
        <p className="text-[11px] text-[var(--color-accent)]">{marked.map((d) => describe(d.key)).join(' · ')}</p>
      ) : null}
      <p className="text-[11px] text-[var(--color-text-dim)]">
        Dikmeye tıklayın: kapak o dikmenin önünü de örter ve dikmenin kalınlığı kapak ölçüsüne eklenir.
        {inset ? ' Gömme kapakta dikme kapak kalınlığı + 2 mm geride kesilir; ön kenarı bantlanır.' : ''}
        {' '}Ara dikmede ikinci tıklama örten kapağı sağa alır, üçüncüsü kaldırır.
        {full ? ' Tam bindirmede yan dikmeler zaten kapağın arkasındadır.' : ''}
      </p>
    </div>
  );
}
