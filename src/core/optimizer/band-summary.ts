export interface BandSummaryItem {
  bandThickness: number;
  materialId: string;
  totalMeters: number;
  withWaste: number;
}

export interface BandSummary {
  items: BandSummaryItem[];
  totalMeters: number;
  totalWithWaste: number;
}

export function summarizeBands(parts: Array<{
  length: number;
  width: number;
  quantity: number;
  edgeBanding: {
    top: { thickness: number; materialId: string } | null;
    bottom: { thickness: number; materialId: string } | null;
    left: { thickness: number; materialId: string } | null;
    right: { thickness: number; materialId: string } | null;
  };
}>): BandSummary {
  const map = new Map<string, BandSummaryItem>();

  const addEdge = (lenMm: number, qty: number, band: { thickness: number; materialId: string } | null) => {
    if (!band) return;
    const key = `${band.thickness}_${band.materialId}`;
    let item = map.get(key);
    if (!item) {
      item = { bandThickness: band.thickness, materialId: band.materialId, totalMeters: 0, withWaste: 0 };
      map.set(key, item);
    }
    item.totalMeters += (lenMm / 1000) * qty;
  };

  for (const part of parts) {
    addEdge(part.length, part.quantity, part.edgeBanding.top);
    addEdge(part.length, part.quantity, part.edgeBanding.bottom);
    addEdge(part.width, part.quantity, part.edgeBanding.left);
    addEdge(part.width, part.quantity, part.edgeBanding.right);
  }

  let totalMeters = 0;
  let totalWithWaste = 0;

  const items = Array.from(map.values()).map(item => {
    item.withWaste = item.totalMeters * 1.1;
    totalMeters += item.totalMeters;
    totalWithWaste += item.withWaste;
    return item;
  });

  return {
    items,
    totalMeters,
    totalWithWaste
  };
}
