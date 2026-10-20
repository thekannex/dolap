import type { CalcResult } from '../models/common';
import type { AssemblyType, BackType } from '../models/construction';
import { roundDown05 } from '../utils/rounding';

export function calcSideHeight(H: number): CalcResult {
  return {
    value: roundDown05(H),
    trace: {
      formula: 'H',
      inputs: { H },
      ruleId: 'RULE_SIDE_HEIGHT',
      description: 'Yan dikme yüksekliği = gövde dış yüksekliği.'
    }
  };
}

export function calcSideDepth(D: number, backType: BackType, backThickness: number): CalcResult {
  const isRouted = backType === 'routed';
  const val = isRouted ? D : D - backThickness;
  return {
    value: roundDown05(val),
    trace: {
      formula: isRouted ? 'D' : 'D - backThickness',
      inputs: { D, backThickness, backType },
      ruleId: isRouted ? 'RULE_SIDE_DEPTH_ROUTED' : 'RULE_SIDE_DEPTH_NAILED',
      description: isRouted ? 'Kanallı arkalıkta yan dikme derinliği değişmez, arkalık kanala girer.' : 'Çakma arkalıkta yan dikme derinliği = D − arkalık kalınlığı.'
    }
  };
}

export function calcBottomWidth(W: number, t: number, assemblyType: AssemblyType): CalcResult {
  const isSidesOut = assemblyType === 'sides_out';
  const val = isSidesOut ? W - 2 * t : W;
  return {
    value: roundDown05(val),
    trace: {
      formula: isSidesOut ? 'W - 2t' : 'W',
      inputs: { W, t, assemblyType },
      ruleId: isSidesOut ? 'RULE_BOTTOM_WIDTH_SIDES_OUT' : 'RULE_BOTTOM_WIDTH_SIDES_IN',
      description: isSidesOut ? 'Taban, iki yan dikmenin arasına girer. Genişlik = Dış genişlik − 2 × gövde kalınlığı.' : 'Yanlar tabanın üstüne oturur. Taban tam dış genişliktedir.'
    }
  };
}

export function calcBottomDepth(D: number, backType: BackType, backThickness: number): CalcResult {
  return calcSideDepth(D, backType, backThickness);
}

export function calcTopWidth(W: number, t: number, assemblyType: AssemblyType): CalcResult {
  return calcBottomWidth(W, t, assemblyType);
}

export function calcTopDepth(D: number, backType: BackType, backThickness: number): CalcResult {
  return calcSideDepth(D, backType, backThickness);
}

export function calcRailWidth(W: number, t: number, assemblyType: AssemblyType): CalcResult {
  const isSidesOut = assemblyType === 'sides_out';
  const val = isSidesOut ? W - 2 * t : W;
  return {
    value: roundDown05(val),
    trace: {
      formula: isSidesOut ? 'W - 2t' : 'W',
      inputs: { W, t, assemblyType },
      ruleId: 'RULE_RAIL_WIDTH',
      description: 'Kuşak genişliği = taban genişliği ile aynı formül (iki yan dikme arası).'
    }
  };
}

export function calcRailDepth(railWidth: number): CalcResult {
  return {
    value: roundDown05(railWidth),
    trace: {
      formula: 'railWidth',
      inputs: { railWidth },
      ruleId: 'RULE_RAIL_DEPTH',
      description: 'Kuşak eni.'
    }
  };
}

/** Çakma arkalık dolabın arkasını tam örter; kenarlardan görünmesin diye her yandan bu kadar içeride kesilir (mm). */
export const NAILED_BACK_EDGE = 2;

export function calcBackWidth(W: number, t: number, backType: BackType, backChannelDepth: number): CalcResult {
  const isRouted = backType === 'routed';
  const val = isRouted ? W - 2 * t + 2 * (backChannelDepth - 1) : W - 2 * NAILED_BACK_EDGE;
  return {
    value: roundDown05(val),
    trace: {
      formula: isRouted ? 'W - 2t + 2*(k-1)' : `W - 2×${NAILED_BACK_EDGE}`,
      inputs: { W, t, backType, backChannelDepth },
      ruleId: isRouted ? 'RULE_BACK_WIDTH_ROUTED' : 'RULE_BACK_WIDTH_NAILED',
      description: isRouted ? 'Arkalık iç ölçü + 2×(kanal derinliği − 1) mm.' : `Çakma arkalık dikmelerin arka kenarına çakılır; dolabın dış genişliğinden her yandan ${NAILED_BACK_EDGE} mm eksik, kenardan görünmez.`
    }
  };
}

export function calcBackHeight(H: number, t: number, assemblyType: AssemblyType, backType: BackType, backChannelDepth: number, isBaseWithRails: boolean): CalcResult {
  let val = H;
  let formula = 'H';
  const isRouted = backType === 'routed';
  const isSidesOut = assemblyType === 'sides_out';

  if (isRouted) {
    if (isSidesOut) {
      val = H - 2 * t + 2 * (backChannelDepth - 1);
      formula = 'H - 2t + 2*(k-1)';
    } else {
      val = H - 2 * t + 2 * (backChannelDepth - 1); // side goes on bottom
      formula = 'H - 2t + 2*(k-1)';
    }
  } else {
    // Çakma arkalık dolabın tüm arka yüzünü örter (baza bölgesi dahil); üstten ve alttan 2'şer mm eksik
    val = H - 2 * NAILED_BACK_EDGE;
    formula = `H - 2×${NAILED_BACK_EDGE}`;
  }

  return {
    value: roundDown05(val),
    trace: {
      formula,
      inputs: { H, t, assemblyType, backType, backChannelDepth, isBaseWithRails },
      ruleId: 'RULE_BACK_HEIGHT',
      description: isRouted ? 'Kanallı arkalık üst ve alt tablanın kanallarına girer.' : `Çakma arkalık dolabın dış yüksekliğinden üstten ve alttan ${NAILED_BACK_EDGE} mm eksik.`
    }
  };
}

export function calcInnerDepth(D: number, backChannelInset: number, backThickness: number): CalcResult {
  const val = D - backChannelInset - backThickness;
  return {
    value: roundDown05(val),
    trace: {
      formula: 'D - g - backThickness',
      inputs: { D, backChannelInset, backThickness },
      ruleId: 'RULE_INNER_DEPTH',
      description: 'İç derinlik = D − g (kanal uzaklığı) − arkalık kalınlığı.'
    }
  };
}

export function calcInnerWidth(W: number, t: number, assemblyType: AssemblyType): CalcResult {
  const val = W - 2 * t;
  return {
    value: roundDown05(val),
    trace: {
      formula: 'W - 2t',
      inputs: { W, t, assemblyType },
      ruleId: 'RULE_INNER_WIDTH',
      description: 'İç genişlik = W - 2t'
    }
  };
}
