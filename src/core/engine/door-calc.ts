import type { CalcResult } from '../models/common';
import { roundDown05 } from '../utils/rounding';

export function calcFullOverlayDoorWidth(W: number, doorCount: number, d: number): CalcResult {
  const val = (W / doorCount) - d;
  return {
    value: roundDown05(val),
    trace: {
      formula: 'W / doorCount - d',
      inputs: { W, doorCount, d },
      ruleId: 'RULE_DOOR_FULL_WIDTH',
      description: 'Kapak genişliği = W ÷ kapak sayısı − derz.'
    }
  };
}

export function calcFullOverlayDoorHeight(H: number, d: number): CalcResult {
  const val = H - d;
  return {
    value: roundDown05(val),
    trace: {
      formula: 'H - d',
      inputs: { H, d },
      ruleId: 'RULE_DOOR_FULL_HEIGHT',
      description: 'Kapak yüksekliği = H − derz.'
    }
  };
}

export function calcInsetDoorWidth(innerWidth: number, d: number, doorCount: number): CalcResult {
  const val = (innerWidth / doorCount) - 2 * d;
  return {
    value: roundDown05(val),
    trace: {
      formula: 'innerWidth / doorCount - 2*d',
      inputs: { innerWidth, d, doorCount },
      ruleId: 'RULE_DOOR_INSET_WIDTH',
      description: 'İç kapak genişliği = iç genişlik / kapak sayısı - 2*derz.'
    }
  };
}

export function calcInsetDoorHeight(innerHeight: number, d: number): CalcResult {
  const val = innerHeight - 2 * d;
  return {
    value: roundDown05(val),
    trace: {
      formula: 'innerHeight - 2*d',
      inputs: { innerHeight, d },
      ruleId: 'RULE_DOOR_INSET_HEIGHT',
      description: 'İç kapak yüksekliği = iç yükseklik - 2*derz.'
    }
  };
}

export function calcHalfOverlayDoorWidth(W: number, d: number, halfOverlayAmount: number): CalcResult {
  const val = (W / 2) - d + halfOverlayAmount;
  return {
    value: roundDown05(val),
    trace: {
      formula: 'W/2 - d + halfOverlayAmount',
      inputs: { W, d, halfOverlayAmount },
      ruleId: 'RULE_DOOR_HALF_WIDTH',
      description: 'Yarım bindirme kapak genişliği.'
    }
  };
}

export function suggestDoorCount(W: number, singleDoorMaxWidth: number): { count: number; reason: string } {
  if (W <= singleDoorMaxWidth) {
    return { count: 1, reason: 'Genişlik tek kapak sınırında.' };
  }
  return { count: 2, reason: 'Genişlik çift kapak gerektiriyor.' };
}

export function suggestOpenDirection(moduleX: number, wallWidth: number): 'left' | 'right' {
  if (moduleX < wallWidth / 2) {
    return 'right';
  }
  return 'left';
}
