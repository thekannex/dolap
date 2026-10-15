import { roundDown05 } from '../utils/rounding';

export interface CutPiece {
  id: string;
  length: number;  // mm
  width: number;   // mm
  quantity: number;
  materialId: string;
  grainDirection: 'length' | 'width' | 'none';
  label: string;
}

export interface SheetLayout {
  sheetIndex: number;
  sheetWidth: number;
  sheetHeight: number;
  placements: PiecePlacement[];
  wasteArea: number;
  usagePercent: number;
}

export interface PiecePlacement {
  pieceId: string;
  x: number;
  y: number;
  length: number;
  width: number;
  rotated: boolean;
  label: string;
}

export interface OptimizationResult {
  layouts: SheetLayout[];
  totalSheets: number;
  totalWastePercent: number;
  unplacedPieces: CutPiece[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type SortRule = (a: CutPiece, b: CutPiece) => number;
type SplitRule = 'shorter' | 'longer' | 'maxArea';
type FitRule = 'shortSide' | 'area';

const SORT_RULES: SortRule[] = [
  (a, b) => b.length * b.width - a.length * a.width,
  (a, b) => Math.max(b.length, b.width) - Math.max(a.length, a.width) || b.length * b.width - a.length * a.width,
  (a, b) => b.length - a.length || b.width - a.width,
  (a, b) => b.width - a.width || b.length - a.length,
  (a, b) => (b.length + b.width) - (a.length + a.width),
];
const SPLIT_RULES: SplitRule[] = ['shorter', 'longer', 'maxArea'];
const FIT_RULES: FitRule[] = ['shortSide', 'area'];

interface Strategy {
  sort: SortRule;
  split: SplitRule;
  fit: FitRule;
}

interface WorkingSheet {
  placements: PiecePlacement[];
  freeRects: Rect[];
}

/**
 * Giyotin (boydan boya kesim) kuralıyla parçaları plakalara yerleştirir.
 * Birkaç sıralama/bölme/yerleştirme stratejisini dener ve en az plaka kullanan sonucu seçer.
 * Her parça, açık plakaların ilkinde uygun boşluğa konur; hiçbirine sığmazsa yeni plaka açılır.
 */
export function optimizeCutting(
  pieces: CutPiece[],
  sheetWidth: number = 2800,
  sheetHeight: number = 2100,
  sawKerf: number = 4,
  edgeTrim: number = 10
): OptimizationResult {
  const expanded: CutPiece[] = [];
  for (const p of pieces) {
    for (let i = 0; i < p.quantity; i++) {
      expanded.push({ ...p, quantity: 1 });
    }
  }

  const usableWidth = sheetWidth - 2 * edgeTrim;
  const usableHeight = sheetHeight - 2 * edgeTrim;

  let best: { sheets: WorkingSheet[]; unplaced: CutPiece[] } | null = null;
  let bestScore: [number, number] = [Infinity, Infinity];

  for (const sort of SORT_RULES) {
    for (const split of SPLIT_RULES) {
      for (const fit of FIT_RULES) {
        const run = pack(expanded, { sort, split, fit }, usableWidth, usableHeight, sawKerf, edgeTrim);
        const lastUsed = run.sheets.length > 0 ? usedArea(run.sheets[run.sheets.length - 1]) : 0;
        const score: [number, number] = [run.sheets.length + run.unplaced.length * 1000, lastUsed];
        if (score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] < bestScore[1])) {
          best = run;
          bestScore = score;
        }
      }
    }
  }

  const sheets = best?.sheets ?? [];
  const sheetArea = sheetWidth * sheetHeight;
  const layouts: SheetLayout[] = sheets.map((s, i) => {
    const placed = usedArea(s);
    return {
      sheetIndex: i,
      sheetWidth,
      sheetHeight,
      placements: s.placements,
      wasteArea: sheetArea - placed,
      usagePercent: roundDown05(100 * (placed / sheetArea)),
    };
  });

  let totalWastePercent = 0;
  if (layouts.length > 0) {
    const totalPlaced = sheets.reduce((sum, s) => sum + usedArea(s), 0);
    totalWastePercent = roundDown05(100 * (1 - totalPlaced / (sheetArea * layouts.length)));
  }

  return {
    layouts,
    totalSheets: layouts.length,
    totalWastePercent,
    unplacedPieces: best?.unplaced ?? [],
  };
}

function usedArea(sheet: WorkingSheet): number {
  return sheet.placements.reduce((s, p) => s + p.length * p.width, 0);
}

function pack(
  pieces: CutPiece[],
  strategy: Strategy,
  usableWidth: number,
  usableHeight: number,
  kerf: number,
  edgeTrim: number,
): { sheets: WorkingSheet[]; unplaced: CutPiece[] } {
  const sorted = [...pieces].sort(strategy.sort);
  const sheets: WorkingSheet[] = [];
  const unplaced: CutPiece[] = [];

  const newSheet = (): WorkingSheet => {
    const s: WorkingSheet = { placements: [], freeRects: [{ x: edgeTrim, y: edgeTrim, w: usableWidth, h: usableHeight }] };
    sheets.push(s);
    return s;
  };

  for (const piece of sorted) {
    let placed = false;
    for (const sheet of sheets) {
      if (placeInSheet(sheet, piece, strategy, kerf)) { placed = true; break; }
    }
    if (!placed) {
      const sheet = newSheet();
      if (!placeInSheet(sheet, piece, strategy, kerf)) {
        sheets.pop();
        unplaced.push(piece);
      }
    }
  }
  return { sheets, unplaced };
}

function placeInSheet(sheet: WorkingSheet, piece: CutPiece, strategy: Strategy, kerf: number): boolean {
  const canNormal = piece.grainDirection === 'none' || piece.grainDirection === 'length';
  const canRotate = piece.grainDirection === 'none' || piece.grainDirection === 'width';

  let bestIdx = -1;
  let bestRotated = false;
  let bestScore = Infinity;
  let bestTie = Infinity;

  sheet.freeRects.forEach((fr, i) => {
    const consider = (pw: number, ph: number, rotated: boolean) => {
      if (fr.w < pw || fr.h < ph) return;
      const leftoverW = fr.w - pw;
      const leftoverH = fr.h - ph;
      const shortSide = Math.min(leftoverW, leftoverH);
      const score = strategy.fit === 'area' ? fr.w * fr.h - pw * ph : shortSide;
      const tie = strategy.fit === 'area' ? shortSide : Math.max(leftoverW, leftoverH);
      if (score < bestScore || (score === bestScore && tie < bestTie)) {
        bestScore = score;
        bestTie = tie;
        bestIdx = i;
        bestRotated = rotated;
      }
    };
    if (canNormal) consider(piece.length, piece.width, false);
    if (canRotate && piece.length !== piece.width) consider(piece.width, piece.length, true);
  });

  if (bestIdx === -1) return false;

  const fr = sheet.freeRects[bestIdx];
  const pw = bestRotated ? piece.width : piece.length;
  const ph = bestRotated ? piece.length : piece.width;

  sheet.placements.push({
    pieceId: piece.id,
    x: fr.x,
    y: fr.y,
    length: pw,
    width: ph,
    rotated: bestRotated,
    label: piece.label,
  });

  sheet.freeRects.splice(bestIdx, 1);

  const dw = fr.w - pw;
  const dh = fr.h - ph;
  const rightW = dw - kerf;
  const bottomH = dh - kerf;

  // Yatay bölme: alttaki artık tam genişlikte kalır. Dikey bölme: sağdaki artık tam yükseklikte kalır.
  let horizontal: boolean;
  if (strategy.split === 'shorter') {
    horizontal = dw < dh;
  } else if (strategy.split === 'longer') {
    horizontal = dw >= dh;
  } else {
    const hBig = Math.max(Math.max(0, rightW) * ph, fr.w * Math.max(0, bottomH));
    const vBig = Math.max(Math.max(0, rightW) * fr.h, pw * Math.max(0, bottomH));
    horizontal = hBig >= vBig;
  }

  if (horizontal) {
    if (rightW > 0) sheet.freeRects.push({ x: fr.x + pw + kerf, y: fr.y, w: rightW, h: ph });
    if (bottomH > 0) sheet.freeRects.push({ x: fr.x, y: fr.y + ph + kerf, w: fr.w, h: bottomH });
  } else {
    if (rightW > 0) sheet.freeRects.push({ x: fr.x + pw + kerf, y: fr.y, w: rightW, h: fr.h });
    if (bottomH > 0) sheet.freeRects.push({ x: fr.x, y: fr.y + ph + kerf, w: pw, h: bottomH });
  }
  return true;
}
