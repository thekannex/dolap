import type { ProjectCabinet } from '../models/cabinet';
import type { ValidationWarning } from '../models/common';
import type { Project } from '../models/project';
import type { AppSettings } from '../models/settings';
import { computeCabinet, partBandMeters } from '../engine/compute-cabinet';
import type { ComputedCabinet, ComputedPart, HardwareKey, PartMaterial } from '../engine/compute-cabinet';
import { optimizeCutting } from '../optimizer/guillotine';
import type { CutPiece, OptimizationResult } from '../optimizer/guillotine';

export const MATERIAL_ORDER: PartMaterial[] = ['body', 'front', 'back'];

export interface ProjectPart extends ComputedPart {
  uid: string;
  cabinetId: string;
  cabinetCode: string;
  cabinetName: string;
}

export interface MaterialGroup {
  key: string;
  material: PartMaterial;
  thickness: number;
  label: string;
  parts: ProjectPart[];
  pieceCount: number;
  netAreaM2: number;
  optimization: OptimizationResult;
}

export interface HardwareLine {
  key: HardwareKey;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BandLine {
  thickness: number;
  meters: number;
  withWaste: number;
  unitPrice: number;
  total: number;
}

export interface CostLine {
  category: 'material' | 'band' | 'hardware' | 'labor';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface ProjectQuote {
  subtotal: number;
  profit: number;
  net: number;
  vat: number;
  total: number;
}

export interface CabinetWarning extends ValidationWarning {
  cabinetCode: string;
}

export interface ProjectComputation {
  cabinets: Array<{ cabinet: ProjectCabinet; computed: ComputedCabinet }>;
  parts: ProjectPart[];
  groups: MaterialGroup[];
  hardware: HardwareLine[];
  bands: BandLine[];
  costLines: CostLine[];
  quote: ProjectQuote;
  warnings: CabinetWarning[];
  totals: {
    cabinetCount: number;
    partCount: number;
    sheetCount: number;
    bandMeters: number;
  };
}

export function materialLabel(settings: AppSettings, material: PartMaterial, thickness: number): string {
  return `${settings.materials[material].name} ${thickness}mm`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Projedeki tüm dolapları hesaplar, levhalara göre gruplar, plaka yerleşimini ve maliyeti çıkarır. */
export function computeProject(project: Pick<Project, 'cabinets'>, settings: AppSettings): ProjectComputation {
  const opts = {
    sheetWidth: settings.sheetWidth,
    sheetHeight: settings.sheetHeight,
    bodyBand: settings.bodyBand,
    frontBand: settings.frontBand,
  };

  const cabinets = project.cabinets.map((cabinet) => ({ cabinet, computed: computeCabinet(cabinet, opts) }));

  const parts: ProjectPart[] = [];
  const warnings: CabinetWarning[] = [];
  const hwMap = new Map<string, HardwareLine>();
  let cabinetCount = 0;

  for (const { cabinet, computed } of cabinets) {
    const qty = Math.max(1, Math.floor(cabinet.quantity || 1));
    if (cabinet.type !== 'filler') cabinetCount += qty;

    for (const p of computed.parts) {
      parts.push({
        ...p,
        quantity: p.quantity * qty,
        uid: `${cabinet.id}:${p.id}`,
        cabinetId: cabinet.id,
        cabinetCode: cabinet.code,
        cabinetName: cabinet.name,
      });
    }
    for (const h of computed.hardware) {
      const key = `${h.key}|${h.name}`;
      const line = hwMap.get(key);
      if (line) {
        line.quantity += h.quantity * qty;
      } else {
        const unitPrice = settings.hardwarePrices[h.key] ?? 0;
        hwMap.set(key, { key: h.key, name: h.name, unit: h.unit, quantity: h.quantity * qty, unitPrice, total: 0 });
      }
    }
    for (const w of computed.warnings) {
      warnings.push({ ...w, cabinetCode: cabinet.code });
    }
  }

  const hardware = [...hwMap.values()].map((h) => ({ ...h, total: round2(h.quantity * h.unitPrice) }));

  // --- Levha grupları ve plaka optimizasyonu ---
  const groupMap = new Map<string, ProjectPart[]>();
  for (const p of parts) {
    const key = `${p.material}-${p.thickness}`;
    const list = groupMap.get(key);
    if (list) list.push(p); else groupMap.set(key, [p]);
  }

  const groups: MaterialGroup[] = [...groupMap.entries()].map(([key, groupParts]) => {
    const { material, thickness } = groupParts[0];
    const pieces: CutPiece[] = groupParts.map((p) => ({
      id: p.uid,
      length: p.length,
      width: p.width,
      quantity: p.quantity,
      materialId: key,
      grainDirection: 'none',
      label: p.code,
    }));
    const optimization = optimizeCutting(pieces, settings.sheetWidth, settings.sheetHeight, settings.sawKerf, settings.edgeTrim);
    const netAreaM2 = groupParts.reduce((s, p) => s + (p.length * p.width * p.quantity) / 1e6, 0);
    return {
      key,
      material,
      thickness,
      label: materialLabel(settings, material, thickness),
      parts: groupParts,
      pieceCount: groupParts.reduce((s, p) => s + p.quantity, 0),
      netAreaM2: round2(netAreaM2),
      optimization,
    };
  }).sort((a, b) => MATERIAL_ORDER.indexOf(a.material) - MATERIAL_ORDER.indexOf(b.material) || b.thickness - a.thickness);

  for (const g of groups) {
    for (const u of g.optimization.unplacedPieces) {
      const owner = parts.find((p) => p.uid === u.id);
      warnings.push({
        id: `unplaced-${u.id}`, severity: 'error', ruleId: 'VAL_EXCEEDS_SHEET',
        message: `${u.label} (${u.length}×${u.width}mm) plakaya sığmıyor.`,
        suggestion: 'Parçayı bölün ya da Ayarlar sayfasından plaka ölçüsünü kontrol edin.',
        cabinetCode: owner?.cabinetCode ?? '',
      });
    }
  }

  // --- Kenar bandı ---
  const bandMap = new Map<number, number>();
  for (const p of parts) {
    for (const [th, m] of partBandMeters(p)) bandMap.set(th, (bandMap.get(th) ?? 0) + m);
  }
  const bands: BandLine[] = [...bandMap.entries()].sort((a, b) => a[0] - b[0]).map(([thickness, meters]) => {
    const withWaste = meters * (1 + settings.bandWastePercent / 100);
    const unitPrice = settings.bandPrices[String(thickness)] ?? 0;
    return { thickness, meters: round2(meters), withWaste: round2(withWaste), unitPrice, total: round2(withWaste * unitPrice) };
  });

  // --- Maliyet ---
  const costLines: CostLine[] = [];
  for (const g of groups) {
    const unitPrice = settings.materials[g.material].pricePerSheet;
    costLines.push({
      category: 'material', description: g.label, quantity: g.optimization.totalSheets, unit: 'plaka',
      unitPrice, total: round2(g.optimization.totalSheets * unitPrice),
    });
  }
  for (const b of bands) {
    costLines.push({
      category: 'band', description: `Kenar bandı ${b.thickness}mm`, quantity: b.withWaste, unit: 'm',
      unitPrice: b.unitPrice, total: b.total,
    });
  }
  for (const h of hardware) {
    costLines.push({ category: 'hardware', description: h.name, quantity: h.quantity, unit: h.unit, unitPrice: h.unitPrice, total: h.total });
  }
  if (cabinetCount > 0) {
    costLines.push({
      category: 'labor', description: 'İşçilik', quantity: cabinetCount, unit: 'dolap',
      unitPrice: settings.laborPerCabinet, total: round2(cabinetCount * settings.laborPerCabinet),
    });
  }

  const subtotal = round2(costLines.reduce((s, c) => s + c.total, 0));
  const profit = round2(subtotal * settings.profitPercent / 100);
  const net = round2(subtotal + profit);
  const vat = round2(net * settings.vatPercent / 100);

  return {
    cabinets,
    parts,
    groups,
    hardware,
    bands,
    costLines,
    quote: { subtotal, profit, net, vat, total: round2(net + vat) },
    warnings,
    totals: {
      cabinetCount,
      partCount: parts.reduce((s, p) => s + p.quantity, 0),
      sheetCount: groups.reduce((s, g) => s + g.optimization.totalSheets, 0),
      bandMeters: round2(bands.reduce((s, b) => s + b.withWaste, 0)),
    },
  };
}
