import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { useMemo, useState } from 'react';
import { Box as BoxIcon, Pencil } from 'lucide-react';
import { useUIStore } from '../../../stores/ui-store';
import { layoutScene, COUNTERTOP_THICKNESS, COUNTERTOP_OVERHANG, ON_LEGS } from '../../../core/layout/scene-layout';
import type { SceneLayout } from '../../../core/layout/scene-layout';
import { useProjectStore, useActiveCabinet } from '../../../stores/project-store';
import type { ProjectCabinet } from '../../../core/models/cabinet';
import { Button, EmptyState, Toggle } from '../shared/ui';
import { Board, CabinetModel, SinkModel, WallModel } from './models';
import { S } from './scale';


function SetScene({ layout, cabinets, showFronts, activeId, onSelect }: {
  layout: SceneLayout; cabinets: ProjectCabinet[]; showFronts: boolean; activeId: string | undefined; onSelect: (id: string) => void;
}) {
  const byId = useMemo(() => new Map(cabinets.map((c) => [c.id, c])), [cabinets]);
  return (
    <>
      {layout.walls.map((w) => (
        <group key={w.id}>
          <group position={[w.x / S, 0, 0]}>
            <WallModel width={w.width} height={w.height} obstacles={w.obstacles} />
          </group>
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
          <group key={p.key} position={[(p.x + p.width / 2) / S, p.elevation / S, p.back / S + D / 2]}
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
