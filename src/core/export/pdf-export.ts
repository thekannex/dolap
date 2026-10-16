import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project } from '../models/project';
import type { AppSettings } from '../models/settings';
import type { ProjectComputation } from '../project/project-calc';
import { CABINET_TYPE_LABELS } from '../engine/cabinet-factory';
import { sinkDirectionLabel } from '../engine/sink';
import { bandLabel, formatDate, formatMoney, formatNumber } from '../utils/format';

export interface ExportContext {
  project: Project;
  computation: ProjectComputation;
  settings: AppSettings;
}

const FONT = 'DejaVu';
const ACCENT: [number, number, number] = [234, 88, 12];
const DARK: [number, number, number] = [39, 39, 42];
const MUTED: [number, number, number] = [113, 113, 122];

let fontCache: { regular: string; bold: string } | null = null;

async function loadFonts(): Promise<{ regular: string; bold: string }> {
  if (fontCache) return fontCache;
  const [regular, bold] = await Promise.all([
    import('../../assets/fonts/DejaVuSans.ttf?inline'),
    import('../../assets/fonts/DejaVuSans-Bold.ttf?inline'),
  ]);
  const strip = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1);
  fontCache = { regular: strip(regular.default), bold: strip(bold.default) };
  return fontCache;
}

async function createDoc(orientation: 'portrait' | 'landscape' = 'portrait'): Promise<jsPDF> {
  const fonts = await loadFonts();
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  doc.addFileToVFS('DejaVuSans.ttf', fonts.regular);
  doc.addFont('DejaVuSans.ttf', FONT, 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', fonts.bold);
  doc.addFont('DejaVuSans-Bold.ttf', FONT, 'bold');
  doc.setFont(FONT, 'normal');
  return doc;
}

function lastY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

const tableStyles = {
  styles: { font: FONT, fontSize: 8, cellPadding: 1.5, textColor: DARK, lineColor: [212, 212, 216] as [number, number, number], lineWidth: 0.1 },
  headStyles: { fillColor: DARK, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const },
  alternateRowStyles: { fillColor: [248, 248, 250] as [number, number, number] },
  theme: 'grid' as const,
  rowPageBreak: 'avoid' as const,
  margin: { left: 14, right: 14, top: 14, bottom: 16 },
};

function drawHeader(doc: jsPDF, title: string, ctx: ExportContext): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageW, 3, 'F');

  doc.setFont(FONT, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text(ctx.settings.workshopName || 'DOLAP', 14, 15);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const contact = [ctx.settings.workshopPhone, ctx.settings.workshopAddress].filter(Boolean).join('  ·  ');
  if (contact) doc.text(contact, 14, 20);

  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...ACCENT);
  doc.text(title, pageW - 14, 15, { align: 'right' });
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Tarih: ${formatDate(new Date())}`, pageW - 14, 20, { align: 'right' });

  doc.setDrawColor(212, 212, 216);
  doc.line(14, 24, pageW - 14, 24);

  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(`Proje: ${ctx.project.name}`, 14, 30);
  doc.text(`Müşteri: ${ctx.project.customerName || '—'}`, 14, 35);
  const right = [ctx.project.customerPhone && `Tel: ${ctx.project.customerPhone}`, ctx.project.address].filter(Boolean) as string[];
  right.forEach((r, i) => doc.text(r, pageW - 14, 30 + i * 5, { align: 'right', maxWidth: 90 }));
  return 42;
}

function drawFooters(doc: jsPDF, label: string) {
  const count = doc.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(label, 14, h - 7);
    doc.text(`Sayfa ${i} / ${count}`, w - 14, h - 7, { align: 'right' });
  }
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  if (y > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    y = 18;
  }
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text(text, 14, y);
  doc.setFont(FONT, 'normal');
  return y + 3;
}

/** Atölye için kesim listesi, plaka planları, hırdavat, bant ve maliyet dökümü. */
export async function generateWorkshopPDF(ctx: ExportContext): Promise<jsPDF> {
  const doc = await createDoc('portrait');
  const { computation: c } = ctx;
  let y = drawHeader(doc, 'ATÖLYE KESİM LİSTESİ', ctx);

  // Özet
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [['Dolap', 'Parça', 'Plaka', 'Kenar bandı', 'Maliyet (KDV hariç)']],
    body: [[
      String(c.totals.cabinetCount),
      String(c.totals.partCount),
      String(c.totals.sheetCount),
      `${formatNumber(c.totals.bandMeters)} m`,
      formatMoney(c.quote.subtotal),
    ]],
    styles: { ...tableStyles.styles, fontSize: 9, halign: 'center' },
  });
  y = lastY(doc) + 8;

  // Parça listeleri (levha grubuna göre)
  for (const g of c.groups) {
    y = sectionTitle(doc, `${g.label} — ${g.pieceCount} parça, ${g.optimization.totalSheets} plaka`, y);
    autoTable(doc, {
      ...tableStyles,
      startY: y + 1,
      head: [['Kod', 'Parça', 'Boy', 'En', 'Adet', 'Kenar bandı']],
      body: g.parts.map((p) => [p.code, p.name, formatNumber(p.length), formatNumber(p.width), String(p.quantity), bandLabel(p.bands)]),
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' } },
    });
    y = lastY(doc) + 8;
  }

  // Hırdavat
  if (c.hardware.length > 0) {
    y = sectionTitle(doc, 'Hırdavat', y);
    autoTable(doc, {
      ...tableStyles,
      startY: y + 1,
      head: [['Ürün', 'Miktar', 'Birim fiyat', 'Toplam']],
      body: c.hardware.map((h) => [h.name, `${h.quantity} ${h.unit}`, formatMoney(h.unitPrice), formatMoney(h.total)]),
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    });
    y = lastY(doc) + 8;
  }

  // Bant
  if (c.bands.length > 0) {
    y = sectionTitle(doc, 'Kenar Bandı', y);
    autoTable(doc, {
      ...tableStyles,
      startY: y + 1,
      head: [['Kalınlık', 'Net (m)', `Fireli (%${ctx.settings.bandWastePercent}) (m)`, 'Toplam']],
      body: c.bands.map((b) => [`${formatNumber(b.thickness)} mm`, formatNumber(b.meters), formatNumber(b.withWaste), formatMoney(b.total)]),
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    });
    y = lastY(doc) + 8;
  }

  // Tezgâh işlemleri
  if (c.countertopOps.length > 0) {
    y = sectionTitle(doc, 'Tezgâh İşlemleri (evye kesimi ve batarya deliği)', y);
    autoTable(doc, {
      ...tableStyles,
      startY: y + 1,
      head: [['Dolap', 'Evye / yön', 'Kesim G×D', 'Kesim yeri', 'Duvar solundan', 'Batarya']],
      body: c.countertopOps.map((o) => {
        const L = o.layout;
        const dir = ctx.project.cabinets.find((cab) => cab.id === o.cabinetId)?.sink?.drainer ?? 'none';
        return [
          o.cabinetCode,
          `${o.sinkName}\n${o.mount === 'undermount' ? 'Tezgâh altı' : 'Ankastre'} · ${sinkDirectionLabel(dir)}`,
          `${formatNumber(L.cutout.w)} × ${formatNumber(L.cutout.h)}`,
          `dolap solundan ${formatNumber(L.cutout.x)}\ntezgâh önünden ${formatNumber(L.cutout.y)}`,
          o.cabinetX !== null ? formatNumber(o.cabinetX + L.cutout.x) : '—',
          L.faucet ? `Ø${L.faucet.diameter} · soldan ${formatNumber(L.faucet.x)}, önden ${formatNumber(L.faucet.y)}${L.faucet.onSink ? ' (evyede)' : ''}` : '—',
        ];
      }),
      columnStyles: { 2: { halign: 'center' }, 4: { halign: 'center' } },
    });
    y = lastY(doc) + 3;
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Ölçüler mm. "Kesim yeri" kesimin sol-ön köşesidir. Kesmeden önce evyenin kendi şablonuyla karşılaştırın.', 14, y + 2);
    doc.setTextColor(...DARK);
    y += 10;
  }

  // Maliyet
  y = sectionTitle(doc, 'Maliyet Dökümü', y);
  autoTable(doc, {
    ...tableStyles,
    startY: y + 1,
    head: [['Kalem', 'Miktar', 'Birim fiyat', 'Toplam']],
    body: [
      ...c.costLines.map((l) => [l.description, `${formatNumber(l.quantity)} ${l.unit}`, formatMoney(l.unitPrice), formatMoney(l.total)]),
      [{ content: 'Maliyet toplamı', colSpan: 3, styles: { fontStyle: 'bold' } }, { content: formatMoney(c.quote.subtotal), styles: { fontStyle: 'bold' } }],
      [{ content: `Kâr (%${ctx.settings.profitPercent})`, colSpan: 3 }, formatMoney(c.quote.profit)],
      [{ content: `KDV (%${ctx.settings.vatPercent})`, colSpan: 3 }, formatMoney(c.quote.vat)],
      [{ content: 'Satış fiyatı (KDV dahil)', colSpan: 3, styles: { fontStyle: 'bold' } }, { content: formatMoney(c.quote.total), styles: { fontStyle: 'bold' } }],
    ],
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  });

  // Uyarılar
  const important = c.warnings.filter((w) => w.severity !== 'info');
  if (important.length > 0) {
    y = sectionTitle(doc, 'Uyarılar', lastY(doc) + 8);
    autoTable(doc, {
      ...tableStyles,
      startY: y + 1,
      head: [['Dolap', 'Uyarı', 'Öneri']],
      body: important.map((w) => [w.cabinetCode, w.message, w.suggestion ?? '']),
    });
  }

  // Plaka yerleşim sayfaları
  for (const g of c.groups) {
    g.optimization.layouts.forEach((layout, i) => {
      doc.addPage('a4', 'landscape');
      drawSheetPage(doc, `${g.label} — Plaka ${i + 1} / ${g.optimization.layouts.length}`, layout);
    });
  }

  drawFooters(doc, `${ctx.project.name} · Atölye kesim listesi`);
  return doc;
}

function drawSheetPage(
  doc: jsPDF,
  title: string,
  layout: ProjectComputation['groups'][number]['optimization']['layouts'][number],
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text(title, 14, 14);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${layout.sheetWidth} × ${layout.sheetHeight} mm · ${layout.placements.length} parça · Kullanım %${formatNumber(layout.usagePercent)}`, pageW - 14, 14, { align: 'right' });

  const areaW = pageW - 28;
  const areaH = pageH - 34;
  const scale = Math.min(areaW / layout.sheetWidth, areaH / layout.sheetHeight);
  const ox = 14 + (areaW - layout.sheetWidth * scale) / 2;
  const oy = 20;

  doc.setFillColor(228, 228, 231);
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.3);
  doc.rect(ox, oy, layout.sheetWidth * scale, layout.sheetHeight * scale, 'FD');

  doc.setLineWidth(0.15);
  for (const p of layout.placements) {
    const x = ox + p.x * scale;
    const y = oy + p.y * scale;
    const w = p.length * scale;
    const h = p.width * scale;
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(...ACCENT);
    doc.rect(x, y, w, h, 'FD');

    if (w > 10 && h > 5) {
      const fs = Math.max(4.5, Math.min(8, h * 1.2, w * 0.5));
      doc.setFontSize(fs);
      doc.setTextColor(...DARK);
      doc.setFont(FONT, 'bold');
      doc.text(p.label, x + w / 2, y + h / 2 - fs * 0.12, { align: 'center', maxWidth: w - 1 });
      doc.setFont(FONT, 'normal');
      doc.setTextColor(...MUTED);
      doc.text(`${formatNumber(p.length)} × ${formatNumber(p.width)}`, x + w / 2, y + h / 2 + fs * 0.42, { align: 'center', maxWidth: w - 1 });
    }
  }
}

function cabinetSummary(c: ProjectComputation['cabinets'][number]): string {
  const { cabinet, computed } = c;
  const bits: string[] = [];
  if (computed.doorCount > 0) {
    if (cabinet.doorOpening === 'up') bits.push(computed.doorCount > 1 ? 'katlanır kapak (yukarı açılır)' : 'kalkar kapak (yukarı açılır)');
    else bits.push(`${computed.doorCount} kapak`);
  }
  if (computed.drawerFrontHeights.length > 0) bits.push(`${computed.drawerFrontHeights.length} çekmece`);
  const shelves = cabinet.shelfCount + cabinet.fixedShelfCount;
  if (shelves > 0 && cabinet.type !== 'filler') bits.push(`${shelves} raf`);
  if (cabinet.hangerRodCount > 0) bits.push(`${cabinet.hangerRodCount} askı`);
  if (cabinet.sink && computed.sink) bits.push(`evye ${cabinet.sink.outerWidth}×${cabinet.sink.outerDepth} (${sinkDirectionLabel(cabinet.sink.drainer).toLowerCase()})`);
  return bits.join(', ') || '—';
}

/** Müşteriye verilecek teklif: dolap listesi ve toplam fiyat. */
export async function generateQuotePDF(ctx: ExportContext): Promise<jsPDF> {
  const doc = await createDoc('portrait');
  const { computation: c, settings } = ctx;
  let y = drawHeader(doc, 'FİYAT TEKLİFİ', ctx);

  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [['Kod', 'Dolap', 'Ölçü G × Y × D (mm)', 'İçerik', 'Adet']],
    body: c.cabinets.map((item) => [
      item.cabinet.code,
      item.cabinet.name || CABINET_TYPE_LABELS[item.cabinet.type],
      `${item.cabinet.width} × ${item.cabinet.height} × ${item.cabinet.depth}`,
      cabinetSummary(item),
      String(item.cabinet.quantity || 1),
    ]),
    styles: { ...tableStyles.styles, fontSize: 9, cellPadding: 2 },
    columnStyles: { 2: { halign: 'center' }, 4: { halign: 'center' } },
  });
  y = lastY(doc) + 6;

  const pageW = doc.internal.pageSize.getWidth();
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    margin: { left: pageW / 2, right: 14, top: 14, bottom: 16 },
    body: [
      ['Ara toplam', formatMoney(c.quote.net)],
      [`KDV (%${settings.vatPercent})`, formatMoney(c.quote.vat)],
      [{ content: 'GENEL TOPLAM', styles: { fontStyle: 'bold', fillColor: ACCENT, textColor: [255, 255, 255] } },
        { content: formatMoney(c.quote.total), styles: { fontStyle: 'bold', fillColor: ACCENT, textColor: [255, 255, 255] } }],
    ],
    styles: { ...tableStyles.styles, fontSize: 10, cellPadding: 2.5 },
    columnStyles: { 1: { halign: 'right' } },
  });
  y = lastY(doc) + 10;

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const notes = [
    `Bu teklif ${settings.quoteValidityDays} gün geçerlidir.`,
    'Ölçüler, montaj öncesi saha kontrolüyle kesinleşir.',
    'Tezgâh, ankastre cihazlar ve tesisat işleri teklife dahil değildir (ayrıca belirtilmedikçe).',
  ];
  if (ctx.project.notes) notes.push(`Not: ${ctx.project.notes}`);
  notes.forEach((n, i) => doc.text(`• ${n}`, 14, y + i * 5, { maxWidth: pageW - 28 }));

  y += notes.length * 5 + 16;
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.text('Teklifi veren', 14, y);
  doc.text('Müşteri onayı', pageW - 14, y, { align: 'right' });
  doc.setDrawColor(161, 161, 170);
  doc.line(14, y + 14, 74, y + 14);
  doc.line(pageW - 74, y + 14, pageW - 14, y + 14);

  drawFooters(doc, `${ctx.project.name} · Fiyat teklifi`);
  return doc;
}
