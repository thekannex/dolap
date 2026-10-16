import { useMemo, useState } from 'react';
import { useInteriorFrame } from './use-interior-frame';
import { Columns2, Rows2, Trash2, X, AlignHorizontalSpaceAround, AlignVerticalSpaceAround, GripVertical } from 'lucide-react';
import { useProjectStore } from '../../../stores/project-store';
import type { CabinetInterior, CellContent, ProjectCabinet } from '../../../core/models/cabinet';
import {
  resolveInterior, splitColumn, removeColumn, splitCell, removeCell, setColumnWidth, setCellHeight,
  updateCell, setShelfCount, cellLabel, distributeShelves, equalizeColumns, equalizeCells,
  moveColumn, nestColumn, ungroupColumns, equalizeGroup, setGroupWidth,
} from '../../../core/engine/interior';
import type { InteriorFrame } from '../../../core/engine/interior';
import { formatNumber } from '../../../core/utils/format';
import { Button, NumInput, Toggle } from '../shared/ui';
import type { CellRef } from './InteriorSvg';

const CONTENTS: Array<{ value: CellContent; label: string }> = [
  { value: 'door', label: 'Kapak' },
  { value: 'drawer', label: 'Çekmece' },
  { value: 'open', label: 'Açık' },
];

function Seg<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-md border border-[var(--color-border)] overflow-hidden">
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`flex-1 px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
            value === o.value ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-input)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
          }`}>{o.label}</button>
      ))}
    </div>
  );
}

export default function InteriorEditor({ cabinet, selected, onSelect }: {
  cabinet: ProjectCabinet; selected: CellRef | null; onSelect: (ref: CellRef | null) => void;
}) {
  const updateCabinet = useProjectStore((s) => s.updateCabinet);
  const frame = useInteriorFrame(cabinet);
  const interior = cabinet.interior!;
  const resolved = useMemo(() => resolveInterior(interior, frame), [interior, frame]);
  const apply = (op: (it: CabinetInterior, f: InteriorFrame) => CabinetInterior) =>
    updateCabinet(cabinet.id, { interior: op(interior, frame) });
  const nCols = resolved.columns.length;
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const endDrag = () => { setDragFrom(null); setOver(null); };

  const renderColumn = (col: (typeof resolved.columns)[number], ci: number) => (
        <div key={col.id}
          onDragOver={(e) => { if (dragFrom !== null && dragFrom !== ci) { e.preventDefault(); setOver(`card-${ci}`); } }}
          onDragLeave={() => setOver((o) => (o === `card-${ci}` ? null : o))}
          onDrop={(e) => { e.preventDefault(); if (dragFrom !== null && dragFrom !== ci) apply(nestColumn(dragFrom, ci)); endDrag(); }}
          className={`rounded-lg border overflow-hidden transition-colors ${over === `card-${ci}` ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30' : 'border-[var(--color-border)]'} ${dragFrom === ci ? 'opacity-50' : ''}`}>
          {over === `card-${ci}` && (
            <p className="px-2 py-1 text-[11px] font-medium text-white bg-[var(--color-accent)]">Bırakınca bu bölmeyle grup olur</p>
          )}
          <div className="flex items-end gap-2 px-2 py-2 bg-[var(--color-bg)]">
            <span draggable title="Sürükle: başka bölmenin üstüne bırak = grupla, araya bırak = sırayı değiştir"
              aria-label={`Bölme ${ci + 1} tutamacı`}
              onDragStart={(e) => { setDragFrom(ci); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(ci)); }}
              onDragEnd={endDrag}
              className="self-center cursor-grab active:cursor-grabbing text-[var(--color-text-dim)] hover:text-[var(--color-accent)] -ml-1 p-0.5">
              <GripVertical size={16} />
            </span>
            <div className="flex-1">
              {col.group || ci < nCols - 1 ? (
                <NumInput label={`Bölme ${ci + 1} genişliği`} value={col.width} onChange={(v) => apply(setColumnWidth(ci, v))} min={80} max={3000} />
              ) : (
                <div className="text-xs">
                  <span className="text-[var(--color-text-muted)]">Bölme {ci + 1} genişliği</span>
                  <p className="font-mono py-1.5">{formatNumber(col.width)} mm <span className="text-[var(--color-text-dim)] font-sans">(kalan)</span></p>
                </div>
              )}
            </div>
            {col.cells.length > 1 && (
              <Button size="sm" variant="ghost" title="Bu bölmedeki gözleri eşit yükseklikte yap" aria-label="Gözleri eşitle" onClick={() => apply(equalizeCells(ci))}><AlignVerticalSpaceAround size={14} /></Button>
            )}
            <Button size="sm" variant="ghost" title="Bu bölmeyi dikey ikiye böl" aria-label="Dikey böl" onClick={() => apply(splitColumn(ci))}><Columns2 size={14} /></Button>
            {nCols > 1 && (
              <Button size="sm" variant="danger" title="Bölmeyi kaldır" aria-label="Bölmeyi kaldır" onClick={() => apply(removeColumn(ci))}><Trash2 size={13} /></Button>
            )}
          </div>

          {/* Gözler üstten alta listelenir */}
          {[...col.cells].map((cell, cj) => ({ cell, cj })).reverse().map(({ cell, cj }) => {
            const isSel = selected?.col === ci && selected?.cell === cj;
            const last = cj === col.cells.length - 1;
            return (
              <div key={cell.id} onClick={() => onSelect({ col: ci, cell: cj })}
                className={`px-2 py-2 border-t border-[var(--color-border)] flex flex-col gap-2 cursor-pointer ${isSel ? 'bg-[var(--color-accent)]/5 ring-1 ring-inset ring-[var(--color-accent)]' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold w-7">{cellLabel(ci, cj)}</span>
                  <div className="flex-1"><Seg label="Göz içeriği" value={cell.content} options={CONTENTS}
                    onChange={(v) => apply(updateCell(ci, cj, { content: v, ...(v === 'drawer' ? { shelves: [], rod: false } : {}) }))} /></div>
                  <Button size="sm" variant="ghost" title="Bu gözü yatay ikiye böl" aria-label="Yatay böl" onClick={(e) => { e.stopPropagation(); apply(splitCell(ci, cj)); }}><Rows2 size={14} /></Button>
                  {col.cells.length > 1 && (
                    <Button size="sm" variant="danger" title="Gözü kaldır" aria-label="Gözü kaldır" onClick={(e) => { e.stopPropagation(); onSelect(null); apply(removeCell(ci, cj)); }}><X size={13} /></Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                  {last || col.cells.length === 1 ? (
                    <div className="text-xs">
                      <span className="text-[var(--color-text-muted)]">Yükseklik</span>
                      <p className="font-mono py-1.5">{formatNumber(cell.height)} mm <span className="text-[var(--color-text-dim)] font-sans">(kalan)</span></p>
                    </div>
                  ) : (
                    <NumInput label="Yükseklik" value={cell.height} onChange={(v) => apply(setCellHeight(ci, cj, v))} min={60} max={3000} />
                  )}

                  {cell.content === 'drawer' && (
                    <NumInput label="Çekmece adedi" value={cell.drawerCount} onChange={(v) => apply(updateCell(ci, cj, { drawerCount: Math.max(1, Math.round(v)) }))} min={1} max={6} suffix="" />
                  )}
                  {cell.content !== 'drawer' && (
                    <NumInput label="Raf sayısı" value={cell.shelves.length} onChange={(v) => apply(setShelfCount(ci, cj, v))} max={12} suffix="" />
                  )}
                </div>

                {cell.content === 'door' && (
                  <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Seg label="Açılış" value={cell.opening} options={[{ value: 'side', label: 'Yana açılır' }, { value: 'up', label: 'Yukarı açılır' }] as const}
                      onChange={(v) => apply(updateCell(ci, cj, { opening: v }))} />
                    {cell.opening === 'side' && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <Seg label="Kapak sayısı" value={cell.doorCount} options={[{ value: 1, label: 'Tek' }, { value: 2, label: 'Çift' }] as const}
                          onChange={(v) => apply(updateCell(ci, cj, { doorCount: v }))} />
                        {cell.doorCount === 1 && (
                          <Seg label="Menteşe" value={cell.hinge} options={[{ value: 'left', label: 'Sol' }, { value: 'right', label: 'Sağ' }] as const}
                            onChange={(v) => apply(updateCell(ci, cj, { hinge: v }))} />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {cell.content !== 'drawer' && (
                  <div className="flex items-center gap-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {cell.shelves.length > 0 && (
                      <>
                        <Toggle label="Sabit raf" checked={cell.shelfType === 'fixed'} onChange={(v) => apply(updateCell(ci, cj, { shelfType: v ? 'fixed' : 'adjustable' }))} />
                        <button className="text-[11px] text-[var(--color-accent)]"
                          onClick={() => apply(updateCell(ci, cj, { shelves: distributeShelves(cell.height, cell.shelves.length, frame.t) }))}>Eşit dağıt</button>
                      </>
                    )}
                    <Toggle label="Askı" checked={cell.rod} onChange={(v) => apply(updateCell(ci, cj, { rod: v }))} />
                  </div>
                )}
              </div>
            );
          })}

        </div>
  );

  const gap = (at: number, group: string | null, key: string) => (
    <div key={key}
      onDragOver={(e) => { if (dragFrom !== null) { e.preventDefault(); setOver(key); } }}
      onDragLeave={() => setOver((o) => (o === key ? null : o))}
      onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) apply(moveColumn(dragFrom, at, group)); endDrag(); }}
      className={`transition-all rounded ${dragFrom === null ? 'h-0' : over === key ? 'h-3 bg-[var(--color-accent)]' : 'h-2 bg-[var(--color-border)]/50'}`} />
  );

  // Ardışık grup üyeleri tek bir çerçevede gösterilir
  const segments: Array<{ group: string | null; members: number[] }> = [];
  resolved.columns.forEach((c, i) => {
    const last = segments[segments.length - 1];
    if (c.group && last && last.group === c.group) last.members.push(i);
    else segments.push({ group: c.group ?? null, members: [i] });
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--color-text-muted)]">Kapak ve çekmece önleri</span>
        <Seg label="Ön yüz" value={cabinet.doorOverlayType === 'inset' ? 'inset' : 'full'}
          options={[{ value: 'full', label: 'Dışarıda (bindirme)' }, { value: 'inset', label: 'İçeride (gömme)' }] as const}
          onChange={(v) => updateCabinet(cabinet.id, { doorOverlayType: v })} />
      </div>

      {nCols > 1 && (
        <Button size="sm" onClick={() => apply(equalizeColumns())} title="Ara dikmeleri eşit aralıkla diz">
          <AlignHorizontalSpaceAround size={14} /> Bölmeleri eşitle{segments.some((sg) => sg.group) ? ' (grup tek bölme sayılır)' : ''}
        </Button>
      )}

      {segments.map((seg) => (
        seg.group ? (
          <div key={`seg-${seg.group}`} className="flex flex-col">
            {gap(seg.members[0], null, `gap-out-${seg.members[0]}`)}
            <div className="rounded-xl border-2 border-dashed border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5 p-1.5 flex flex-col gap-1">
              <div className="flex flex-col gap-1.5 px-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-accent)]">Grup · {seg.members.length} bölme</span>
                  <div className="flex gap-2">
                    <button className="text-[11px] text-[var(--color-accent)] hover:underline" title="Grubun içindeki bölmeleri eşit yap (grup genişliği değişmez)"
                      onClick={() => apply(equalizeGroup(seg.group!))}>Grubu eşitle</button>
                    <button className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]" onClick={() => apply(ungroupColumns(seg.group!))}>Grubu çöz</button>
                  </div>
                </div>
                {(() => {
                  const total = seg.members.reduce((s2, i) => s2 + resolved.columns[i].width, 0) + (seg.members.length - 1) * frame.t;
                  const isLastUnit = seg.members[seg.members.length - 1] === nCols - 1;
                  return isLastUnit && segments.length > 1 ? (
                    <p className="text-xs">Grup genişliği <span className="font-mono">{formatNumber(total)} mm</span> <span className="text-[var(--color-text-dim)]">(kalan)</span></p>
                  ) : (
                    <NumInput label="Grup genişliği (iç dikmeler dahil)" value={total} onChange={(v) => apply(setGroupWidth(seg.group!, v))} min={80} max={5000} />
                  );
                })()}
              </div>
              {seg.members.map((ci) => (
                <div key={`m-${ci}`} className="flex flex-col gap-1">
                  {gap(ci, seg.group, `gap-in-${ci}`)}
                  {renderColumn(resolved.columns[ci], ci)}
                </div>
              ))}
              {gap(seg.members[seg.members.length - 1] + 1, seg.group, `gap-in-end-${seg.group}`)}
            </div>
          </div>
        ) : (
          <div key={`seg-${seg.members[0]}`} className="flex flex-col gap-1">
            {gap(seg.members[0], null, `gap-${seg.members[0]}`)}
            {renderColumn(resolved.columns[seg.members[0]], seg.members[0])}
          </div>
        )
      ))}
      {gap(nCols, null, 'gap-end')}

      <p className="text-[11px] text-[var(--color-text-dim)]">
        Bölmeyi tutamacından sürükleyip başka bir bölmenin üstüne bırakın: ikisi bir grup olur ve üstteki "Bölmeleri eşitle" grubu tek bölme sayar. Grubun içi kendi arasında serbestçe ayarlanır. Araya bırakırsanız sırası değişir. Çizimde ara dikme, ara tabla ve rafları sürükleyerek de taşıyabilirsiniz.
      </p>
      <Button size="sm" variant="ghost" className="self-start" onClick={() => { onSelect(null); updateCabinet(cabinet.id, { interior: null }); }}>
        Bölmeleri kaldır (düz dolap)
      </Button>
    </div>
  );
}
