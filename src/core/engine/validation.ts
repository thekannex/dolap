import type { ValidationWarning } from '../models/common';
import { calcShelfDeflection } from './shelf-calc';

let warningCounter = 0;
function nextId(): string {
  return `warn-${++warningCounter}`;
}

/** Reset counter (test yardımcısı) */
export function resetWarningCounter(): void {
  warningCounter = 0;
}

export function validateShelfDeflection(
  spanMm: number, thicknessMm: number, depthMm: number,
  loadKgPerM: number, elasticModulusMPa: number, limitRatio: number
): ValidationWarning | null {
  const res = calcShelfDeflection(spanMm, thicknessMm, depthMm, loadKgPerM, elasticModulusMPa, limitRatio);
  if (!res.passes) {
    return {
      id: nextId(),
      severity: 'warning',
      ruleId: 'VAL_SHELF_DEFLECTION',
      message: `Raf sehimi ${res.deflection.toFixed(2)}mm, sınır ${res.limit.toFixed(2)}mm.`,
      suggestion: res.suggestion,
    };
  }
  return null;
}

export function validateSheetSize(
  partLength: number, partWidth: number,
  sheetWidth: number, sheetHeight: number,
  partCode: string
): ValidationWarning | null {
  // Parça en az bir yönde plakaya sığmalı (döndürülebilir)
  const fitsNormal = partLength <= sheetWidth && partWidth <= sheetHeight;
  const fitsRotated = partLength <= sheetHeight && partWidth <= sheetWidth;
  if (!fitsNormal && !fitsRotated) {
    return {
      id: nextId(),
      severity: 'error',
      ruleId: 'VAL_EXCEEDS_SHEET',
      message: `${partCode}: ${partLength}×${partWidth}mm parça ${sheetWidth}×${sheetHeight}mm plaka ebadını aşıyor.`,
    };
  }
  return null;
}

export function validateGrainDirection(
  partLength: number, partWidth: number,
  grainDirection: 'length' | 'width' | 'none',
  sheetWidth: number, sheetHeight: number,
  partCode: string
): ValidationWarning | null {
  if (grainDirection === 'none') return null;

  // Damar yönü 'length': parça boyu plaka uzun kenarı (sheetWidth) boyunca,
  //   parça eni plaka kısa kenarına (sheetHeight) sığmalı
  // Damar yönü 'width': parça eni plaka uzun kenarı boyunca,
  //   parça boyu plaka kısa kenarına sığmalı
  if (grainDirection === 'length') {
    if (partLength > sheetWidth || partWidth > sheetHeight) {
      return {
        id: nextId(),
        severity: 'warning',
        ruleId: 'VAL_GRAIN_VIOLATION',
        message: `${partCode}: damar yönünde plakaya sığmıyor (${partLength}×${partWidth}mm, plaka ${sheetWidth}×${sheetHeight}mm).`,
      };
    }
  } else {
    if (partWidth > sheetWidth || partLength > sheetHeight) {
      return {
        id: nextId(),
        severity: 'warning',
        ruleId: 'VAL_GRAIN_VIOLATION',
        message: `${partCode}: damar yönünde plakaya sığmıyor (${partLength}×${partWidth}mm, plaka ${sheetWidth}×${sheetHeight}mm).`,
      };
    }
  }
  return null;
}

export function validateHingeCount(
  doorHeight: number, doorWidth: number, doorWeightKg: number,
  currentHingeCount: number,
  countTable: Array<{ minHeight: number; maxHeight: number; count: number }>,
  extraHingeWidthMm: number, extraHingeWeightKg: number,
  partCode: string
): ValidationWarning | null {
  // Gerekli menteşe sayısını hesapla
  let required = 2;
  for (const rule of countTable) {
    if (doorHeight >= rule.minHeight && doorHeight <= rule.maxHeight) {
      required = rule.count;
      break;
    }
  }
  if (doorWidth > extraHingeWidthMm) required++;
  if (doorWeightKg > extraHingeWeightKg) required++;

  if (currentHingeCount < required) {
    return {
      id: nextId(),
      severity: 'warning',
      ruleId: 'VAL_HINGE_INSUFFICIENT',
      message: `${partCode}: ${currentHingeCount} menteşe yetersiz, en az ${required} adet gerekli.`,
      suggestion: `Menteşe sayısını ${required} adede çıkarın.`,
    };
  }
  return null;
}

export function validateRailDepth(
  railLength: number, innerDepth: number, partCode: string
): ValidationWarning | null {
  if (railLength > innerDepth) {
    return {
      id: nextId(),
      severity: 'error',
      ruleId: 'VAL_RAIL_EXCEEDS_DEPTH',
      message: `${partCode}: ray boyu (${railLength}mm) iç derinliği (${innerDepth}mm) aşıyor.`,
    };
  }
  return null;
}

export function validateObstacleClash(
  moduleX: number, moduleY: number,
  moduleWidth: number, moduleHeight: number,
  obstacles: Array<{ x: number; y: number; width: number; height: number; type: string }>
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  for (const obs of obstacles) {
    const overlapX = moduleX < obs.x + obs.width && moduleX + moduleWidth > obs.x;
    const overlapY = moduleY < obs.y + obs.height && moduleY + moduleHeight > obs.y;
    if (overlapX && overlapY) {
      warnings.push({
        id: nextId(),
        severity: 'error',
        ruleId: 'VAL_OBSTACLE_CLASH',
        message: `Modül ${obs.type} engeli ile çakışıyor (${obs.x}, ${obs.y}).`,
      });
    }
  }
  return warnings;
}

export function validateCornerClash(
  moduleWidth: number, doorWidth: number, handleLength: number,
  fillerWidth: number, minClearance: number
): ValidationWarning | null {
  // Kapak açıldığında kulpla birlikte dışarı çıkan uzunluk
  const swingRadius = doorWidth + handleLength;
  // Dolgunun sağladığı boşluk yeterli mi
  if (fillerWidth < minClearance && swingRadius > moduleWidth) {
    return {
      id: nextId(),
      severity: 'error',
      ruleId: 'VAL_CORNER_CLASH',
      message: `Köşe dolabında kapak/kulp çarpışması riski. Dolgu: ${fillerWidth}mm, gereken min: ${minClearance}mm.`,
      suggestion: `Dolgu genişliğini en az ${minClearance}mm yapın.`,
    };
  }
  return null;
}

export function validateCooktopHoodGap(
  cooktopY: number, hoodY: number, minGap: number
): ValidationWarning | null {
  const gap = hoodY - cooktopY;
  if (gap < minGap) {
    return {
      id: nextId(),
      severity: 'warning',
      ruleId: 'VAL_COOKTOP_HOOD_GAP',
      message: `Ocak-aspiratör mesafesi ${gap}mm, minimum ${minGap}mm olmalı.`,
      suggestion: `Aspiratörü en az ${minGap}mm yüksekliğe monte edin.`,
    };
  }
  return null;
}
