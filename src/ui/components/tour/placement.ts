export interface Box { left: number; top: number; width: number; height: number }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Tanıtım balonunun konumu: hedefin altı, üstü, sağı ya da solu (sığan ilk yer).
 * Hedef ekranın büyük kısmını kaplıyorsa (çizim alanı gibi) balon hedefin içinde alta yerleşir;
 * hedef yoksa ekranın ortasına.
 */
export function placeBubble(target: Box | null, bubble: { width: number; height: number }, view: { width: number; height: number }, gap = 14, margin = 12): { left: number; top: number } {
  const { width: w, height: h } = bubble;
  const maxLeft = Math.max(margin, view.width - w - margin);
  const maxTop = Math.max(margin, view.height - h - margin);
  if (!target) return { left: clamp((view.width - w) / 2, margin, maxLeft), top: clamp((view.height - h) / 2, margin, maxTop) };

  const right = target.left + target.width;
  const bottom = target.top + target.height;
  const centerX = clamp(target.left + target.width / 2 - w / 2, margin, maxLeft);
  const centerY = clamp(target.top + target.height / 2 - h / 2, margin, maxTop);

  if (bottom + gap + h <= view.height - margin) return { left: centerX, top: bottom + gap };
  if (target.top - gap - h >= margin) return { left: centerX, top: target.top - gap - h };
  if (right + gap + w <= view.width - margin) return { left: right + gap, top: centerY };
  if (target.left - gap - w >= margin) return { left: target.left - gap - w, top: centerY };
  // Büyük hedef: içinde, alt kenara yakın
  return { left: centerX, top: clamp(bottom - h - margin * 2, margin, maxTop) };
}
