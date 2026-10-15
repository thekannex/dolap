import type { MaterialGroup } from '../project/project-calc';

/**
 * Plaka kesim planlarını DXF (R12) olarak üretir.
 * Her levha grubu ayrı bir satırda, plakalar soldan sağa dizilir. Birim: mm.
 * Katmanlar: PLAKA (plaka sınırı), PARCA (parça dikdörtgenleri), YAZI (etiketler).
 */
export function generateSheetsDXF(groups: MaterialGroup[], sheetGap = 200, rowGap = 600): string {
  const out: string[] = [];
  const push = (...lines: Array<string | number>) => { for (const l of lines) out.push(String(l)); };
  const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

  const line = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
    push(0, 'LINE', 8, layer, 10, fmt(x1), 20, fmt(y1), 30, 0, 11, fmt(x2), 21, fmt(y2), 31, 0);
  };
  const rect = (x: number, y: number, w: number, h: number, layer: string) => {
    line(x, y, x + w, y, layer);
    line(x + w, y, x + w, y + h, layer);
    line(x + w, y + h, x, y + h, layer);
    line(x, y + h, x, y, layer);
  };
  const text = (value: string, x: number, y: number, height: number, layer = 'YAZI') => {
    push(0, 'TEXT', 8, layer, 10, fmt(x), 20, fmt(y), 30, 0, 40, fmt(height), 1, toAscii(value));
  };

  push(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$INSBASE', 10, 0, 20, 0, 30, 0, 0, 'ENDSEC');
  push(0, 'SECTION', 2, 'TABLES');
  push(0, 'TABLE', 2, 'LAYER', 70, 3);
  for (const [name, color] of [['PLAKA', 7], ['PARCA', 5], ['YAZI', 3]] as const) {
    push(0, 'LAYER', 2, name, 70, 0, 62, color, 6, 'CONTINUOUS');
  }
  push(0, 'ENDTAB', 0, 'ENDSEC');
  push(0, 'SECTION', 2, 'ENTITIES');

  let rowY = 0;
  for (const group of groups) {
    const layouts = group.optimization.layouts;
    if (layouts.length === 0) continue;
    const sheetH = layouts[0].sheetHeight;
    text(`${group.label} - ${layouts.length} plaka`, 0, rowY + sheetH + 120, 60);

    layouts.forEach((layout, i) => {
      // DXF'te Y yukarı doğrudur; plan çizimindeki y'yi ters çeviriyoruz.
      const ox = i * (layout.sheetWidth + sheetGap);
      rect(ox, rowY, layout.sheetWidth, layout.sheetHeight, 'PLAKA');
      text(`Plaka ${i + 1} - %${layout.usagePercent}`, ox, rowY + layout.sheetHeight + 30, 40);
      for (const p of layout.placements) {
        const x = ox + p.x;
        const y = rowY + layout.sheetHeight - p.y - p.width;
        rect(x, y, p.length, p.width, 'PARCA');
        const h = Math.max(12, Math.min(40, p.width / 5, p.length / 12));
        text(p.label, x + 10, y + p.width / 2 + h * 0.2, h);
        text(`${p.length}x${p.width}`, x + 10, y + p.width / 2 - h * 1.2, h * 0.8);
      }
    });
    rowY -= sheetH + rowGap;
  }

  push(0, 'ENDSEC', 0, 'EOF');
  return out.join('\r\n') + '\r\n';
}

/** R12 DXF metinleri ASCII'dir; Türkçe harfleri sadeleştirir. */
function toAscii(s: string): string {
  const map: Record<string, string> = { ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U', '×': 'x' };
  return s.replace(/[çÇğĞıİöÖşŞüÜ×]/g, (c) => map[c] ?? c).replace(/[^\x20-\x7E]/g, '?');
}
