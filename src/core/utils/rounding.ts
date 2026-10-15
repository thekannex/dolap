/**
 * Round down to nearest 0.5mm step.
 * roundDown05(764.7) → 764.5
 * roundDown05(764.3) → 764.0
 */
export function roundDown05(value: number): number {
  return Math.floor(value * 2) / 2;
}
