import type { AppSettings } from '../models/settings';

export const DEFAULT_SETTINGS: AppSettings = {
  workshopName: '',
  workshopPhone: '',
  workshopAddress: '',

  sheetWidth: 2800,
  sheetHeight: 2100,
  sawKerf: 4,
  edgeTrim: 10,

  bodyBand: 0.8,
  frontBand: 1,
  bandWastePercent: 10,

  materials: {
    body: { name: 'Suntalam', pricePerSheet: 0 },
    front: { name: 'Kapak MDF Lam', pricePerSheet: 0 },
    back: { name: 'Arkalık MDF', pricePerSheet: 0 },
  },
  bandPrices: { '0.8': 0, '1': 0, '2': 0 },
  hardwarePrices: {
    hinge: 0,
    rail: 0,
    metal_drawer: 0,
    confirmat: 0,
    shelf_pin: 0,
    leg: 0,
    handle: 0,
    gas_strut: 0,
    lift_system: 0,
    hanger_rod: 0,
  },
  laborPerCabinet: 0,
  profitPercent: 0,
  vatPercent: 20,
  quoteValidityDays: 15,
};

/** Eksik alanları varsayılanlarla tamamlar (eski kayıtlar için). */
export function mergeSettings(saved: Partial<AppSettings> | undefined): AppSettings {
  const s = saved ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    materials: {
      body: { ...DEFAULT_SETTINGS.materials.body, ...s.materials?.body },
      front: { ...DEFAULT_SETTINGS.materials.front, ...s.materials?.front },
      back: { ...DEFAULT_SETTINGS.materials.back, ...s.materials?.back },
    },
    bandPrices: { ...DEFAULT_SETTINGS.bandPrices, ...s.bandPrices },
    hardwarePrices: { ...DEFAULT_SETTINGS.hardwarePrices, ...s.hardwarePrices },
  };
}
