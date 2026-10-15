import type { BandSummary } from './band-summary';

export interface CostBreakdown {
  materialCost: number;
  edgeBandCost: number;
  hardwareCost: number;
  laborCost: number;
  totalCost: number;
  items: CostItem[];
}

export interface CostItem {
  category: 'material' | 'edgeBand' | 'hardware' | 'labor';
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function calculateCost(
  sheetsUsed: number,
  sheetPricePerM2: number,
  sheetWidth: number,
  sheetHeight: number,
  bandSummary: BandSummary,
  bandPricePerMeter: number,
  hardware: Array<{ name: string; quantity: number; unitPrice: number }>,
  laborCostPerModule: number,
  moduleCount: number
): CostBreakdown {
  const items: CostItem[] = [];
  
  const sheetAreaM2 = (sheetWidth / 1000) * (sheetHeight / 1000);
  const totalAreaM2 = sheetAreaM2 * sheetsUsed;
  const materialTotal = totalAreaM2 * sheetPricePerM2;
  items.push({
    category: 'material',
    description: 'Sunta/MDF Plaka',
    quantity: sheetsUsed,
    unitPrice: sheetAreaM2 * sheetPricePerM2,
    total: materialTotal
  });

  const edgeBandTotal = bandSummary.totalWithWaste * bandPricePerMeter;
  items.push({
    category: 'edgeBand',
    description: 'Kenar Bandı',
    quantity: bandSummary.totalWithWaste,
    unitPrice: bandPricePerMeter,
    total: edgeBandTotal
  });

  let hardwareTotal = 0;
  for (const hw of hardware) {
    const hwCost = hw.quantity * hw.unitPrice;
    hardwareTotal += hwCost;
    items.push({
      category: 'hardware',
      description: hw.name,
      quantity: hw.quantity,
      unitPrice: hw.unitPrice,
      total: hwCost
    });
  }

  const laborTotal = moduleCount * laborCostPerModule;
  items.push({
    category: 'labor',
    description: 'İşçilik',
    quantity: moduleCount,
    unitPrice: laborCostPerModule,
    total: laborTotal
  });

  const totalCost = materialTotal + edgeBandTotal + hardwareTotal + laborTotal;

  return {
    materialCost: materialTotal,
    edgeBandCost: edgeBandTotal,
    hardwareCost: hardwareTotal,
    laborCost: laborTotal,
    totalCost,
    items
  };
}
