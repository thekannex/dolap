import { useProjectStore } from '../../../stores/project-store';
import { useUIStore } from '../../../stores/ui-store';
import type { CabinetState, CabinetType, ProjectCabinet } from '../../../core/models/cabinet';
import { CABINET_TYPE_LABELS, FURNITURE_TYPES, KITCHEN_TYPES } from '../../../core/engine/cabinet-factory';
import { CABINET_TYPE_ICONS } from '../shared/cabinet-icons';
import { Button, NumInput, SelectInput, Section, TextInput, Toggle } from '../shared/ui';
import SinkParams from './SinkParams';
import JointControls from '../shared/JointControls';
import BehindDoorControl from '../shared/BehindDoorControl';
import InteriorEditor from '../interior/InteriorEditor';
import type { CellRef } from '../interior/InteriorSvg';
import { interiorFromCabinet } from '../../../core/engine/interior';

const TYPE_GROUPS: Array<{ title: string; types: CabinetType[] }> = [
  { title: 'Mutfak', types: KITCHEN_TYPES },
  { title: 'Bağımsız mobilya', types: FURNITURE_TYPES },
];

const BACK_OPTS = [
  { value: 'routed', label: 'Kanallı' },
  { value: 'nailed', label: 'Çakma' },
] as const;

const OVERLAY_OPTS = [
  { value: 'full', label: 'Tam bindirme' },
  { value: 'half', label: 'Yarım bindirme' },
  { value: 'inset', label: 'Gömme' },
] as const;

const RAIL_OPTS = [
  { value: 'side_mount', label: 'Bilyalı ray (yandan)' },
  { value: 'undermount', label: 'Gizli ray (alttan)' },
  { value: 'metal_box', label: 'Metal kutu sistemi' },
] as const;

const RAIL_DEDUCTION: Record<CabinetState['railType'], number> = { side_mount: 25.4, undermount: 10, metal_box: 0 };

export default function CabinetParams({ cabinet, selectedCell, onSelectCell }: {
  cabinet: ProjectCabinet; selectedCell?: CellRef | null; onSelectCell?: (ref: CellRef | null) => void;
}) {
  const updateCabinet = useProjectStore((s) => s.updateCabinet);
  const changeCabinetType = useProjectStore((s) => s.changeCabinetType);
  const spaces = useProjectStore((s) => s.project?.spaces ?? []);
  const compositionName = useProjectStore((s) => s.project?.compositions.find((c) => c.id === cabinet.groupId)?.name);
  const setActiveComposition = useProjectStore((s) => s.setActiveComposition);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const set = (updates: Partial<ProjectCabinet>) => updateCabinet(cabinet.id, updates);

  const isFiller = cabinet.type === 'filler';
  const hasDrawers = cabinet.drawerCount > 0;
  const showDoors = !isFiller && !cabinet.isOpenShelf && !hasDrawers;
  const liftUp = cabinet.doorOpening === 'up';
  const canHaveDrawers = hasDrawers || (['base', 'drawer_base', 'dresser', 'tv_unit', 'custom', 'shoe_cabinet'] as CabinetType[]).includes(cabinet.type);
  const isWallHung = cabinet.type === 'wall' || cabinet.type === 'open_shelf';
  const isBaseType = cabinet.type === 'base' || cabinet.type === 'drawer_base' || cabinet.type === 'sink';

  const wallOptions = [
    { value: '', label: 'Duvara atanmadı' },
    ...spaces.flatMap((s) => s.walls.map((w) => ({ value: w.id, label: `${s.name} · ${w.name}` }))),
  ];

  return (
    <aside className="w-80 shrink-0 h-full overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 flex flex-col">
      <Section title="Kimlik">
        <div className="grid grid-cols-[80px_1fr] gap-2">
          <TextInput label="Kod" value={cabinet.code} onChange={(v) => set({ code: v.toUpperCase() })} />
          <TextInput label="Ad" value={cabinet.name} onChange={(v) => set({ name: v })} />
        </div>
        {cabinet.groupId ? (
          <div className="rounded-md bg-[var(--color-bg)] p-2 text-xs flex items-center justify-between gap-2">
            <span>
              Kompozisyon: <b>{compositionName ?? '—'}</b>
              <span className="block text-[var(--color-text-dim)]">soldan {cabinet.x ?? 0} · yerden {cabinet.elevation ?? 0} mm</span>
            </span>
            <button className="text-[var(--color-accent)] shrink-0" onClick={() => { setActiveComposition(cabinet.groupId); setActivePage('composer'); }}>Çizimde aç</button>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <SelectInput label="Duvar" value={cabinet.wallId ?? ''} onChange={(v) => set({ wallId: v || null })} options={wallOptions} />
            <NumInput label="Adet" value={cabinet.quantity} onChange={(v) => set({ quantity: Math.round(v) })} min={1} max={50} suffix="" />
          </div>
        )}
        {cabinet.wallId && !cabinet.groupId && (
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <NumInput label="Duvarda soldan konum (boş: otomatik)" value={cabinet.x ?? 0} onChange={(v) => set({ x: v })} max={20000} />
            {cabinet.x !== null && (
              <button className="text-xs text-[var(--color-accent)] pb-2" onClick={() => set({ x: null })}>Otomatik</button>
            )}
          </div>
        )}
      </Section>

      <Section title="Dolap tipi">
        {TYPE_GROUPS.map((g) => (
        <div key={g.title} className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">{g.title}</span>
        <div className="grid grid-cols-3 gap-1.5">
          {g.types.map((value) => {
            const Icon = CABINET_TYPE_ICONS[value];
            const active = cabinet.type === value;
            return (
              <button key={value} onClick={() => !active && changeCabinetType(cabinet.id, value)} aria-pressed={active}
                className={`flex flex-col items-center gap-1 p-2 rounded-md text-[11px] leading-tight text-center transition-colors border ${
                  active
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-dim)]'
                }`}>
                <Icon size={17} />
                {CABINET_TYPE_LABELS[value]}
              </button>
            );
          })}
        </div>
        </div>
        ))}
        <p className="text-[11px] text-[var(--color-text-dim)]">Tip değişince yükseklik, derinlik ve iç düzen o tipin standardına döner.</p>
      </Section>

      <Section title="Dış ölçüler">
        <div className="grid grid-cols-3 gap-2">
          <NumInput label="Genişlik" value={cabinet.width} onChange={(v) => set({ width: v })} min={isFiller ? 10 : 100} max={3000} />
          <NumInput label="Yükseklik" value={cabinet.height} onChange={(v) => set({ height: v })} min={100} max={2800} />
          <NumInput label="Derinlik" value={cabinet.depth} onChange={(v) => set({ depth: v })} min={100} max={1200} />
        </div>
      </Section>

      {!isFiller && (
        <Section title="Gövde yapısı" defaultOpen={false}>
          <NumInput label="Gövde kalınlığı" value={cabinet.bodyThickness} onChange={(v) => set({ bodyThickness: v })} min={8} max={40} />
          <JointControls cabinet={cabinet} onChange={set} />
          <BehindDoorControl cabinet={cabinet} onChange={set} />
          <Toggle label="Arkalık var" checked={cabinet.hasBackPanel} onChange={(v) => set({ hasBackPanel: v })} />
          {cabinet.hasBackPanel && (
            <>
              <SelectInput label="Arkalık tipi" value={cabinet.backType} onChange={(v) => set({ backType: v })} options={BACK_OPTS} />
              <NumInput label="Arkalık kalınlığı" value={cabinet.backThickness} onChange={(v) => set({ backThickness: v })} min={3} max={18} />
              {cabinet.backType === 'routed' && (
                <div className="grid grid-cols-2 gap-2">
                  <NumInput label="Kanal uzaklığı (g)" value={cabinet.backChannelInset} onChange={(v) => set({ backChannelInset: v })} max={50} />
                  <NumInput label="Kanal derinliği (k)" value={cabinet.backChannelDepth} onChange={(v) => set({ backChannelDepth: v })} min={1} max={15} />
                </div>
              )}
            </>
          )}
          {isBaseType && (
            <NumInput label="Kuşak eni (0 = üst tabla)" value={cabinet.railWidth} onChange={(v) => set({ railWidth: v })} max={300} />
          )}
        </Section>
      )}

      {!isFiller && (
        <Section title="Baza ve askı" defaultOpen={cabinet.plinthHeight > 0 || cabinet.hangerRodCount > 0}>
          {!isWallHung && (
            <NumInput label="Baza yüksekliği (0 = baza yok, ayaklı)" value={cabinet.plinthHeight}
              onChange={(v) => set({ plinthHeight: v, ...(v > 0 ? { legHeight: 0 } : {}) })} max={200} />
          )}
          {!isWallHung && (
            <NumInput label="Ayak yüksekliği (0 = ayaksız)" value={cabinet.legHeight} onChange={(v) => set({ legHeight: v, ...(v > 0 ? { plinthHeight: 0 } : {}) })} max={400} />
          )}
          {!cabinet.interior && (
            <NumInput label="Askı borusu" value={cabinet.hangerRodCount} onChange={(v) => set({ hangerRodCount: Math.round(v) })} max={3} suffix="adet" />
          )}
          <span className="text-[11px] text-[var(--color-text-dim)]">
            Baza, tabanı yükseltir; kapak ve çekmeceler bazanın üstünden başlar. Bazasız yere basan dolaplara ayak eklenir.
          </span>
        </Section>
      )}

      {(cabinet.type === 'sink' || cabinet.type === 'base' || cabinet.sink) && <SinkParams cabinet={cabinet} />}

      {isFiller && (
        <Section title="Dolgu">
          <NumInput label="Kalınlık" value={cabinet.bodyThickness} onChange={(v) => set({ bodyThickness: v })} min={8} max={40} />
        </Section>
      )}

      {!isFiller && (
        <Section title="Bölmeler ve gözler" defaultOpen={Boolean(cabinet.interior)}>
          {cabinet.interior ? (
            <InteriorEditor cabinet={cabinet} selected={selectedCell ?? null} onSelect={(r) => onSelectCell?.(r)} />
          ) : (
            <>
              <p className="text-[11px] text-[var(--color-text-dim)]">Dolabı dikey bölmelere ve yatay gözlere ayırıp her göze ayrı kapak, çekmece ya da açık raf verebilirsiniz.</p>
              <Button size="sm" onClick={() => set({ interior: interiorFromCabinet(cabinet) })}>Bölmelere ayır</Button>
            </>
          )}
        </Section>
      )}

      {showDoors && !cabinet.interior && (
        <Section title="Kapak">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--color-text-muted)]">Açılış yönü</span>
            <div className="grid grid-cols-2 gap-1">
              {([['side', 'Yana açılır'], ['up', 'Yukarı açılır']] as const).map(([val, lbl]) => (
                <button key={val} aria-pressed={cabinet.doorOpening === val}
                  onClick={() => set({ doorOpening: val, doorAutoGenerated: true })}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    cabinet.doorOpening === val
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                      : 'bg-[var(--color-bg-input)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
                  }`}>{lbl}</button>
              ))}
            </div>
            {liftUp && (
              <span className="text-[11px] text-[var(--color-text-dim)]">
                600 mm'ye kadar tek parça kalkar kapak (pistonlu), daha yüksekte iki parçalı katlanır kapak.
              </span>
            )}
          </div>
          <SelectInput label="Kapak tipi" value={cabinet.doorOverlayType} onChange={(v) => set({ doorOverlayType: v })} options={OVERLAY_OPTS} />
          <Toggle label="Kapak sayısını otomatik belirle" checked={cabinet.doorAutoGenerated}
            onChange={(v) => set({ doorAutoGenerated: v, doorCount: Math.max(1, Math.min(liftUp ? 2 : 4, cabinet.doorCount)) })} />
          <div className="grid grid-cols-2 gap-2">
            {!cabinet.doorAutoGenerated && (
              <NumInput label={liftUp ? 'Parça sayısı (1 / 2)' : 'Kapak sayısı'} value={cabinet.doorCount}
                onChange={(v) => set({ doorCount: Math.round(v) })} min={liftUp ? 1 : 0} max={liftUp ? 2 : 4} suffix="adet" />
            )}
            <NumInput label="Derz payı (d)" value={cabinet.doorGap} onChange={(v) => set({ doorGap: v })} min={0} max={10} step={0.5} />
            {cabinet.doorOverlayType === 'half' && (
              <NumInput label="Bindirme (a)" value={cabinet.halfOverlayAmount} onChange={(v) => set({ halfOverlayAmount: v })} max={cabinet.bodyThickness} />
            )}
          </div>
          {!liftUp && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--color-text-muted)]">Menteşe yönü</span>
            <div className="grid grid-cols-3 gap-1">
              {([['left', 'Sol'], ['right', 'Sağ'], ['both', 'Çift']] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => set({ doorHingeSide: val })} aria-pressed={cabinet.doorHingeSide === val}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    cabinet.doorHingeSide === val
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                      : 'bg-[var(--color-bg-input)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
                  }`}>{lbl}</button>
              ))}
            </div>
          </div>
          )}
        </Section>
      )}

      {!isFiller && !cabinet.interior && (
        <Section title="Raf">
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="Hareketli raf" value={cabinet.shelfCount} onChange={(v) => set({ shelfCount: Math.round(v) })} max={12} suffix="adet" />
            <NumInput label="Sabit raf" value={cabinet.fixedShelfCount} onChange={(v) => set({ fixedShelfCount: Math.round(v) })} max={6} suffix="adet" />
          </div>
          {cabinet.shelfCount > 0 && (
            <NumInput label="Raf geri çekme payı" value={cabinet.frontPullback} onChange={(v) => set({ frontPullback: v })} max={100} />
          )}
        </Section>
      )}

      {canHaveDrawers && !cabinet.interior && (
        <Section title="Çekmece" defaultOpen={hasDrawers}>
          <NumInput label="Çekmece sayısı (0 = kapaklı)" value={cabinet.drawerCount}
            onChange={(v) => { const n = Math.round(v); set({ drawerCount: n, drawerRatios: Array(n).fill(1) }); }} max={6} suffix="adet" />
          {hasDrawers && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">Klapa oranları (üstten alta, virgülle)</span>
                <input type="text" defaultValue={cabinet.drawerRatios.join(', ')} key={cabinet.drawerRatios.join(',')}
                  onBlur={(e) => {
                    const ratios = e.target.value.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n) && n > 0);
                    if (ratios.length === cabinet.drawerCount) set({ drawerRatios: ratios });
                    else e.target.value = cabinet.drawerRatios.join(', ');
                  }}
                  placeholder="1, 1, 2"
                  className="bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-md px-2 py-1.5 text-sm font-mono focus:border-[var(--color-border-focus)] focus:outline-none" />
                <span className="text-[11px] text-[var(--color-text-dim)]">Örn. "1, 1, 2": en alttaki klapa diğerlerinin iki katı.</span>
              </label>
              <SelectInput label="Ray tipi" value={cabinet.railType}
                onChange={(v) => set({ railType: v, railWidthDeduction: RAIL_DEDUCTION[v] })} options={RAIL_OPTS} />
              {cabinet.railType !== 'metal_box' && (
                <NumInput label="Ray düşümü (iki yan toplam)" value={cabinet.railWidthDeduction} onChange={(v) => set({ railWidthDeduction: v })} max={60} step={0.5} />
              )}
            </>
          )}
        </Section>
      )}

      <Section title="Not" defaultOpen={Boolean(cabinet.notes)}>
        <TextInput label="Dolaba özel not" value={cabinet.notes} onChange={(v) => set({ notes: v })} multiline />
      </Section>
    </aside>
  );
}
