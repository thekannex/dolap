export function mmToM(mm: number): number {
  return mm / 1000;
}

export function m2(lengthMm: number, widthMm: number): number {
  return (lengthMm / 1000) * (widthMm / 1000);
}
