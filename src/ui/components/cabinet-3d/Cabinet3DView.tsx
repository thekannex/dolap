import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { useMemo, useState } from 'react';
import { Box as BoxIcon, Pencil } from 'lucide-react';
import { useUIStore } from '../../../stores/ui-store';
import { layoutScene, COUNTERTOP_THICKNESS, COUNTERTOP_OVERHANG, ON_LEGS } from '../../../core/layout/scene-layout';
import type { SceneLayout } from '../../../core/layout/scene-layout';
import { useProjectStore, useActiveCabinet } from '../../../stores/project-store';
import { useCabinetCalculations } from '../../hooks/use-cabinet-calculations';
import { hasRails, jointsOf } from '../../../core/engine/compute-cabinet';
import type { ProjectCabinet } from '../../../core/models/cabinet';
import { Button, EmptyState, Toggle } from '../shared/ui';

const S = 100; // 1 birim = 100 mm

function Board({ pos, size, color, opacity = 1 }: { pos: [number, number, number]; size: [number, number, number]; color: string; opacity?: number }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function CabinetModel({ cabinet, showFronts, highlight = false }: { cabinet: ProjectCabinet; showFronts: boolean; highlight?: boolean }) {
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
      {cabinet.hasBackPanel && <Board pos={[0, H / 2, -D / 2 + bt / 2]} size={[innerW, H - 2 * t, bt]} color="#b5b5b5" />}

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
function SinkModel({ cabinet }: { cabinet: ProjectCabinet }) {
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

function SetScene({ layout, cabinets, showFronts, activeId, onSelect }: {
  layout: SceneLayout; cabinets: ProjectCabinet[]; showFronts: boolean; activeId: string | undefined; onSelect: (id: string) => void;
}) {
  const byId = useMemo(() => new Map(cabinets.map((c) => [c.id, c])), [cabinets]);
  return (
    <>
      {layout.walls.map((w) => (
        <group key={w.id}>
          <mesh position={[(w.x + w.width / 2) / S, w.height / 2 / S, -0.03]} receiveShadow>
            <boxGeometry args={[w.width / S, w.height / S, 0.05]} />
            <meshStandardMaterial color="#f5f5f4" />
          </mesh>
          <Html position={[w.x / S, w.height / S + 0.5, 0]} style={{ pointerEvents: 'none' }}>
            <div className="whitespace-nowrap text-xs font-semibold text-[#57534e] bg-white/80 rounded px-1.5 py-0.5">{w.name}</div>
          </Html>
        </group>
      ))}
      {layout.looseStart !== null && layout.walls.length > 0 && (
        <Html position={[layout.looseStart / S, layout.height / S + 0.5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap text-xs font-semibold text-[#57534e] bg-white/80 rounded px-1.5 py-0.5">Duvara atanmamış</div>
        </Html>
      )}
      {layout.placements.map((p) => {
        const cab = byId.get(p.cabinetId);
        if (!cab) return null;
        const W = p.width / S;
        const D = p.depth / S;
        const legs = cab.row !== 'wall' && ON_LEGS.has(cab.type) && p.elevation > 0;
        return (
          <group key={p.key} position={[(p.x + p.width / 2) / S, p.elevation / S, D / 2]}
            onClick={(e) => { e.stopPropagation(); onSelect(cab.id); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = ''; }}>
            <CabinetModel cabinet={cab} showFronts={showFronts} highlight={cab.id === activeId} />
            {p.countertop && (
              <Board pos={[0, (p.height + COUNTERTOP_THICKNESS / 2) / S, COUNTERTOP_OVERHANG / 2 / S]}
                size={[W, COUNTERTOP_THICKNESS / S, D + COUNTERTOP_OVERHANG / S]} color="#78716c" />
            )}
            {p.countertop && cab.sink && <SinkModel cabinet={cab} />}
            {legs && (
              <Board pos={[0, -p.elevation / 2 / S, D / 2 - 0.5]} size={[W, p.elevation / S, 0.16]} color="#57534e" />
            )}
          </group>
        );
      })}
    </>
  );
}

export default function Cabinet3DView() {
  const cabinet = useActiveCabinet();
  const project = useProjectStore((s) => s.project);
  const cabinets = useMemo(() => project?.cabinets ?? [], [project]);
  const setActiveCabinet = useProjectStore((s) => s.setActiveCabinet);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const [showFronts, setShowFronts] = useState(true);
  const [mode, setMode] = useState<'single' | 'set'>(cabinets.length > 1 ? 'set' : 'single');
  const layout = useMemo(() => (project ? layoutScene(project) : null), [project]);

  if (!cabinet || !layout) {
    return <EmptyState icon={<BoxIcon size={32} />} title="Gösterilecek dolap yok" text="Projeye dolap ekleyince burada 3 boyutlu görebilirsiniz." />;
  }

  const size = Math.max(cabinet.width, cabinet.height, cabinet.depth) / S;
  const setW = layout.width / S;
  const setH = layout.height / S;
  const setDist = Math.max(setW * 0.75, setH * 1.4, 12);
  const floorSize = Math.max(setW, setH, 10) * 3;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] text-sm">
        <div role="radiogroup" aria-label="Görünüm" className="flex rounded-md border border-[var(--color-border)] overflow-hidden">
          {([['single', 'Tek dolap'], ['set', 'Tüm set']] as const).map(([val, label]) => (
            <button key={val} role="radio" aria-checked={mode === val} onClick={() => setMode(val)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${mode === val ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]/60'}`}>
              {label}
            </button>
          ))}
        </div>
        <select value={cabinet.id} onChange={(e) => setActiveCabinet(e.target.value)} aria-label="Dolap"
          className="bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-md px-2 py-1 text-sm">
          {cabinets.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
        </select>
        <Button size="sm" variant="ghost" onClick={() => setActivePage('editor')}><Pencil size={13} /> Düzenle</Button>
        <Toggle label="Kapak ve klapalar" checked={showFronts} onChange={setShowFronts} />
        <span className="ml-auto text-xs text-[var(--color-text-dim)]">
          {mode === 'set' ? 'Tıkla: dolabı seç · ' : ''}Sürükle: döndür · Tekerlek: yakınlaş · Sağ tık: kaydır
        </span>
      </div>
      <div className="flex-1 bg-gradient-to-b from-[#f4f4f5] to-[#e4e4e7]">
        {mode === 'single' ? (
          <Canvas key={`single-${cabinet.id}`} shadows camera={{ position: [size * 1.1, size * 0.9, size * 1.6], fov: 45 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 15, 10]} intensity={1.1} castShadow />
            <directionalLight position={[-8, 6, -6]} intensity={0.35} />
            <group position={[0, -cabinet.height / S / 2, 0]}>
              <CabinetModel cabinet={cabinet} showFronts={showFronts} />
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
                <planeGeometry args={[size * 4, size * 4]} />
                <meshStandardMaterial color="#e7e5e4" />
              </mesh>
            </group>
            <OrbitControls makeDefault target={[0, 0, 0]} />
          </Canvas>
        ) : (
          <Canvas key="set" shadows camera={{ position: [setW / 2 + setDist * 0.35, setH * 0.75, setDist], fov: 45 }}>
            <ambientLight intensity={0.65} />
            <directionalLight position={[setW / 2 + 10, 25, 20]} intensity={1.1} castShadow />
            <directionalLight position={[-10, 10, 10]} intensity={0.3} />
            <SetScene layout={layout} cabinets={cabinets} showFronts={showFronts} activeId={cabinet.id} onSelect={setActiveCabinet} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[setW / 2, -0.001, 0]} receiveShadow>
              <planeGeometry args={[floorSize, floorSize]} />
              <meshStandardMaterial color="#e7e5e4" />
            </mesh>
            <OrbitControls makeDefault target={[setW / 2, setH / 2, 0]} />
          </Canvas>
        )}
      </div>
    </div>
  );
}
