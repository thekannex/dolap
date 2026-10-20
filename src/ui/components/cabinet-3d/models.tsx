import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { COUNTERTOP_THICKNESS, COUNTERTOP_OVERHANG } from '../../../core/layout/scene-layout';
import { useCabinetCalculations } from '../../hooks/use-cabinet-calculations';
import { hasRails, jointsOf } from '../../../core/engine/compute-cabinet';
import type { ProjectCabinet } from '../../../core/models/cabinet';
import type { Obstacle } from '../../../core/models/project';
import { protrusionOf } from '../../../core/layout/wall-fit';
import { S } from './scale';

export function Board({ pos, size, color, opacity = 1 }: { pos: [number, number, number]; size: [number, number, number]; color: string; opacity?: number }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

export function CabinetModel({ cabinet, showFronts, highlight = false }: { cabinet: ProjectCabinet; showFronts: boolean; highlight?: boolean }) {
  const c = useCabinetCalculations(cabinet);
  const W = cabinet.width / S;
  const L = c.legHeight / S;
  const H = cabinet.height / S - L;
  const D = cabinet.depth / S;
  const t = cabinet.bodyThickness / S;
  const bt = cabinet.backThickness / S;
  const d = cabinet.doorGap / S;
  const wood = highlight ? '#f2bf8c' : '#d9c3a0';
  const front = highlight ? '#f59e5b' : '#8bb8d4';

  if (cabinet.type === 'filler') {
    return <Board pos={[0, H / 2, 0]} size={[W, H, t]} color={front} />;
  }

  const innerW = W - 2 * t;
  const shelves = cabinet.shelfCount + cabinet.fixedShelfCount;
  const P = Math.max(0, Math.min(cabinet.plinthHeight || 0, cabinet.height / 2)) / S;
  const rods = c.interior ? 0 : Math.max(0, Math.floor(cabinet.hangerRodCount || 0));
  const frontZ = D / 2 + t / 2 + 0.01;
  const geo = c.interior;
  const LX = (x: number) => x / S - W / 2;
  const insetFronts = cabinet.doorOverlayType === 'inset';
  const jt = jointsOf(cabinet);
  const topOver = jt.topOver && !hasRails(cabinet);
  const bottomOver = jt.bottomOver && P === 0 && c.parts.some((p) => p.id === 'bottom');
  const sy0 = bottomOver ? t : 0;
  // Kapak arkasındaki yan dikme: gömme kapakta geri çekilir, kapaklar o yana kayar
  const lb = cabinet.doorOverlayType !== 'full' && Boolean(cabinet.leftSideBehind) && c.parts.some((p) => p.id === 'side-left');
  const rb = cabinet.doorOverlayType !== 'full' && Boolean(cabinet.rightSideBehind);
  const sideBack = (on: boolean) => (on && insetFronts ? t + 2 / S : 0);
  // Gömme kapakta dikmenin tamamı, yarım bindirmede açıkta kalan kısmı kadar kapak o yana uzar
  const ext = insetFronts ? t : t - cabinet.halfOverlayAmount / S;
  const doorShift = ((rb ? ext : 0) - (lb ? ext : 0)) / 2;
  const sy1 = H - (topOver ? t : 0);

  return (
    <group>
      {L > 0 && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`leg-${i}`} position={[sx * (W / 2 - 0.5), L / 2, sz * (D / 2 - 0.5)]}>
          <cylinderGeometry args={[0.18, 0.1, L, 12]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    <group position={[0, L, 0]}>
      {c.parts.some((p) => p.id === 'side-left') && <Board pos={[-W / 2 + t / 2, (sy0 + sy1) / 2, -sideBack(lb) / 2]} size={[t, sy1 - sy0, D - sideBack(lb)]} color={wood} />}
      <Board pos={[W / 2 - t / 2, (sy0 + sy1) / 2, -sideBack(rb) / 2]} size={[t, sy1 - sy0, D - sideBack(rb)]} color={wood} />
      {c.parts.some((p) => p.id === 'bottom') && <Board pos={[0, P + t / 2, 0]} size={[bottomOver ? W : innerW, t, D]} color={wood} />}
      {P > 0 && <Board pos={[0, P / 2, D / 2 - t / 2 - 0.2]} size={[innerW, P, t]} color={wood} />}
      {Array.from({ length: rods }, (_, i) => (
        <mesh key={`rod-${i}`} position={[0, H - t - 0.9 - i * ((H - P - 2 * t) / Math.max(1, rods)), 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, innerW - 0.04, 16]} />
          <meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {hasRails(cabinet) ? (
        <>
          <Board pos={[0, H - t / 2, D / 2 - cabinet.railWidth / S / 2]} size={[innerW, t, cabinet.railWidth / S]} color={wood} />
          <Board pos={[0, H - t / 2, -D / 2 + cabinet.railWidth / S / 2]} size={[innerW, t, cabinet.railWidth / S]} color={wood} />
        </>
      ) : (
        <Board pos={[0, H - t / 2, 0]} size={[topOver ? W : innerW, t, D]} color={wood} />
      )}
      {cabinet.hasBackPanel && (cabinet.backType === 'nailed'
        // Çakma arkalık dikmelerin arkasında, dış ölçüden 2'şer mm eksik
        ? <Board pos={[0, H / 2, -D / 2 - bt / 2]} size={[W - 0.04, H - 0.04, bt]} color="#b5b5b5" />
        : <Board pos={[0, H / 2, -D / 2 + bt / 2]} size={[innerW, H - 2 * t, bt]} color="#b5b5b5" />)}

      {geo && (
        <>
          {geo.dividers.map((dv) => (
            <Board key={`dv-${dv.index}`} pos={[LX(dv.x + dv.w / 2), (dv.y + dv.h / 2) / S, bt / 2 - (dv.behind && insetFronts ? (t + 2 / S) / 2 : 0)]}
              size={[t, dv.h / S, D - bt - (dv.behind && insetFronts ? t + 2 / S : 0)]} color={wood} />
          ))}
          {geo.partitions.map((p) => (
            <Board key={`pt-${p.col}-${p.cell}`} pos={[LX(p.x + p.w / 2), (p.y + p.h / 2) / S, bt / 2]} size={[p.w / S, t, D - bt]} color={wood} />
          ))}
          {geo.shelves.map((sh) => (
            <Board key={`sh-${sh.col}-${sh.cell}-${sh.index}`} pos={[LX(sh.rect.x + sh.rect.w / 2), (sh.rect.y + sh.rect.h / 2) / S, bt / 2 - 0.1]} size={[sh.rect.w / S, t, D - bt - 0.2]} color={wood} />
          ))}
          {geo.rods.map((r, i) => (
            <mesh key={`grod-${i}`} position={[LX((r.x1 + r.x2) / 2), r.y / S, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.12, 0.12, (r.x2 - r.x1) / S - 0.04, 16]} />
              <meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.3} />
            </mesh>
          ))}
          {showFronts && geo.fronts.map((fr) => (
            <Board key={`fr-${fr.col}-${fr.cell}-${fr.index}`} pos={[LX(fr.rect.x + fr.rect.w / 2), (fr.rect.y + fr.rect.h / 2) / S, insetFronts ? D / 2 - t / 2 : frontZ]}
              size={[fr.rect.w / S, fr.rect.h / S, t]} color={front} opacity={0.85} />
          ))}
        </>
      )}

      {!geo && Array.from({ length: shelves }, (_, i) => {
        const y = rods > 0 ? H - t - Math.min(3 * (i + 1), (H - P) * 0.4) : P + t + ((H - P - 2 * t) / (shelves + 1)) * (i + 1);
        return <Board key={i} pos={[0, y, bt / 2]} size={[innerW - 0.02, t, D - bt - 0.2]} color={wood} />;
      })}

      {!geo && showFronts && cabinet.doorOpening === 'up' && c.doorCount > 0 && Array.from({ length: c.doorCount }, (_, i) => {
        const dw = c.doorWidth / S;
        const dh = c.doorHeight / S;
        const inset = cabinet.doorOverlayType === 'inset';
        const top = inset ? H - t - d : H - d / 2;
        const y = top - dh / 2 - i * (dh + d);
        return <Board key={i} pos={[doorShift, y, inset ? D / 2 - t / 2 : frontZ]} size={[dw, dh, t]} color={front} opacity={0.8} />;
      })}

      {!geo && showFronts && cabinet.doorOpening !== 'up' && c.doorCount > 0 && Array.from({ length: c.doorCount }, (_, i) => {
        const dw = c.doorWidth / S;
        const dh = c.doorHeight / S;
        const inset = cabinet.doorOverlayType === 'inset';
        const step = inset ? dw + 2 * d : dw + d;
        const total = c.doorCount * step;
        const x = doorShift - total / 2 + step / 2 + i * step;
        return <Board key={i} pos={[x, P + (H - P) / 2, inset ? D / 2 - t / 2 : frontZ]} size={[dw, dh, t]} color={front} opacity={0.8} />;
      })}

      {!geo && showFronts && c.drawerFrontHeights.length > 0 && (() => {
        let top = H - d / 2;
        return c.drawerFrontHeights.map((fh, i) => {
          const h = fh / S;
          const y = top - h / 2;
          top -= h + d;
          return <Board key={i} pos={[0, y, frontZ]} size={[c.drawerFrontWidth / S, h, t]} color={front} opacity={0.85} />;
        });
      })()}
    </group>
    </group>
  );
}

/** Tezgâh üstündeki evye ve batarya; koordinatlar dolabın yerel ekseninde. */
export function SinkModel({ cabinet }: { cabinet: ProjectCabinet }) {
  const c = useCabinetCalculations(cabinet);
  if (!c.sink) return null;
  const W = cabinet.width / S;
  const D = cabinet.depth / S;
  const top = (cabinet.height + COUNTERTOP_THICKNESS) / S;
  const frontZ = D / 2 + COUNTERTOP_OVERHANG / S;
  const X = (x: number) => x / S - W / 2;
  const Z = (y: number) => frontZ - y / S;
  const { outer, bowls, faucet } = c.sink;
  return (
    <group>
      {cabinet.sink?.mount === 'inset' && (
        <Board pos={[X(outer.x + outer.w / 2), top + 0.01, Z(outer.y + outer.h / 2)]} size={[outer.w / S, 0.02, outer.h / S]} color="#d4d4d8" />
      )}
      {bowls.map((b, i) => (
        <Board key={i} pos={[X(b.x + b.w / 2), top + 0.025, Z(b.y + b.h / 2)]} size={[b.w / S, 0.01, b.h / S]} color="#52525b" />
      ))}
      {faucet && (
        <group position={[X(faucet.x), top, Z(faucet.y)]}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 2.4, 16]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.7} roughness={0.25} />
          </mesh>
          <mesh position={[0, 2.35, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 1.5, 12]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.7} roughness={0.25} />
          </mesh>
        </group>
      )}
    </group>
  );
}

const HOLE_TYPES = new Set(['recess', 'window', 'door']);
const POINT_COLORS: Record<string, string> = { outlet: '#f59e0b', water_inlet: '#0ea5e9', drain: '#64748b', gas: '#eab308' };
const WALL_T = 0.15;

/**
 * Duvar ve şekli: girinti, pencere ve kapı duvarda boşluk; kolon, kiriş, çıkıntı ve boru duvardan taşan kütle.
 * Yerel koordinat: duvarın sol alt köşesi orijin, duvar yüzü z = 0, oda +z yönünde.
 */
export function WallModel({ width, height, obstacles, selectedId, onObstacleDown, onObstacleHover, opacity = 1 }: {
  width: number; height: number; obstacles: Obstacle[]; selectedId?: string | null;
  onObstacleDown?: (id: string, e: ThreeEvent<PointerEvent>) => void;
  /** İmleç bir engelin üstüne gelince/ayrılınca (sürüklerken sahne dönmesin diye). */
  onObstacleHover?: (id: string | null) => void;
  opacity?: number;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(width / S, 0); shape.lineTo(width / S, height / S); shape.lineTo(0, height / S); shape.closePath();
    for (const o of obstacles) {
      if (!HOLE_TYPES.has(o.type)) continue;
      const x0 = Math.max(0.5, o.x); const x1 = Math.min(width - 0.5, o.x + o.width);
      const y0 = Math.max(0.5, o.y); const y1 = Math.min(height - 0.5, o.y + o.height);
      if (x1 - x0 < 1 || y1 - y0 < 1) continue;
      const hole = new THREE.Path();
      hole.moveTo(x0 / S, y0 / S); hole.lineTo(x0 / S, y1 / S); hole.lineTo(x1 / S, y1 / S); hole.lineTo(x1 / S, y0 / S); hole.closePath();
      shape.holes.push(hole);
    }
    return new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false });
  }, [width, height, obstacles]);

  const pick = (id: string) => (onObstacleDown ? {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onObstacleDown(id, e); },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'grab'; onObstacleHover?.(id); },
    onPointerOut: () => { document.body.style.cursor = ''; onObstacleHover?.(null); },
  } : {});

  return (
    <group>
      <mesh geometry={geometry} position={[0, 0, -WALL_T]} receiveShadow>
        <meshStandardMaterial color="#f5f5f4" transparent={opacity < 1} opacity={opacity} />
      </mesh>
      {obstacles.map((o) => {
        const sel = o.id === selectedId;
        const cx = (o.x + o.width / 2) / S;
        const cy = (o.y + o.height / 2) / S;
        const w = o.width / S;
        const h = o.height / S;
        if (o.type === 'recess') {
          const d = Math.max(10, o.depth) / S;
          return (
            <mesh key={o.id} position={[cx, cy, -d / 2]} {...pick(o.id)}>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={sel ? '#fdba74' : '#d6d3d1'} side={THREE.BackSide} />
            </mesh>
          );
        }
        if (o.type === 'window' || o.type === 'door') {
          return (
            <mesh key={o.id} position={[cx, cy, o.type === 'window' ? -WALL_T / 2 : -WALL_T + 0.01]} {...pick(o.id)}>
              <planeGeometry args={[w, h]} />
              <meshStandardMaterial color={sel ? '#fdba74' : o.type === 'window' ? '#bae6fd' : '#a8a29e'} transparent opacity={o.type === 'window' ? 0.55 : 1} side={THREE.DoubleSide} />
            </mesh>
          );
        }
        if (POINT_COLORS[o.type]) {
          return (
            <mesh key={o.id} position={[cx, cy, 0.01]} {...pick(o.id)}>
              <planeGeometry args={[Math.max(w, 0.6), Math.max(h, 0.6)]} />
              <meshStandardMaterial color={sel ? '#ea580c' : POINT_COLORS[o.type]} />
            </mesh>
          );
        }
        if (o.type === 'appliance') {
          return (
            <mesh key={o.id} position={[cx, cy, 0.01]} {...pick(o.id)}>
              <planeGeometry args={[w, h]} />
              <meshStandardMaterial color={sel ? '#fdba74' : '#93c5fd'} transparent opacity={0.4} />
            </mesh>
          );
        }
        const p = protrusionOf(o);
        const d = Math.max(10, Number.isFinite(p) ? p : 10) / S;
        return (
          <mesh key={o.id} position={[cx, cy, d / 2]} castShadow receiveShadow {...pick(o.id)}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={sel ? '#fb923c' : o.type === 'pipe' ? '#a1a1aa' : '#d6d3d1'} />
          </mesh>
        );
      })}
    </group>
  );
}
