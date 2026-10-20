import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Wall } from '../../../core/models/project';
import { placeWallCabinets, checkWallFit } from '../../../core/layout/wall-elevation';
import type { WallPlacement } from '../../../core/layout/wall-elevation';
import { useProjectStore } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';
import { useProjectComputation } from '../../hooks/use-cabinet-calculations';
import { obstacleInfo } from './obstacle-types';

import { ON_LEGS, WITH_COUNTERTOP, UPPER_BOTTOM, KITCHEN_LEG_HEIGHT as PLINTH, COUNTERTOP_THICKNESS as COUNTERTOP } from '../../../core/layout/scene-layout';

export default function WallLayoutView({ wall }: { wall: Wall }) {
  const allCabinets = useProjectStore((s) => s.project?.cabinets);
  const setActiveCabinet = useProjectStore((s) => s.setActiveCabinet);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const computation = useProjectComputation();
  const [hover, setHover] = useState<string | null>(null);

  const cabinets = useMemo(() => (allCabinets ?? []).filter((c) => c.wallId === wall.id), [allCabinets, wall.id]);
  const placements = useMemo(() => placeWallCabinets(cabinets), [cabinets]);
  const fit = useMemo(() => checkWallFit(placements, wall.effectiveWidth), [placements, wall.effectiveWidth]);
  // Su girişi, en yakın evye çanağının ekseninden ne kadar uzakta
  const waterGap = useMemo(() => {
    const water = wall.obstacles.find((o) => o.type === 'water_inlet') ?? wall.obstacles.find((o) => o.type === 'drain');
    if (!water || !computation) return null;
    const centers = placements.flatMap((p) => {
      const sink = computation.cabinets.find((c) => c.cabinet.id === p.cabinetId)?.computed.sink;
      return sink ? [p.x + sink.bowls[0].x + sink.bowls[0].w / 2] : [];
    });
    if (centers.length === 0) return null;
    const w = water.x + water.width / 2;
    return Math.round(Math.min(...centers.map((c) => Math.abs(c - w))));
  }, [wall.obstacles, computation, placements]);
  const cabinetById = useMemo(() => new Map(cabinets.map((c) => [c.id, c])), [cabinets]);
  const computedById = useMemo(() => new Map(computation?.cabinets.map((c) => [c.cabinet.id, c.computed]) ?? []), [computation]);

  const W = Math.max(wall.effectiveWidth, ...placements.map((p) => p.x + p.width));
  const wallH = Math.max(wall.heightLeft, wall.heightCenter, wall.heightRight, 2000);
  const pad = 120;
  const svgW = W + pad * 2;
  const svgH = wallH + pad * 2;
  const floorY = pad + wallH;

  const rectFor = (p: WallPlacement) => {
    if (p.row === 'wall') {
      const top = Math.max(pad, floorY - UPPER_BOTTOM - p.height);
      return { x: pad + p.x, y: top, w: p.width, h: p.height };
    }
    const lift = ON_LEGS.has(p.type) ? PLINTH : 0;
    return { x: pad + p.x, y: floorY - lift - p.height, w: p.width, h: p.height };
  };

  const openEditor = (id: string) => {
    setActiveCabinet(id);
    setActivePage('editor');
  };

  return (
    <div data-tour="wall-view" className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg)]">
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] text-xs text-[var(--color-text-muted)]">
        <span className="font-semibold text-[var(--color-text)]">{wall.name}</span>
        <span>Kullanılabilir: <b className="font-mono">{wall.effectiveWidth}</b> mm</span>
        <span>Dolap: <b className="font-mono">{cabinets.length}</b></span>
        {fit.overflow > 0 && (
          <span className="flex items-center gap-1 text-[var(--color-error)]"><AlertTriangle size={13} /> Duvarı {fit.overflow} mm aşıyor</span>
        )}
        {waterGap !== null && waterGap > 100 && (
          <span className="flex items-center gap-1 text-[var(--color-warning)]"><AlertTriangle size={13} /> Evye su girişinden {waterGap} mm uzakta</span>
        )}
        {fit.overlaps.length > 0 && (
          <span className="flex items-center gap-1 text-[var(--color-warning)]"><AlertTriangle size={13} /> Çakışan: {fit.overlaps.map((o) => o.join('↔')).join(', ')}</span>
        )}
        <span className="ml-auto text-[var(--color-text-dim)]">Bir dolaba tıklayarak düzenleyin</span>
      </div>

      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        {cabinets.length === 0 && (
          <div className="absolute text-center text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-card)]/90 border border-[var(--color-border)] rounded-lg px-4 py-3 shadow-sm pointer-events-none">
            Bu duvarda dolap yok. Soldaki <b>Otomatik yerleşim</b> panelinden öneriyi uygulayın.
          </div>
        )}
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full max-h-full" role="img" aria-label={`${wall.name} görünüşü`}>
          <defs>
            <pattern id="hatch" patternUnits="userSpaceOnUse" width="24" height="24" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="24" stroke="var(--color-warning)" strokeWidth="4" opacity="0.5" />
            </pattern>
          </defs>

          {/* Duvar */}
          <rect x={pad} y={pad} width={wall.effectiveWidth} height={wallH} fill="var(--color-bg-card)" stroke="var(--color-border)" strokeWidth={3} />
          <line x1={pad - 60} y1={floorY} x2={pad + W + 60} y2={floorY} stroke="var(--color-text-muted)" strokeWidth={4} />

          {/* Engeller */}
          {wall.obstacles.map((o) => {
            const info = obstacleInfo(o.type);
            const isAppliance = o.type === 'appliance';
            if (info.shape) {
              return (
                <g key={o.id}>
                  <rect x={pad + o.x} y={floorY - o.y - o.height} width={o.width} height={o.height}
                    fill={o.type === 'recess' ? 'var(--color-bg)' : '#d6d3d1'} opacity={0.8} stroke="#78716c" strokeWidth={3}
                    strokeDasharray={o.type === 'recess' ? '14,8' : undefined} />
                  <text x={pad + o.x + o.width / 2} y={floorY - o.y - o.height / 2} textAnchor="middle" dominantBaseline="middle"
                    fill="#57534e" fontSize={Math.min(44, Math.max(24, o.width / 8))}>{info.label} {o.depth > 0 ? `· ${o.depth}` : ''}</text>
                </g>
              );
            }
            return (
              <g key={o.id}>
                <rect x={pad + o.x} y={floorY - o.y - o.height} width={o.width} height={o.height}
                  fill={isAppliance ? 'var(--color-info)' : 'var(--color-error)'} opacity={0.12}
                  stroke={isAppliance ? 'var(--color-info)' : 'var(--color-error)'} strokeWidth={3} strokeDasharray="14,8" />
                <text x={pad + o.x + o.width / 2} y={floorY - o.y - o.height / 2} textAnchor="middle" dominantBaseline="middle"
                  fill={isAppliance ? 'var(--color-info)' : 'var(--color-error)'} fontSize={Math.min(44, Math.max(24, o.width / 8))}>{info.label}</text>
              </g>
            );
          })}

          {/* Dolaplar */}
          {placements.map((p) => {
            const r = rectFor(p);
            const key = `${p.cabinetId}-${p.copy}`;
            const isHover = hover === p.cabinetId;
            const comp = computedById.get(p.cabinetId);
            const isFiller = p.type === 'filler';
            const liftUp = cabinetById.get(p.cabinetId)?.doorOpening === 'up';
            const drawerYs: number[] = [];
            if (comp && comp.drawerFrontHeights.length > 1) {
              let acc = 0;
              const total = comp.drawerFrontHeights.reduce((a, b) => a + b, 0);
              for (const h of comp.drawerFrontHeights.slice(0, -1)) { acc += h; drawerYs.push(r.y + (acc / total) * r.h); }
            }
            const fs = Math.max(26, Math.min(48, r.w / 9));
            return (
              <g key={key} className="cursor-pointer" onClick={() => openEditor(p.cabinetId)}
                onMouseEnter={() => setHover(p.cabinetId)} onMouseLeave={() => setHover(null)}>
                <title>{`${p.code} · ${p.name} (${p.width} × ${p.height})`}</title>
                {p.row !== 'wall' && !isFiller && ON_LEGS.has(p.type) && (
                  <rect x={r.x + 10} y={r.y + r.h} width={r.w - 20} height={PLINTH} fill="var(--color-text-dim)" opacity={0.25} />
                )}
                {WITH_COUNTERTOP.has(p.type) && (
                  <rect x={r.x} y={r.y - COUNTERTOP} width={r.w} height={COUNTERTOP} fill="#a8a29e" opacity={0.6} />
                )}
                <rect x={r.x} y={r.y} width={r.w} height={r.h}
                  fill={isFiller ? 'url(#hatch)' : isHover ? '#ffedd5' : '#fff7ed'}
                  stroke={isHover ? 'var(--color-accent-hover)' : 'var(--color-accent)'} strokeWidth={isHover ? 6 : 3} />
                {comp && liftUp && comp.doorCount > 1 && (
                  <line x1={r.x + 6} y1={r.y + r.h / 2} x2={r.x + r.w - 6} y2={r.y + r.h / 2} stroke="var(--color-accent)" strokeWidth={2} opacity={0.6} />
                )}
                {comp && !liftUp && comp.doorCount > 1 && Array.from({ length: comp.doorCount - 1 }, (_, i) => (
                  <line key={i} x1={r.x + (r.w / comp.doorCount) * (i + 1)} y1={r.y + 6} x2={r.x + (r.w / comp.doorCount) * (i + 1)} y2={r.y + r.h - 6}
                    stroke="var(--color-accent)" strokeWidth={2} opacity={0.6} />
                ))}
                {drawerYs.map((y, i) => (
                  <line key={i} x1={r.x + 6} y1={y} x2={r.x + r.w - 6} y2={y} stroke="var(--color-accent)" strokeWidth={2} opacity={0.6} />
                ))}
                {!isFiller && (
                  <text x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" dominantBaseline="middle" fill="var(--color-text)" fontSize={fs} fontWeight={600}>
                    {p.code}
                  </text>
                )}
                {comp?.sink && p.row !== 'wall' && (
                  <g pointerEvents="none">
                    {comp.sink.bowls.map((b, i) => (
                      <rect key={i} x={r.x + b.x} y={r.y} width={b.w} height={200} fill="none" stroke="#3b82f6" strokeWidth={3} strokeDasharray="10,6" />
                    ))}
                    {comp.sink.faucet && (
                      <path d={`M ${r.x + comp.sink.faucet.x} ${r.y - COUNTERTOP} v -260 h 140 v 50`} fill="none" stroke="#27272a" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </g>
                )}
                <text x={r.x + r.w / 2} y={p.row === 'wall' ? r.y - 14 : floorY + 44} textAnchor="middle"
                  fill="var(--color-text-muted)" fontSize={30} fontFamily="var(--font-mono)">{p.width}</text>
              </g>
            );
          })}

          {/* Toplam ölçü */}
          <line x1={pad} y1={floorY + 80} x2={pad + wall.effectiveWidth} y2={floorY + 80} stroke="var(--color-text-dim)" strokeWidth={2} />
          <line x1={pad} y1={floorY + 64} x2={pad} y2={floorY + 96} stroke="var(--color-text-dim)" strokeWidth={2} />
          <line x1={pad + wall.effectiveWidth} y1={floorY + 64} x2={pad + wall.effectiveWidth} y2={floorY + 96} stroke="var(--color-text-dim)" strokeWidth={2} />
          <text x={pad + wall.effectiveWidth / 2} y={floorY + 112} textAnchor="middle" fill="var(--color-text)" fontSize={34} fontFamily="var(--font-mono)">
            {wall.effectiveWidth}
          </text>
        </svg>
      </div>
    </div>
  );
}
