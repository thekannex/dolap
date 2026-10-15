import type { PartBands } from '../engine/compute-cabinet';

const moneyFmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

export function formatMoney(value: number): string {
  return `${moneyFmt.format(value)} ₺`;
}

export function formatNumber(value: number): string {
  return numFmt.format(value);
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Kenar bandını atölye diliyle özetler.
 * Örn: "Boy×1 · 0,8" (bir uzun kenar), "Boy×2 En×2 · 1" (dört kenar), "—" (bantsız).
 */
export function bandLabel(bands: PartBands): string {
  const longCount = (bands.top > 0 ? 1 : 0) + (bands.bottom > 0 ? 1 : 0);
  const shortCount = (bands.left > 0 ? 1 : 0) + (bands.right > 0 ? 1 : 0);
  if (longCount === 0 && shortCount === 0) return '—';
  const thicknesses = [...new Set([bands.top, bands.bottom, bands.left, bands.right].filter((t) => t > 0))];
  const sides = [longCount > 0 ? `Boy×${longCount}` : '', shortCount > 0 ? `En×${shortCount}` : ''].filter(Boolean).join(' ');
  return `${sides} · ${thicknesses.map(formatNumber).join('/')}`;
}

/** Dosya adı için güvenli metin. */
export function safeFileName(name: string): string {
  const map: Record<string, string> = { ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U' };
  const cleaned = name
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => map[c] ?? c)
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return cleaned || 'Proje';
}
