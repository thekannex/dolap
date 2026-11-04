import { useMemo, useState } from 'react';
import { AlertTriangle, Pencil, Trash2, MousePointerClick } from 'lucide-react';
import type { Wall } from '../../../core/models/project';
import type { ProjectCabinet } from '../../../core/models/cabinet';
import type { ComputedCabinet } from '../../../core/engine/compute-cabinet';
import { placeWallCabinets, checkWallFit } from '../../../core/layout/wall-elevation';
import { kitchenCanvas, kitchenYLocked } from '../../../core/layout/kitchen-canvas';
import type { CanvasRect } from '../../../core/layout/kitchen-canvas';
import { boxesOverlap } from '../../../core/layout/composition';
import { wallHeightOf } from '../../../core/layout/wall-fit';
import { CABINET_TYPE_LABELS } from '../../../core/engine/cabinet-factory';
import { interiorFromCabinet } from '../../../core/engine/interior';
import { useProjectStore } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';
import { useProjectComputation } from '../../hooks/use-cabinet-calculations';
import ComposerCanvas from '../composer/ComposerCanvas';
import InteriorEditor from '../interior/InteriorEditor';
import type { CellRef } from '../interior/InteriorSvg';
import BehindDoorControl from '../shared/BehindDoorControl';
import JointControls from '../shared/JointControls';
import { Button, NumInput, Section } from '../shared/ui';
import { ON_LEGS, WITH_COUNTERTOP, COUNTERTOP_THICKNESS as COUNTERTOP } from '../../../core/layout/scene-layout';

/** Seçili mutfak dolabı: raf, kapak, bölme; ölçü ve konum; dikmeler. Duvar dolabının kutu paneliyle aynı araçlar. */
function KitchenBoxPanel({ cab, box, onMove, selectedCell, onSelectCell }: {
  cab: ProjectCabinet; box: ProjectCabinet; onMove: (rect: CanvasRect) => void;
  selectedCell: CellRef | null; onSelectCell: (ref: CellRef | null) => void;
}) {
  const updateCabinet = useProjectStore((s) => s.updateCabinet);
  const removeCabinet = useProjectStore((s) => s.removeCabinet);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const confirm = useUIStore((s) => s.confirm);
  const rect = { x: box.x ?? 0, y: box.elevation ?? 0, w: box.width, h: box.height };
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold">{cab.code}</p>
          <p className="text-xs text-[var(--color-text-muted)] truncate">{cab.name} · {CABINET_TYPE_LABELS[cab.type]}</p>
        </div>
        <Button size="sm" variant="danger" aria-label="Dolabı sil" title="Dolabı sil" onClick={async () => {
          if (await confirm({ title: 'Dolap silinsin mi?', message: `${cab.code} duvardan kaldırılacak.`, confirmLabel: 'Sil', danger: true })) removeCabinet(cab.id);
        }}><Trash2 size={14} /></Button>
      </div>

      {cab.type !== 'filler' && (
        <Section title="Raflar, kapaklar ve bölmeler">
          {/* Bölmesiz dolap da bölmeli gösterilir; ilk değişiklikte bölmeli kaydedilir */}
          <InteriorEditor cabinet={cab.interior ? cab : { ...cab, interior: interiorFromCabinet(cab) }} selected={selectedCell} onSelect={onSelectCell} />
        </Section>
      )}

      <Section title="Ölçü ve konum">
        <div className="grid grid-cols-3 gap-2">
          <NumInput label="Genişlik" value={cab.width} onChange={(v) => onMove({ ...rect, w: v })} min={50} max={3000} />
          <NumInput label="Yükseklik" value={cab.height} onChange={(v) => onMove({ ...rect, h: v })} min={100} max={2800} />
          <NumInput label="Derinlik" value={cab.depth} onChange={(v) => updateCabinet(cab.id, { depth: v })} min={100} max={1200} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumInput label="Soldan" value={rect.x} onChange={(v) => onMove({ ...rect, x: v })} max={20000} />
          {kitchenYLocked(cab)
            ? <p className="text-[11px] text-[var(--color-text-dim)] self-end pb-1.5">Yerden {rect.y} mm (ayak / zemin)</p>
            : <NumInput label="Yerden" value={rect.y} onChange={(v) => onMove({ ...rect, y: v })} max={3000} />}
        </div>
      </Section>

      <Section title="Dikmeler ve tablalar">
        <BehindDoorControl cabinet={cab} onChange={(patch) => updateCabinet(cab.id, patch)} />
        <JointControls cabinet={cab} onChange={(patch) => updateCabinet(cab.id, patch)} />
      </Section>

      <Button size="sm" variant="ghost" className="mt-3" onClick={() => setActivePage('editor')}><Pencil size={13} /> Dolap editöründe ayrıntılar (çekmece, evye…)</Button>
    </div>
  );
}

/**
 * Mutfak duvarının önden görünüşü. Duvar dolabı ve bağımsız ünitedeki çizim alanının aynısı:
 * dolaplar ve engeller sürüklenerek taşınır, kenarlarından boyutlandırılır; raf ve bölmeler
 * çizimde sürüklenir; boş alana çizilen kutu yeni dolap olur.
 */
export default function WallLayoutView({ wall }: { wall: Wall }) {
  const allCabinets = useProjectStore((s) => s.project?.cabinets);
  const activeCabinetId = useProjectStore((s) => s.activeCabinetId);
  const setActiveCabinet = useProjectStore((s) => s.setActiveCabinet);
  const updateCabinet = useProjectStore((s) => s.updateCabinet);
  const removeCabinet = useProjectStore((s) => s.removeCabinet);
  const moveKitchenCabinet = useProjectStore((s) => s.moveKitchenCabinet);
  const addKitchenCabinetAt = useProjectStore((s) => s.addKitchenCabinetAt);
  const updateObstacle = useProjectStore((s) => s.updateObstacle);
  const removeObstacle = useProjectStore((s) => s.removeObstacle);
  const notify = useUIStore((s) => s.notify);
  const confirm = useUIStore((s) => s.confirm);
  const computation = useProjectComputation();
  const [cellSel, setCellSel] = useState<{ boxId: string; ref: CellRef } | null>(null);

  const cabinets = useMemo(() => (allCabinets ?? []).filter((c) => c.wallId === wall.id && !c.groupId), [allCabinets, wall.id]);
  const placements = useMemo(() => placeWallCabinets(cabinets), [cabinets]);
  const fit = useMemo(() => checkWallFit(placements, wall.effectiveWidth), [placements, wall.effectiveWidth]);
  const wallH = wallHeightOf(wall);
  const { boxes, ghosts } = useMemo(() => kitchenCanvas(cabinets, wallH), [cabinets, wallH]);
  const computedById = useMemo(
    () => new Map<string, ComputedCabinet>(computation?.cabinets.map((c) => [c.cabinet.id, c.computed]) ?? []),
    [computation],
  );
  // Su girişi, en yakın evye çanağının ekseninden ne kadar uzakta
  const waterGap = useMemo(() => {
    const water = wall.obstacles.find((o) => o.type === 'water_inlet') ?? wall.obstacles.find((o) => o.type === 'drain');
    if (!water) return null;
    const centers = placements.flatMap((p) => {
      const sink = computedById.get(p.cabinetId)?.sink;
      return sink ? [p.x + sink.bowls[0].x + sink.bowls[0].w / 2] : [];
    });
    if (centers.length === 0) return null;
    const w = water.x + water.width / 2;
    return Math.round(Math.min(...centers.map((c) => Math.abs(c - w))));
  }, [wall.obstacles, computedById, placements]);

  const selectedBox = boxes.find((b) => b.id === activeCabinetId) ?? null;
  const selectedCab = selectedBox ? cabinets.find((c) => c.id === selectedBox.id) ?? null : null;
  const selectedCell = selectedBox && cellSel?.boxId === selectedBox.id ? cellSel.ref : null;

  const rects = [...boxes.map((b) => ({ id: b.id, r: { x: b.x ?? 0, y: b.elevation ?? 0, w: b.width, h: b.height } })), ...ghosts.map((g) => ({ id: g.cabinetId, r: g }))];
  const overlapsOthers = (id: string | null, r: CanvasRect) => rects.some((o) => o.id !== id && boxesOverlap(r, o.r));
  const move = (id: string, r: CanvasRect) => {
    if (overlapsOthers(id, r)) { notify('error', 'Dolaplar üst üste binemez; eski yerine döndü.'); return; }
    moveKitchenCabinet(id, r);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div data-tour="wall-view" className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[var(--color-bg)]">
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
          <span className="ml-auto text-[var(--color-text-dim)]">Dolabı ya da engeli sürükleyin · kenarından boyutlandırın · boş alana çizin</span>
        </div>
        <div className="flex-1 p-3 overflow-hidden relative">
          {cabinets.length === 0 && (
            <div className="absolute z-10 top-6 left-1/2 -translate-x-1/2 text-center text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-card)]/90 border border-[var(--color-border)] rounded-lg px-4 py-3 shadow-sm pointer-events-none">
              Bu duvarda dolap yok. Soldaki <b>Otomatik yerleşim</b> panelinden öneriyi uygulayın ya da duvarın önüne sürükleyerek dolap çizin.
            </div>
          )}
          <ComposerCanvas
            wall={wall}
            allObstacles
            boxes={boxes}
            ghosts={ghosts.map((g, i) => ({ ...g, key: `${g.cabinetId}-${i}`, label: g.code }))}
            computedById={computedById}
            selectedId={selectedBox?.id ?? null}
            onSelect={(id) => setActiveCabinet(id)}
            selectedCell={selectedCell}
            onSelectCell={(id, ref) => setCellSel(ref ? { boxId: id, ref } : null)}
            onInteriorCommit={(id, interior) => updateCabinet(id, { interior })}
            lockY={kitchenYLocked}
            decorate={(b, r, SY, fs) => (
              <g pointerEvents="none">
                {b.row !== 'wall' && ON_LEGS.has(b.type) && r.y > 0 && (
                  <rect x={r.x + 10} y={SY(r.y)} width={Math.max(0, r.w - 20)} height={r.y} fill="#a1a1aa" opacity={0.3} />
                )}
                {b.row !== 'wall' && WITH_COUNTERTOP.has(b.type) && (
                  <rect x={r.x} y={SY(r.y + r.h + COUNTERTOP)} width={r.w} height={COUNTERTOP} fill="#a8a29e" opacity={0.7} stroke="#78716c" strokeWidth={fs * 0.03} />
                )}
              </g>
            )}
            onDraw={(r) => {
              if (overlapsOthers(null, r)) { notify('error', 'Dolaplar üst üste binemez.'); return; }
              addKitchenCabinetAt(wall.id, r);
            }}
            onCommit={move}
            onDelete={async (id) => {
              const c = cabinets.find((x) => x.id === id);
              if (c && await confirm({ title: 'Dolap silinsin mi?', message: `${c.code} duvardan kaldırılacak.`, confirmLabel: 'Sil', danger: true })) removeCabinet(id);
            }}
            onNudge={(id, dx, dy) => {
              const b = boxes.find((x) => x.id === id);
              if (!b) return;
              const r = { x: Math.max(0, (b.x ?? 0) + dx), y: kitchenYLocked(b) ? b.elevation ?? 0 : Math.max(0, (b.elevation ?? 0) + dy), w: b.width, h: b.height };
              if (!overlapsOthers(id, r)) moveKitchenCabinet(id, r);
            }}
            onObstacleCommit={(id, r) => updateObstacle(wall.id, id, r)}
            onObstacleDelete={async (id) => {
              if (await confirm({ title: 'Engel silinsin mi?', message: 'Engel duvardan kaldırılacak.', confirmLabel: 'Sil', danger: true })) removeObstacle(wall.id, id);
            }}
          />
        </div>
      </div>

      <aside data-tour="wall-box-panel" className="w-80 shrink-0 h-full overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        {selectedCab && selectedBox ? (
          <KitchenBoxPanel cab={selectedCab} box={selectedBox} onMove={(r) => move(selectedCab.id, r)}
            selectedCell={selectedCell} onSelectCell={(ref) => setCellSel(ref ? { boxId: selectedCab.id, ref } : null)} />
        ) : (
          <div className="flex flex-col items-center text-center gap-2 pt-10 text-sm text-[var(--color-text-muted)]">
            <MousePointerClick size={28} className="text-[var(--color-text-dim)]" />
            <p>Bir dolaba tıklayın: rafları, kapakları ve bölmeleri burada ya da çizimde sürükleyerek ayarlayın.</p>
            <p className="text-xs text-[var(--color-text-dim)]">Engele tıklayıp sürükleyin; kenarlarındaki tutamaçlarla boyutlandırın. Delete: sil · Oklar: 10 mm kaydır (Shift: 50 mm).</p>
          </div>
        )}
      </aside>
    </div>
  );
}
