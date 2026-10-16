import * as XLSX from 'xlsx';
import type { ExportContext } from './pdf-export';
import { bandLabel } from '../utils/format';
import { sinkDirectionLabel } from '../engine/sink';

/** Proje dökümünü çok sayfalı bir Excel çalışma kitabı olarak üretir. */
export function buildWorkbook(ctx: ExportContext): XLSX.WorkBook {
  const { computation: c, settings } = ctx;
  const wb = XLSX.utils.book_new();

  const parts = c.groups.flatMap((g) => g.parts.map((p) => ({
    'Levha': g.label,
    'Dolap': p.cabinetCode,
    'Kod': p.code,
    'Parça': p.name,
    'Boy (mm)': p.length,
    'En (mm)': p.width,
    'Kalınlık (mm)': p.thickness,
    'Adet': p.quantity,
    'Kenar bandı': bandLabel(p.bands),
    'Bant üst (boy)': p.bands.top || '',
    'Bant alt (boy)': p.bands.bottom || '',
    'Bant sol (en)': p.bands.left || '',
    'Bant sağ (en)': p.bands.right || '',
  })));
  const wsParts = XLSX.utils.json_to_sheet(parts);
  wsParts['!cols'] = [{ wch: 22 }, { wch: 7 }, { wch: 20 }, { wch: 24 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 6 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsParts, 'Kesim Listesi');

  const cabinets = c.cabinets.map(({ cabinet, computed }) => ({
    'Kod': cabinet.code,
    'Ad': cabinet.name,
    'Genişlik': cabinet.width,
    'Yükseklik': cabinet.height,
    'Derinlik': cabinet.depth,
    'Adet': cabinet.quantity || 1,
    'Kapak': computed.doorCount,
    'Çekmece': computed.drawerFrontHeights.length,
    'Raf': cabinet.shelfCount + cabinet.fixedShelfCount,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cabinets), 'Dolaplar');

  const sheets = c.groups.flatMap((g) => g.optimization.layouts.map((l, i) => ({
    'Levha': g.label,
    'Plaka': i + 1,
    'Ölçü': `${l.sheetWidth} × ${l.sheetHeight}`,
    'Parça sayısı': l.placements.length,
    'Kullanım %': l.usagePercent,
  })));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets), 'Plakalar');

  const hardware = c.hardware.map((h) => ({
    'Ürün': h.name, 'Miktar': h.quantity, 'Birim': h.unit, 'Birim fiyat (₺)': h.unitPrice, 'Toplam (₺)': h.total,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hardware), 'Hırdavat');

  const bands = c.bands.map((b) => ({
    'Kalınlık (mm)': b.thickness, 'Net (m)': b.meters, [`Fireli %${settings.bandWastePercent} (m)`]: b.withWaste,
    'Birim fiyat (₺/m)': b.unitPrice, 'Toplam (₺)': b.total,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bands), 'Kenar Bandı');

  if (c.countertopOps.length > 0) {
    const ops = c.countertopOps.map((o) => {
      const L = o.layout;
      const dir = ctx.project.cabinets.find((cab) => cab.id === o.cabinetId)?.sink?.drainer ?? 'none';
      return {
        'Dolap': o.cabinetCode,
        'Evye': o.sinkName,
        'Montaj': o.mount === 'undermount' ? 'Tezgâh altı' : 'Ankastre',
        'Yön': sinkDirectionLabel(dir),
        'Kesim genişlik': L.cutout.w,
        'Kesim derinlik': L.cutout.h,
        'Kesim dolap solundan': L.cutout.x,
        'Kesim tezgâh önünden': L.cutout.y,
        'Kesim duvar solundan': o.cabinetX !== null ? o.cabinetX + L.cutout.x : '',
        'Batarya Ø': L.faucet?.diameter ?? '',
        'Batarya dolap solundan': L.faucet?.x ?? '',
        'Batarya tezgâh önünden': L.faucet?.y ?? '',
        'Batarya yeri': L.faucet ? (L.faucet.onSink ? 'Evyede' : 'Tezgâhta') : '',
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ops), 'Tezgâh İşlemleri');
  }

  const cost = [
    ...c.costLines.map((l) => ({ 'Kalem': l.description, 'Miktar': l.quantity, 'Birim': l.unit, 'Birim fiyat (₺)': l.unitPrice, 'Toplam (₺)': l.total })),
    { 'Kalem': 'Maliyet toplamı', 'Toplam (₺)': c.quote.subtotal },
    { 'Kalem': `Kâr %${settings.profitPercent}`, 'Toplam (₺)': c.quote.profit },
    { 'Kalem': `KDV %${settings.vatPercent}`, 'Toplam (₺)': c.quote.vat },
    { 'Kalem': 'Satış fiyatı (KDV dahil)', 'Toplam (₺)': c.quote.total },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cost), 'Maliyet');

  return wb;
}

export function workbookToBlob(wb: XLSX.WorkBook): Blob {
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
