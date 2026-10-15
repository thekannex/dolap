import type { HardwareKey, PartMaterial } from '../engine/compute-cabinet';

export interface SheetMaterialSetting {
  name: string;
  /** Bir tam plakanın fiyatı (₺). */
  pricePerSheet: number;
}

export interface AppSettings {
  workshopName: string;
  workshopPhone: string;
  workshopAddress: string;

  sheetWidth: number;
  sheetHeight: number;
  sawKerf: number;
  edgeTrim: number;

  bodyBand: number;
  frontBand: number;
  bandWastePercent: number;

  materials: Record<PartMaterial, SheetMaterialSetting>;
  /** Bant kalınlığına göre metre fiyatı (anahtar: "0.8", "1", "2"...). */
  bandPrices: Record<string, number>;
  hardwarePrices: Record<HardwareKey, number>;
  laborPerCabinet: number;
  profitPercent: number;
  vatPercent: number;
  quoteValidityDays: number;
}
