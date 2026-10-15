import { useState } from 'react';
import { FileText, FileSpreadsheet, FileCode2, Receipt, Loader2, Table2, AlertTriangle } from 'lucide-react';
import { useProjectStore } from '../../../stores/project-store';
import { useSettingsStore } from '../../../stores/settings-store';
import { useUIStore } from '../../../stores/ui-store';
import { useProjectComputation } from '../../hooks/use-cabinet-calculations';
import type { ExportContext } from '../../../core/export/pdf-export';
import type { SheetLayout } from '../../../core/optimizer/guillotine';
import { bandLabel, formatMoney, formatNumber, safeFileName } from '../../../core/utils/format';
import { saveBlob, saveText } from '../../lib/files';
import { Button, Card, EmptyState, Stat } from '../shared/ui';
import { WarningItem } from '../cabinet-editor/DetailPanels';

type Tab = 'parts' | 'sheets' | 'hardware' | 'cost';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'parts', label: 'Kesim listesi' },
  { id: 'sheets', label: 'Plaka planı' },
  { id: 'hardware', label: 'Hırdavat ve bant' },
  { id: 'cost', label: 'Maliyet ve teklif' },
];

const th = 'px-3 py-2 font-medium';
const td = 'px-3 py-1.5';

function SheetView({ layout, index, total }: { layout: SheetLayout; index: number; total: number }) {
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="flex justify-between text-xs text-[var(--color-text-muted)]">
        <span className="font-semibold text-[var(--color-text)]">Plaka {index + 1} / {total}</span>
        <span>{layout.placements.length} parça · kullanım %{formatNumber(layout.usagePercent)}</span>
      </figcaption>
      <svg viewBox={`-10 -10 ${layout.sheetWidth + 20} ${layout.sheetHeight + 20}`} className="w-full border border-[var(--color-border)] rounded bg-white">
        <rect width={layout.sheetWidth} height={layout.sheetHeight} fill="#e4e4e7" stroke="#71717a" strokeWidth={4} />
        {layout.placements.map((p, i) => {
          const fs = Math.max(22, Math.min(56, p.width / 4, p.length / 9));
          const showText = p.length > 120 && p.width > 60;
          return (
            <g key={i}>
              <title>{`${p.label}: ${p.length} × ${p.width}${p.rotated ? ' (döndürüldü)' : ''}`}</title>
              <rect x={p.x} y={p.y} width={p.length} height={p.width} fill="#fff7ed" stroke="#ea580c" strokeWidth={3} />
              {showText && (
                <>
                  <text x={p.x + p.length / 2} y={p.y + p.width / 2 - fs * 0.1} textAnchor="middle" fontSize={fs} fontWeight={600} fill="#27272a">{p.label}</text>
                  <text x={p.x + p.length / 2} y={p.y + p.width / 2 + fs * 0.95} textAnchor="middle" fontSize={fs * 0.8} fill="#71717a" fontFamily="var(--font-mono)">
                    {p.length} × {p.width}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export default function CutListPage() {
  const project = useProjectStore((s) => s.project);
  const settings = useSettingsStore((s) => s.settings);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const notify = useUIStore((s) => s.notify);
  const c = useProjectComputation();
  const [tab, setTab] = useState<Tab>('parts');
  const [busy, setBusy] = useState<string | null>(null);

  if (!project || !c) return null;

  if (project.cabinets.length === 0) {
    return (
      <EmptyState icon={<Table2 size={32} />} title="Kesim listesi için dolap gerekli"
        text="Önce duvar yerleşimini uygulayın ya da dolap ekleyin."
        action={<Button variant="primary" onClick={() => setActivePage('editor')}>Dolaplara git</Button>} />
    );
  }

  const ctx: ExportContext = { project, computation: c, settings };
  const base = safeFileName(project.name);
  const pricesMissing = c.costLines.some((l) => l.unitPrice === 0 && l.quantity > 0);

  const run = async (key: string, fn: () => Promise<void> | void) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      notify('error', 'Dosya oluşturulamadı. Ayrıntı için tekrar deneyin.');
    } finally {
      setBusy(null);
    }
  };

  const exportWorkshop = () => run('workshop', async () => {
    const { generateWorkshopPDF } = await import('../../../core/export/pdf-export');
    const doc = await generateWorkshopPDF(ctx);
    saveBlob(doc.output('blob'), `${base}_Atolye_Kesim_Listesi.pdf`);
  });
  const exportQuote = () => run('quote', async () => {
    const { generateQuotePDF } = await import('../../../core/export/pdf-export');
    const doc = await generateQuotePDF(ctx);
    saveBlob(doc.output('blob'), `${base}_Teklif.pdf`);
  });
  const exportExcel = () => run('excel', async () => {
    const { buildWorkbook, workbookToBlob } = await import('../../../core/export/excel-export');
    saveBlob(workbookToBlob(buildWorkbook(ctx)), `${base}_Kesim_Listesi.xlsx`);
  });
  const exportDxf = () => run('dxf', async () => {
    const { generateSheetsDXF } = await import('../../../core/export/dxf-export');
    saveText(generateSheetsDXF(c.groups), `${base}_Plaka_Plani.dxf`, 'application/dxf');
  });

  const spin = (key: string, icon: React.ReactNode) => (busy === key ? <Loader2 size={15} className="animate-spin" /> : icon);
  const errors = c.warnings.filter((w) => w.severity !== 'info');

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Kesim ve Teklif</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={busy !== null} onClick={exportWorkshop}>{spin('workshop', <FileText size={15} />)} Atölye PDF</Button>
            <Button disabled={busy !== null} onClick={exportQuote}>{spin('quote', <Receipt size={15} />)} Teklif PDF</Button>
            <Button disabled={busy !== null} onClick={exportExcel}>{spin('excel', <FileSpreadsheet size={15} />)} Excel</Button>
            <Button disabled={busy !== null} onClick={exportDxf} title="Plaka kesim planı (CNC / ebatlama için)">{spin('dxf', <FileCode2 size={15} />)} DXF</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Dolap" value={c.totals.cabinetCount} />
          <Stat label="Parça" value={c.totals.partCount} />
          <Stat label="Plaka" value={c.totals.sheetCount} />
          <Stat label="Kenar bandı" value={`${formatNumber(c.totals.bandMeters)} m`} />
          <Stat label="Teklif (KDV dahil)" value={formatMoney(c.quote.total)} tone="accent" />
        </div>

        {pricesMissing && (
          <div className="flex items-center justify-between gap-3 text-sm rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 px-4 py-2.5">
            <span className="text-[var(--color-text)]">Bazı birim fiyatlar girilmemiş; maliyet ve teklif eksik hesaplanır.</span>
            <Button size="sm" onClick={() => setActivePage('settings')}>Fiyatları gir</Button>
          </div>
        )}

        {errors.length > 0 && (
          <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]" open={errors.some((e) => e.severity === 'error')}>
            <summary className="px-4 py-2.5 cursor-pointer text-sm flex items-center gap-2">
              <AlertTriangle size={15} className="text-[var(--color-warning)]" /> {errors.length} uyarı
            </summary>
            <div className="px-4 pb-3 flex flex-col gap-1.5">
              {errors.map((w) => <WarningItem key={`${w.cabinetCode}-${w.id}`} w={w} prefix={w.cabinetCode} />)}
            </div>
          </details>
        )}

        <div role="tablist" className="flex gap-1 border-b border-[var(--color-border)]">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
                tab === t.id ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-semibold' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}>{t.label}</button>
          ))}
        </div>

        {tab === 'parts' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-[var(--color-text-muted)]">
              Ölçüler bitmiş (bant dahil) ölçüdür. Bant: "Boy×1" boy kenarlarından birine, "En×2" iki kısa kenara bant demektir.
            </p>
            {c.groups.map((g) => (
              <Card key={g.key} title={g.label}
                actions={<span className="text-xs text-[var(--color-text-muted)]">{g.pieceCount} parça · {formatNumber(g.netAreaM2)} m² · {g.optimization.totalSheets} plaka</span>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-[var(--color-text-dim)] bg-[var(--color-bg)]">
                      <tr>
                        <th className={`${th} text-left`}>Kod</th>
                        <th className={`${th} text-left`}>Parça</th>
                        <th className={`${th} text-right`}>Boy</th>
                        <th className={`${th} text-right`}>En</th>
                        <th className={`${th} text-center`}>Adet</th>
                        <th className={`${th} text-left`}>Kenar bandı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {g.parts.map((p) => (
                        <tr key={p.uid} className="hover:bg-[var(--color-bg-hover)]/40">
                          <td className={`${td} font-mono text-xs`}>{p.code}</td>
                          <td className={td}>{p.name}</td>
                          <td className={`${td} text-right font-mono`}>{p.length}</td>
                          <td className={`${td} text-right font-mono`}>{p.width}</td>
                          <td className={`${td} text-center font-mono`}>{p.quantity}</td>
                          <td className={`${td} text-xs text-[var(--color-text-muted)]`}>{bandLabel(p.bands)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'sheets' && (
          <div className="flex flex-col gap-6">
            <p className="text-xs text-[var(--color-text-muted)]">
              Plaka {settings.sheetWidth} × {settings.sheetHeight} mm, testere payı {settings.sawKerf} mm, kenar kırpma {settings.edgeTrim} mm. Ölçüleri Ayarlar'dan değiştirebilirsiniz.
            </p>
            {c.groups.map((g) => (
              <Card key={g.key} title={g.label}
                actions={<span className="text-xs text-[var(--color-text-muted)]">{g.optimization.totalSheets} plaka · fire %{formatNumber(g.optimization.totalWastePercent)}</span>}>
                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {g.optimization.layouts.map((l, i) => <SheetView key={i} layout={l} index={i} total={g.optimization.layouts.length} />)}
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'hardware' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="Hırdavat">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-[var(--color-text-dim)] bg-[var(--color-bg)]">
                  <tr><th className={`${th} text-left`}>Ürün</th><th className={`${th} text-right`}>Miktar</th><th className={`${th} text-right`}>Birim</th><th className={`${th} text-right`}>Toplam</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {c.hardware.map((h) => (
                    <tr key={`${h.key}-${h.name}`}>
                      <td className={td}>{h.name}</td>
                      <td className={`${td} text-right font-mono`}>{h.quantity} {h.unit}</td>
                      <td className={`${td} text-right font-mono text-[var(--color-text-muted)]`}>{formatMoney(h.unitPrice)}</td>
                      <td className={`${td} text-right font-mono`}>{formatMoney(h.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title="Kenar bandı">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-[var(--color-text-dim)] bg-[var(--color-bg)]">
                  <tr><th className={`${th} text-left`}>Kalınlık</th><th className={`${th} text-right`}>Net</th><th className={`${th} text-right`}>Fireli (%{settings.bandWastePercent})</th><th className={`${th} text-right`}>Toplam</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {c.bands.map((b) => (
                    <tr key={b.thickness}>
                      <td className={td}>{formatNumber(b.thickness)} mm</td>
                      <td className={`${td} text-right font-mono`}>{formatNumber(b.meters)} m</td>
                      <td className={`${td} text-right font-mono`}>{formatNumber(b.withWaste)} m</td>
                      <td className={`${td} text-right font-mono`}>{formatMoney(b.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {tab === 'cost' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card title="Maliyet dökümü" className="lg:col-span-2">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-[var(--color-text-dim)] bg-[var(--color-bg)]">
                  <tr><th className={`${th} text-left`}>Kalem</th><th className={`${th} text-right`}>Miktar</th><th className={`${th} text-right`}>Birim fiyat</th><th className={`${th} text-right`}>Toplam</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {c.costLines.map((l, i) => (
                    <tr key={i} className={l.unitPrice === 0 && l.quantity > 0 ? 'text-[var(--color-text-muted)]' : ''}>
                      <td className={td}>{l.description}</td>
                      <td className={`${td} text-right font-mono`}>{formatNumber(l.quantity)} {l.unit}</td>
                      <td className={`${td} text-right font-mono`}>{l.unitPrice === 0 ? <span className="text-[var(--color-warning)]">girilmedi</span> : formatMoney(l.unitPrice)}</td>
                      <td className={`${td} text-right font-mono`}>{formatMoney(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title="Teklif">
              <dl className="p-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">Maliyet</dt><dd className="font-mono">{formatMoney(c.quote.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">Kâr (%{settings.profitPercent})</dt><dd className="font-mono">{formatMoney(c.quote.profit)}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">KDV (%{settings.vatPercent})</dt><dd className="font-mono">{formatMoney(c.quote.vat)}</dd></div>
                <div className="flex justify-between pt-2 mt-1 border-t border-[var(--color-border)] text-base font-bold">
                  <dt>Satış fiyatı</dt><dd className="font-mono text-[var(--color-accent)]">{formatMoney(c.quote.total)}</dd>
                </div>
                <Button className="mt-3" onClick={() => setActivePage('settings')}>Fiyat ve oranları düzenle</Button>
              </dl>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
