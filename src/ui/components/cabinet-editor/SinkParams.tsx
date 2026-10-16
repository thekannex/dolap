import { useMemo } from 'react';
import { ArrowLeftRight, Crosshair } from 'lucide-react';
import { useProjectStore } from '../../../stores/project-store';
import type { ProjectCabinet, SinkSpec } from '../../../core/models/cabinet';
import {
  SINK_PRESETS, createSinkFromPreset, computeSinkLayout, autoSinkOffset, sinkDirectionLabel, checkSinkDirection,
} from '../../../core/engine/sink';
import { findSinkNeighbors } from '../../../core/layout/sink-neighbors';
import { placeWallCabinets } from '../../../core/layout/wall-elevation';
import { COUNTERTOP_OVERHANG } from '../../../core/layout/scene-layout';
import { formatNumber } from '../../../core/utils/format';
import { Button, NumInput, Section, SelectInput, Toggle } from '../shared/ui';

const MOUNT_OPTS = [
  { value: 'inset', label: 'Ankastre (tezgâhın üstüne oturur)' },
  { value: 'undermount', label: 'Tezgâh altı' },
] as const;

const FAUCET_OPTS = [
  { value: 'sink', label: 'Evyenin üstünde (evyede delik var)' },
  { value: 'countertop', label: 'Tezgâhta (evyenin arkasında)' },
  { value: 'none', label: 'Yok / duvardan' },
] as const;

const DIRECTION_OPTS: ReadonlyArray<{ value: SinkSpec['drainer']; label: string }> = [
  { value: 'right', label: sinkDirectionLabel('right') },
  { value: 'left', label: sinkDirectionLabel('left') },
  { value: 'none', label: sinkDirectionLabel('none') },
];

export default function SinkParams({ cabinet }: { cabinet: ProjectCabinet }) {
  const updateCabinet = useProjectStore((s) => s.updateCabinet);
  const project = useProjectStore((s) => s.project);
  const sink = cabinet.sink;

  const wall = useMemo(
    () => project?.spaces.flatMap((s) => s.walls).find((w) => w.id === cabinet.wallId),
    [project, cabinet.wallId],
  );
  const wallCabinets = useMemo(() => project?.cabinets.filter((c) => c.wallId === cabinet.wallId) ?? [], [project, cabinet.wallId]);

  const layout = useMemo(
    () => (sink ? computeSinkLayout(sink, cabinet, cabinet.depth + COUNTERTOP_OVERHANG) : null),
    [sink, cabinet],
  );
  const neighbors = useMemo(
    () => (wall ? findSinkNeighbors(cabinet.id, wallCabinets, wall) : null),
    [wall, wallCabinets, cabinet.id],
  );
  const dirWarning = sink && layout && neighbors ? checkSinkDirection(sink, layout, neighbors, cabinet.code) : null;

  const setSink = (updates: Partial<SinkSpec>, keepPreset = false) => {
    if (!sink) return;
    updateCabinet(cabinet.id, { sink: { ...sink, ...updates, ...(keepPreset ? {} : { presetId: 'custom' }) } });
  };

  const waterPoint = wall?.obstacles.find((o) => o.type === 'water_inlet') ?? wall?.obstacles.find((o) => o.type === 'drain');

  // Çanak eksenini su girişinin ortasına getirecek dolap konumu
  const alignToWater = () => {
    if (!waterPoint || !layout) return;
    const bowl = layout.bowls[0];
    const target = waterPoint.x + waterPoint.width / 2 - (bowl.x + bowl.w / 2);
    updateCabinet(cabinet.id, { x: Math.max(0, Math.round(target / 5) * 5) });
  };

  const currentX = wall ? placeWallCabinets(wallCabinets).find((p) => p.cabinetId === cabinet.id && p.copy === 0)?.x : undefined;
  const bowlCenterOnWall = layout && currentX !== undefined ? currentX + layout.bowls[0].x + layout.bowls[0].w / 2 : null;
  const waterCenter = waterPoint ? waterPoint.x + waterPoint.width / 2 : null;
  const waterOffset = bowlCenterOnWall !== null && waterCenter !== null ? Math.round(bowlCenterOnWall - waterCenter) : null;

  return (
    <Section title="Evye ve batarya" defaultOpen={Boolean(sink)}>
      <Toggle label="Bu dolapta evye var" checked={Boolean(sink)}
        onChange={(v) => updateCabinet(cabinet.id, { sink: v ? createSinkFromPreset(cabinet.width >= 800 ? 'inset-86x50' : 'inset-50x50') : null, backPanelCutout: v })} />

      {sink && layout && (
        <>
          <SelectInput label="Evye modeli" value={sink.presetId}
            onChange={(id) => {
              if (id === 'custom') { setSink({}); return; }
              const fresh = createSinkFromPreset(id);
              // Yön, konum ve ön pay kullanıcının seçimi olarak korunur
              updateCabinet(cabinet.id, { sink: { ...fresh, drainer: fresh.drainer === 'none' ? 'none' : (sink.drainer === 'none' ? fresh.drainer : sink.drainer), offsetX: sink.offsetX, frontGap: sink.frontGap } });
            }}
            options={[...SINK_PRESETS.map((p) => ({ value: p.id, label: p.name })), { value: 'custom', label: 'Elimdeki evye (ölçüleri gir)' }]} />

          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--color-text-muted)]">Evye yönü</span>
            <div className="grid grid-cols-1 gap-1">
              {DIRECTION_OPTS.map((o) => (
                <button key={o.value} aria-pressed={sink.drainer === o.value} onClick={() => setSink({ drainer: o.value }, true)}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium border text-left transition-colors ${
                    sink.drainer === o.value
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                      : 'bg-[var(--color-bg-input)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
                  }`}>{o.label}</button>
              ))}
            </div>
          </div>

          {dirWarning && (
            <div className="rounded-md border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-2 text-xs flex flex-col gap-1.5">
              <span className="text-[var(--color-error)]">{dirWarning.message}</span>
              <span className="text-[var(--color-text-muted)]">{dirWarning.suggestion}</span>
              {sink.drainer !== 'none' && (
                <Button size="sm" className="self-start" onClick={() => setSink({ drainer: sink.drainer === 'right' ? 'left' : 'right' }, true)}>
                  <ArrowLeftRight size={13} /> Yönü çevir
                </Button>
              )}
            </div>
          )}

          <SelectInput label="Montaj" value={sink.mount} onChange={(v) => setSink({ mount: v, faucet: v === 'undermount' ? 'countertop' : sink.faucet })} options={MOUNT_OPTS} />

          <div className="grid grid-cols-2 gap-2">
            <NumInput label="Dış genişlik" value={sink.outerWidth} onChange={(v) => setSink({ outerWidth: v })} min={200} max={2000} />
            <NumInput label="Dış derinlik" value={sink.outerDepth} onChange={(v) => setSink({ outerDepth: v })} min={200} max={800} />
            <NumInput label="Kesim genişliği" value={sink.cutoutWidth} onChange={(v) => setSink({ cutoutWidth: v })} min={150} max={2000} />
            <NumInput label="Kesim derinliği" value={sink.cutoutDepth} onChange={(v) => setSink({ cutoutDepth: v })} min={150} max={800} />
            <NumInput label="Çanak genişliği (toplam)" value={sink.bowlWidth} onChange={(v) => setSink({ bowlWidth: v })} min={150} max={2000} />
            <SelectInput label="Göz sayısı" value={String(sink.bowlCount) as '1' | '2'} onChange={(v) => setSink({ bowlCount: v === '2' ? 2 : 1 })}
              options={[{ value: '1', label: 'Tek göz' }, { value: '2', label: '1,5 / çift göz' }]} />
          </div>
          <span className="text-[11px] text-[var(--color-text-dim)]">Kesim ölçüsünü evyenin kutusundaki şablondan alın.</span>

          <Toggle label="Çanak dolabın ortasında (otomatik konum)" checked={sink.offsetX === null}
            onChange={(v) => setSink({ offsetX: v ? null : autoSinkOffset(sink, cabinet.width) }, true)} />
          <div className="grid grid-cols-2 gap-2">
            {sink.offsetX !== null && (
              <NumInput label="Evye sol kenarı (dolap solundan)" value={sink.offsetX} onChange={(v) => setSink({ offsetX: v }, true)} min={-2000} max={2000} />
            )}
            <NumInput label="Ön pay (tezgâh önünden)" value={sink.frontGap} onChange={(v) => setSink({ frontGap: v }, true)} max={300} />
          </div>

          <SelectInput label="Batarya yeri" value={sink.faucet} onChange={(v) => setSink({ faucet: v }, true)} options={FAUCET_OPTS} />
          {sink.faucet === 'countertop' && (
            <NumInput label="Batarya, evye arka kenarından" value={sink.faucetBackGap} onChange={(v) => setSink({ faucetBackGap: v }, true)} min={20} max={200} />
          )}

          {waterPoint && (
            <div className="rounded-md bg-[var(--color-bg)] p-2 text-xs flex flex-col gap-1.5">
              <span>
                {waterOffset === null ? 'Duvarda su girişi tanımlı.'
                  : Math.abs(waterOffset) <= 50 ? `Çanak su girişinin hizasında (${formatNumber(waterOffset)}mm fark).`
                    : `Çanak ekseni su girişinden ${formatNumber(Math.abs(waterOffset))}mm ${waterOffset > 0 ? 'sağda' : 'solda'}.`}
              </span>
              <Button size="sm" className="self-start" onClick={alignToWater}><Crosshair size={13} /> Dolabı su girişine hizala</Button>
            </div>
          )}

          <dl className="rounded-md border border-[var(--color-border)] p-2 text-xs grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-[var(--color-text-muted)]">Tezgâh kesimi</dt>
            <dd className="font-mono">{layout.cutout.w} × {layout.cutout.h}</dd>
            <dt className="text-[var(--color-text-muted)]">Kesim yeri</dt>
            <dd className="font-mono">soldan {formatNumber(layout.cutout.x)} · önden {formatNumber(layout.cutout.y)}</dd>
            {layout.faucet && (
              <>
                <dt className="text-[var(--color-text-muted)]">Batarya Ø{layout.faucet.diameter}</dt>
                <dd className="font-mono">soldan {formatNumber(layout.faucet.x)} · önden {formatNumber(layout.faucet.y)}{layout.faucet.onSink ? ' (evyede)' : ''}</dd>
              </>
            )}
            <dt className="text-[var(--color-text-muted)]">En dar dolap</dt>
            <dd className="font-mono">{layout.minCabinetWidth} mm</dd>
          </dl>
        </>
      )}
    </Section>
  );
}
