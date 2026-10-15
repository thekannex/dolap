import { roundDown05 } from '../utils/math';

export interface PlannedModule {
  x: number;
  width: number;
  type: 'cabinet' | 'filler' | 'appliance';
  name: string;
  locked: boolean;
}

export interface PlannerInput {
  effectiveWidth: number;
  standardWidths: number[];
  fixedModules: Array<{ x: number; width: number; name: string }>;
  minFillerWidth: number; // default 50
  maxFillerWidth: number; // default 150
}

export function planModules(input: PlannerInput): { modules: PlannedModule[]; totalFiller: number; warning?: string } {
  const { effectiveWidth, standardWidths, fixedModules, minFillerWidth, maxFillerWidth } = input;
  const sortedFixed = [...fixedModules].sort((a, b) => a.x - b.x);
  
  const modules: PlannedModule[] = [];
  let totalFiller = 0;
  let currentX = 0;
  
  const gaps: Array<{ startX: number; width: number }> = [];
  
  for (const fixed of sortedFixed) {
    if (fixed.x > currentX) {
      gaps.push({ startX: currentX, width: fixed.x - currentX });
    }
    modules.push({
      x: fixed.x,
      width: fixed.width,
      type: 'appliance',
      name: fixed.name,
      locked: true,
    });
    currentX = fixed.x + fixed.width;
  }
  
  if (currentX < effectiveWidth) {
    gaps.push({ startX: currentX, width: effectiveWidth - currentX });
  }
  
  let warning: string | undefined = undefined;

  for (const gap of gaps) {
    const gapWidth = roundDown05(gap.width);
    const dp = new Array(Math.ceil(gapWidth) + 1).fill(-1);
    dp[0] = 0;
    const choice = new Array(Math.ceil(gapWidth) + 1).fill(-1);

    for (let i = 0; i <= gapWidth; i++) {
      if (dp[i] !== -1) {
        for (const w of standardWidths) {
          if (i + w <= gapWidth) {
            if (dp[i + w] < dp[i] + w) {
              dp[i + w] = dp[i] + w;
              choice[i + w] = w;
            }
          }
        }
      }
    }

    let bestFill = 0;
    for (let i = Math.floor(gapWidth); i >= 0; i--) {
      if (dp[i] !== -1) {
        const rem = gapWidth - i;
        if (rem === 0 || (rem >= minFillerWidth && rem <= maxFillerWidth)) {
          bestFill = i;
          break;
        }
      }
    }

    if (bestFill === 0 && dp[Math.floor(gapWidth)] === -1) {
      for (let i = Math.floor(gapWidth); i >= 0; i--) {
        if (dp[i] !== -1) {
          bestFill = i;
          break;
        }
      }
    }

    let rem = gapWidth - bestFill;
    if (rem > 0 && rem < minFillerWidth && bestFill > 0) {
      warning = 'Kalan boşluk minimum dolgu genişliğinden küçük. Kabin genişlikleri ayarlanmalı.';
    } else if (rem > maxFillerWidth) {
      warning = 'Kalan boşluk maksimum dolgu genişliğinden büyük. Başka bir kabin modülü eklenebilir.';
    }

    let curr = bestFill;
    const widths: number[] = [];
    while (curr > 0) {
      const w = choice[curr];
      if (w === -1) break;
      widths.push(w);
      curr -= w;
    }
    widths.reverse();

    let gapX = gap.startX;
    for (const w of widths) {
      modules.push({ x: gapX, width: w, type: 'cabinet', name: `Kabin ${w}`, locked: false });
      gapX += w;
    }

    if (rem > 0) {
      modules.push({ x: gapX, width: rem, type: 'filler', name: 'Dolgu', locked: false });
      totalFiller += rem;
    }
  }

  return {
    modules: modules.sort((a, b) => a.x - b.x),
    totalFiller: roundDown05(totalFiller),
    warning,
  };
}
