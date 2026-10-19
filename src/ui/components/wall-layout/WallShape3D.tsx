import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Edges, Html, OrbitControls } from '@react-three/drei';
import { MousePointer2, PenTool, Maximize, Trash2, Hammer, ExternalLink } from 'lucide-react';
import { useProjectStore } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';
import type { Obstacle, Wall } from '../../../core/models/project';
import { defaultShape, fitWall, wallHeightOf, DEFAULT_FIT_OPTIONS } from '../../../core/layout/wall-fit';
import type { FitRegion } from '../../../core/layout/wall-fit';
import { CabinetModel, WallModel } from '../cabinet-3d/models';
import { S } from '../cabinet-3d/scale';
import { Button, NumInput, Section } from '../shared/ui';
import { OBSTACLE_TYPES, obstacleInfo } from './obstacle-types';

const SNAP = 10;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Drag =
  | { kind: 'obstacle'; id: string; dx: number; dy: number; x: number; y: number }
  | { kind: 'region'; x0: number; y0: number; x1: number; y1: number };

/**
 * Duvarın şeklini 3B kurma ve duvara oturan dolap çizme.
 * Kolon, kiriş, çıkıntı ve girinti sürüklenerek konumlanır; duvarın üstüne çizilen alan
 * engellere göre kutulara bölünür ve tek tıkla serbest çizim kompozisyonu olarak kurulur.
 */
export default function WallShape3D({ wall }: { wall: Wall }) {
  const project = useProjectStore((s) => s.project);
  const addObstacle = useProjectStore((s) => s.addObstacle);
  const updateObstacle = useProjectStore((s) => s.updateObstacle);
  const removeObstacle = useProjectStore((s) => s.removeObstacle);
  const createFitted = useProjectStore((s) => s.createFittedComposition);
  const setActivePage = useUIStore((s) => s.setActivePage);

  const L = wall.effectiveWidth;
  const H = wallHeightOf(wall);
  const fitted = useMemo(() => project?.compositions.filter((c) => c.wallId === wall.id) ?? [], [project, wall.id]);
  const target = fitted[fitted.length - 1] ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'region'>('select');
  const [region, setRegion] = useState<FitRegion>(() => target?.fit?.region ?? { x: 0, y: 0, width: L, height: H, depth: 600 });
  const [topHeight, setTopHeight] = useState(target?.fit?.topHeight ?? 0);
  const [maxModule, setMaxModule] = useState(target?.fit?.maxModule ?? DEFAULT_FIT_OPTIONS.maxModule);
  const [view, setView] = useState<'preview' | 'built'>(target ? 'built' : 'preview');
  const [drag, setDrag] = useState<Drag | null>(null);
  const [overObstacle, setOverObstacle] = useState<string | null>(null);

  // Sürüklenen engel taslak olarak çizilir, bırakınca kaydedilir
  const obstacles: Obstacle[] = useMemo(() => wall.obstacles.map((o) => (
    drag?.kind === 'obstacle' && drag.id === o.id ? { ...o, x: drag.x, y: drag.y } : o
  )), [wall.obstacles, drag]);
  const liveRegion: FitRegion = useMemo(() => (drag?.kind === 'region'
    ? { x: Math.min(drag.x0, drag.x1), y: Math.min(drag.y0, drag.y1), width: Math.abs(drag.x1 - drag.x0), height: Math.abs(drag.y1 - drag.y0), depth: region.depth }
    : region), [drag, region]);
  const fit = useMemo(() => fitWall({ ...wall, obstacles }, liveRegion, { topHeight, maxModule }),
    [wall, obstacles, liveRegion, topHeight, maxModule]);
  const builtBoxes = useMemo(() => (target && project ? project.cabinets.filter((c) => c.groupId === target.id) : []), [project, target]);

  const selected = wall.obstacles.find((o) => o.id === selectedId) ?? null;

  const toMm = (e: ThreeEvent<PointerEvent>) => ({ x: e.point.x * S, y: e.point.y * S });

  const startObstacle = (id: string, e: ThreeEvent<PointerEvent>) => {
    if (tool === 'region') { startRegion(e); return; }
    const o = wall.obstacles.find((x) => x.id === id);
    if (!o) return;
    setSelectedId(id);
    const p = toMm(e);
    setDrag({ kind: 'obstacle', id, dx: p.x - o.x, dy: p.y - o.y, x: o.x, y: o.y });
  };
  const startRegion = (e: ThreeEvent<PointerEvent>) => {
    if (tool !== 'region') { setSelectedId(null); return; }
    e.stopPropagation();
    const p = toMm(e);
    const x = clamp(snap(p.x), 0, L);
    const y = clamp(snap(p.y), 0, H);
    setDrag({ kind: 'region', x0: x, y0: y, x1: x, y1: y });
  };
  const moveDrag = (e: ThreeEvent<PointerEvent>) => {
    if (!drag) return;
    const p = toMm(e);
    if (drag.kind === 'obstacle') {
      const o = wall.obstacles.find((x) => x.id === drag.id)!;
      setDrag({ ...drag, x: clamp(snap(p.x - drag.dx), 0, Math.max(0, L - o.width)), y: clamp(snap(p.y - drag.dy), 0, Math.max(0, H - o.height)) });
    } else {
      setDrag({ ...drag, x1: clamp(snap(p.x), 0, L), y1: clamp(snap(p.y), 0, H) });
    }
  };
  const finishDrag = () => {
    if (!drag) return;
    if (drag.kind === 'obstacle') {
      const o = wall.obstacles.find((x) => x.id === drag.id);
      if (o && (o.x !== drag.x || o.y !== drag.y)) updateObstacle(wall.id, drag.id, { x: drag.x, y: drag.y });
    } else if (liveRegion.width >= 100 && liveRegion.height >= 100) {
      setRegion(liveRegion);
      setView('preview');
      setTool('select');
    }
    setDrag(null);
  };

  // İmleç tuvalden çıkarken bırakılsa da sürükleme biter
  useEffect(() => {
    if (!drag) return;
    const up = () => finishDrag();
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  });

  const addShape = (type: string) => {
    const id = addObstacle(wall.id, { wallId: wall.id, type, ...defaultShape(type, wall) });
    setSelectedId(id);
    setTool('select');
  };

  const build = (replace: boolean) => {
    const id = createFitted(wall.id, fit.boxes, { region: fit.region, topHeight, maxModule }, replace ? target?.id : null);
    if (id) setView('built');
  };

  const cabinetsN = fit.boxes.filter((b) => b.kind === 'cabinet').length;
  const fillersN = fit.boxes.length - cabinetsN;
  const shallowN = fit.boxes.filter((b) => b.kind === 'cabinet' && b.backOffset > 0).length;
  const size = Math.max(L, H) / S;
  const r = liveRegion;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="relative flex-1 min-w-0 bg-gradient-to-b from-[#f4f4f5] to-[#e4e4e7]">
        <div className="absolute top-2 left-2 z-10 flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]/95 p-1 shadow-sm">
          <Button size="sm" variant={tool === 'select' ? 'primary' : 'ghost'} onClick={() => setTool('select')} title="Engelleri seç ve sürükle">
            <MousePointer2 size={13} /> Seç / taşı
          </Button>
          <Button size="sm" variant={tool === 'region' ? 'primary' : 'ghost'} onClick={() => setTool('region')} title="Duvarın üstünde sürükleyerek dolap alanını çiz">
            <PenTool size={13} /> Dolap alanı çiz
          </Button>
        </div>
        <p className="absolute bottom-2 left-2 z-10 text-[11px] text-[#57534e] bg-white/80 rounded px-1.5 py-0.5">
          {tool === 'region' ? 'Duvarın üstünde sürükleyin: dolabın kaplayacağı alan' : 'Engeli sürükleyin · Boşta sürükle: döndür · Tekerlek: yakınlaş · Sağ tık: kaydır'}
        </p>
        <Canvas key={wall.id} shadows camera={{ position: [L / S / 2 + size * 0.3, H / S * 0.75, size * 1.7], fov: 45 }}
          onPointerMissed={() => tool === 'select' && setSelectedId(null)}>
          <ambientLight intensity={0.65} />
          <directionalLight position={[L / S / 2 + 8, 25, 20]} intensity={1.1} castShadow />
          <directionalLight position={[-10, 10, 10]} intensity={0.3} />
          <group onPointerDown={startRegion}>
            <WallModel width={L} height={H} obstacles={obstacles} selectedId={selectedId} onObstacleDown={startObstacle} onObstacleHover={setOverObstacle} />
          </group>
          {/* Sürüklerken imleci yakalayan görünmez duvar düzlemi */}
          {drag && (
            <mesh position={[L / S / 2, H / S / 2, 0]} onPointerMove={moveDrag} onPointerUp={finishDrag}>
              <planeGeometry args={[size * 20, size * 20]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          )}

          {/* Dolap alanı */}
          {r.width > 0 && r.height > 0 && (
            <mesh position={[(r.x + r.width / 2) / S, (r.y + r.height / 2) / S, r.depth / S / 2]} raycast={() => null}>
              <boxGeometry args={[r.width / S, r.height / S, r.depth / S]} />
              <meshBasicMaterial color="#ea580c" transparent opacity={view === 'preview' || drag ? 0.04 : 0} depthWrite={false} />
              <Edges color="#ea580c" />
            </mesh>
          )}

          {/* Önizleme: hesaplanan kutular */}
          {(view === 'preview' || drag || !target) && fit.boxes.map((b, i) => (
            <mesh key={i} position={[(b.x + b.width / 2) / S, (b.elevation + b.height / 2) / S, (b.backOffset + b.depth / 2) / S]} raycast={() => null}>
              <boxGeometry args={[b.width / S - 0.04, b.height / S - 0.04, b.depth / S - 0.02]} />
              <meshStandardMaterial color={b.kind === 'filler' ? '#fdba74' : b.backOffset > 0 ? '#a5b4fc' : '#93c5fd'} transparent opacity={0.55} />
              <Edges color={b.kind === 'filler' ? '#c2410c' : '#1d4ed8'} />
              {b.width >= 250 && b.height >= 250 && (
                <Html center position={[0, 0, b.depth / S / 2]} style={{ pointerEvents: 'none' }}>
                  <div className="whitespace-nowrap text-[10px] font-mono text-[#1e3a8a] bg-white/75 rounded px-1">
                    {b.kind === 'filler' ? 'dolgu ' : ''}{b.width}×{b.height}{b.backOffset > 0 && b.kind === 'cabinet' ? ` · d${b.depth}` : ''}
                  </div>
                </Html>
              )}
            </mesh>
          ))}

          {/* Kurulu dolap */}
          {view === 'built' && !drag && builtBoxes.map((c) => (
            <group key={c.id} position={[((c.x ?? 0) + c.width / 2) / S, (c.elevation ?? 0) / S, ((c.backOffset ?? 0) + c.depth / 2) / S]}>
              <CabinetModel cabinet={c} showFronts />
            </group>
          ))}

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[L / S / 2, -0.001, size]} receiveShadow raycast={() => null}>
            <planeGeometry args={[size * 4, size * 4]} />
            <meshStandardMaterial color="#e7e5e4" />
          </mesh>
          <OrbitControls makeDefault enabled={!drag && tool === 'select' && !overObstacle} target={[L / S / 2, H / S / 2, 0]} />
        </Canvas>
      </div>

      <aside className="w-72 shrink-0 h-full overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 flex flex-col gap-3">
        <Section title="Duvar şekli">
          <div className="grid grid-cols-2 gap-1">
            {OBSTACLE_TYPES.filter((t) => t.shape).map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => addShape(value)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          {selected ? (
            <div className="rounded-md bg-[var(--color-bg)] p-2 flex flex-col gap-2 border border-[var(--color-accent)]/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold flex-1">{obstacleInfo(selected.type).label}</span>
                <button onClick={() => { removeObstacle(wall.id, selected.id); setSelectedId(null); }} aria-label="Engeli sil"
                  className="text-[var(--color-text-dim)] hover:text-[var(--color-error)]"><Trash2 size={13} /></button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <NumInput label="Soldan" value={selected.x} onChange={(v) => updateObstacle(wall.id, selected.id, { x: v })} max={20000} />
                <NumInput label="Yerden" value={selected.y} onChange={(v) => updateObstacle(wall.id, selected.id, { y: v })} max={6000} />
                <NumInput label="En" value={selected.width} onChange={(v) => updateObstacle(wall.id, selected.id, { width: v })} min={1} max={20000} />
                <NumInput label="Boy" value={selected.height} onChange={(v) => updateObstacle(wall.id, selected.id, { height: v })} min={1} max={6000} />
                <NumInput label={selected.type === 'recess' ? 'Derinlik (içeri)' : 'Derinlik (taşma)'} value={selected.depth}
                  onChange={(v) => updateObstacle(wall.id, selected.id, { depth: v })} max={3000} />
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--color-text-dim)]">
              Ekleyip sahnede sürükleyin ya da seçip ölçüsünü girin. Derinlik, duvardan odaya ne kadar taştığıdır. Pencere, kapı ve prizler soldaki "Engeller" listesinden eklenir.
            </p>
          )}
        </Section>

        <Section title="Dolap alanı">
          <div className="flex gap-1.5">
            <Button size="sm" variant={tool === 'region' ? 'primary' : 'secondary'} onClick={() => setTool(tool === 'region' ? 'select' : 'region')}>
              <PenTool size={13} /> Duvara çiz
            </Button>
            <Button size="sm" onClick={() => { setRegion({ ...region, x: 0, y: 0, width: L, height: H }); setView('preview'); }} title="Duvarı boydan boya kapla">
              <Maximize size={13} /> Boydan boya
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumInput label="Soldan" value={region.x} onChange={(v) => { setRegion({ ...region, x: v }); setView('preview'); }} max={L} />
            <NumInput label="Yerden" value={region.y} onChange={(v) => { setRegion({ ...region, y: v }); setView('preview'); }} max={H} />
            <NumInput label="Genişlik" value={region.width} onChange={(v) => { setRegion({ ...region, width: v }); setView('preview'); }} min={100} max={20000} />
            <NumInput label="Yükseklik" value={region.height} onChange={(v) => { setRegion({ ...region, height: v }); setView('preview'); }} min={100} max={6000} />
            <NumInput label="Derinlik" value={region.depth} onChange={(v) => { setRegion({ ...region, depth: v }); setView('preview'); }} min={100} max={1200} />
            <NumInput label="En geniş modül" value={maxModule} onChange={(v) => { setMaxModule(Math.max(300, v)); setView('preview'); }} min={300} max={2400} />
            <NumInput label="Üst kutu yüksekliği" value={topHeight} onChange={(v) => { setTopHeight(v); setView('preview'); }} max={1200}
              hint="0 = ayrı üst kutu yok" />
          </div>
        </Section>

        <Section title="Sonuç">
          <p className="text-sm">
            <span className="font-semibold">{cabinetsN}</span> dolap
            {shallowN > 0 && <span className="text-[var(--color-text-muted)]"> ({shallowN} sığ)</span>}
            {fillersN > 0 && <> · <span className="font-semibold">{fillersN}</span> dolgu</>}
            {fit.blocked.length > 0 && <span className="text-[var(--color-text-muted)]"> · {fit.blocked.length} boş bölge</span>}
          </p>
          <p className="text-[11px] text-[var(--color-text-dim)]">
            Önler duvardan {region.depth} mm'de hizalanır. Çıkıntının önüne sığ dolap (mor), yer kalmayan yere dolgu paneli (turuncu) gelir; kirişin altında dolap kısalır, önünde sığ üst kutu oluşur. Pencere ve kapının önü boş kalır.
          </p>
          {fit.warnings.map((w) => <p key={w} className="text-[11px] text-[var(--color-warning)]">{w}</p>)}
          {target && (
            <div role="radiogroup" aria-label="Görünüm" className="flex rounded-md border border-[var(--color-border)] overflow-hidden">
              {([['built', 'Kurulu dolap'], ['preview', 'Önizleme']] as const).map(([val, label]) => (
                <button key={val} role="radio" aria-checked={view === val} onClick={() => setView(val)}
                  className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${view === val ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]/60'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {target ? (
            <>
              <Button variant="primary" disabled={cabinetsN + fillersN === 0} onClick={() => build(true)}>
                <Hammer size={14} /> "{target.name}" dolabını yenile
              </Button>
              <p className="text-[11px] text-[var(--color-text-dim)] -mt-1">Yenileme, bu dolapta elle yaptığınız değişiklikleri siler.</p>
              <Button size="sm" disabled={cabinetsN + fillersN === 0} onClick={() => build(false)}>Ayrı yeni dolap olarak ekle</Button>
              <Button size="sm" variant="ghost" onClick={() => setActivePage('composer')}>
                <ExternalLink size={13} /> Dolap düzenine geç (raf, kapak)
              </Button>
            </>
          ) : (
            <Button variant="primary" disabled={cabinetsN + fillersN === 0} onClick={() => build(false)}>
              <Hammer size={14} /> Dolabı oluştur
            </Button>
          )}
        </Section>
      </aside>
    </div>
  );
}
