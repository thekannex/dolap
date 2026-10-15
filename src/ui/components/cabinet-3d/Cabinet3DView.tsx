import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useState } from 'react';
import { Box as BoxIcon } from 'lucide-react';
import { useProjectStore, useActiveCabinet } from '../../../stores/project-store';
import { useCabinetCalculations } from '../../hooks/use-cabinet-calculations';
import { hasRails } from '../../../core/engine/compute-cabinet';
import type { ProjectCabinet } from '../../../core/models/cabinet';
import { EmptyState, Toggle } from '../shared/ui';

const S = 100; // 1 birim = 100 mm

function Board({ pos, size, color, opacity = 1 }: { pos: [number, number, number]; size: [number, number, number]; color: string; opacity?: number }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function CabinetModel({ cabinet, showFronts }: { cabinet: ProjectCabinet; showFronts: boolean }) {
  const c = useCabinetCalculations(cabinet);
  const W = cabinet.width / S;
  const H = cabinet.height / S;
  const D = cabinet.depth / S;
  const t = cabinet.bodyThickness / S;
  const bt = cabinet.backThickness / S;
  const d = cabinet.doorGap / S;
  const wood = '#d9c3a0';
  const front = '#8bb8d4';

  if (cabinet.type === 'filler') {
    return <Board pos={[0, H / 2, 0]} size={[W, H, t]} color={front} />;
  }

  const innerW = W - 2 * t;
  const shelves = cabinet.shelfCount + cabinet.fixedShelfCount;
  const frontZ = D / 2 + t / 2 + 0.01;

  return (
    <group>
      <Board pos={[-W / 2 + t / 2, H / 2, 0]} size={[t, H, D]} color={wood} />
      <Board pos={[W / 2 - t / 2, H / 2, 0]} size={[t, H, D]} color={wood} />
      <Board pos={[0, t / 2, 0]} size={[innerW, t, D]} color={wood} />
      {hasRails(cabinet) ? (
        <>
          <Board pos={[0, H - t / 2, D / 2 - cabinet.railWidth / S / 2]} size={[innerW, t, cabinet.railWidth / S]} color={wood} />
          <Board pos={[0, H - t / 2, -D / 2 + cabinet.railWidth / S / 2]} size={[innerW, t, cabinet.railWidth / S]} color={wood} />
        </>
      ) : (
        <Board pos={[0, H - t / 2, 0]} size={[innerW, t, D]} color={wood} />
      )}
      {cabinet.hasBackPanel && <Board pos={[0, H / 2, -D / 2 + bt / 2]} size={[innerW, H - 2 * t, bt]} color="#b5b5b5" />}

      {Array.from({ length: shelves }, (_, i) => {
        const y = t + ((H - 2 * t) / (shelves + 1)) * (i + 1);
        return <Board key={i} pos={[0, y, bt / 2]} size={[innerW - 0.02, t, D - bt - 0.2]} color={wood} />;
      })}

      {showFronts && c.doorCount > 0 && Array.from({ length: c.doorCount }, (_, i) => {
        const dw = c.doorWidth / S;
        const dh = c.doorHeight / S;
        const inset = cabinet.doorOverlayType === 'inset';
        const step = inset ? dw + 2 * d : dw + d;
        const total = c.doorCount * step;
        const x = -total / 2 + step / 2 + i * step;
        return <Board key={i} pos={[x, H / 2, inset ? D / 2 - t / 2 : frontZ]} size={[dw, dh, t]} color={front} opacity={0.8} />;
      })}

      {showFronts && c.drawerFrontHeights.length > 0 && (() => {
        let top = H - d / 2;
        return c.drawerFrontHeights.map((fh, i) => {
          const h = fh / S;
          const y = top - h / 2;
          top -= h + d;
          return <Board key={i} pos={[0, y, frontZ]} size={[c.drawerFrontWidth / S, h, t]} color={front} opacity={0.85} />;
        });
      })()}
    </group>
  );
}

export default function Cabinet3DView() {
  const cabinet = useActiveCabinet();
  const cabinets = useProjectStore((s) => s.project?.cabinets ?? []);
  const setActiveCabinet = useProjectStore((s) => s.setActiveCabinet);
  const [showFronts, setShowFronts] = useState(true);

  if (!cabinet) {
    return <EmptyState icon={<BoxIcon size={32} />} title="Gösterilecek dolap yok" text="Projeye dolap ekleyince burada 3 boyutlu görebilirsiniz." />;
  }

  const size = Math.max(cabinet.width, cabinet.height, cabinet.depth) / S;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] text-sm">
        <select value={cabinet.id} onChange={(e) => setActiveCabinet(e.target.value)}
          className="bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-md px-2 py-1 text-sm">
          {cabinets.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
        </select>
        <Toggle label="Kapak ve klapalar" checked={showFronts} onChange={setShowFronts} />
        <span className="ml-auto text-xs text-[var(--color-text-dim)]">Sürükle: döndür · Tekerlek: yakınlaş · Sağ tık: kaydır</span>
      </div>
      <div className="flex-1 bg-gradient-to-b from-[#f4f4f5] to-[#e4e4e7]">
        <Canvas key={cabinet.id} shadows camera={{ position: [size * 1.1, size * 0.9, size * 1.6], fov: 45 }}>
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
      </div>
    </div>
  );
}
