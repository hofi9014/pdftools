// Pure layout inference for PDF→Word: page margins, paragraph alignment, indent and spacing from
// the geometry the PDF extraction already recorded. Without it every paragraph was flush-left with
// no indent and no spacing on a default-margin page, so centred titles, indented text and the
// vertical rhythm of the source were all lost. All values are in PDF points; bounds use the PDF
// convention (y grows upward, bounds.y is the bottom edge).
import type { IRBlock, IRPageIR, IRRect, IRFillRect } from '../client-pdf-docx';

export interface PageMargins { left: number; right: number; top: number; bottom: number }
export interface PageColumn { left: number; right: number }
type TextBlock = IRBlock & { bounds: IRRect };

export interface ParagraphLayout {
  alignment: 'left' | 'center' | 'right';
  leftIndentPt: number;
  spacingBeforePt: number;
}

const MIN_MARGIN = 24;
const MAX_MARGIN = 120;
const ALIGN_TOLERANCE = 6;
const INDENT_THRESHOLD = 6;
const MAX_SPACING_BEFORE = 72;

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

export function isTextualBlock(b: IRBlock): b is TextBlock {
  if (b.kind === 'image') return false;
  const runs = (b as { runs?: Array<{ rotation: number }> }).runs;
  if (runs && runs.some((r) => Math.abs(r.rotation) > 1)) return false;
  return b.bounds.width > 0;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s.length === 0 ? 0 : s[Math.floor(s.length / 2)]!;
}

/**
 * The text column of one page: its dominant left edge (the x most text-height starts at) and the
 * widest right edge among blocks that start there. Titles centred on the page, footers and
 * indented items are measured against this, not against the page edge or other pages.
 */
export function inferPageColumn(page: IRPageIR): PageColumn | null {
  const blocks = page.blocks.filter(isTextualBlock);
  if (blocks.length === 0) return null;
  const weight = new Map<number, number>();
  for (const b of blocks) {
    const key = Math.round(b.bounds.x / 3) * 3;
    weight.set(key, (weight.get(key) ?? 0) + Math.max(b.bounds.height, 1));
  }
  let bestKey = 0, bestW = -1;
  for (const [k, w] of weight) if (w > bestW) { bestW = w; bestKey = k; }
  const aligned = blocks.filter((b) => Math.abs(b.bounds.x - bestKey) <= 4);
  const left = Math.min(...aligned.map((b) => b.bounds.x));
  const right = Math.max(...aligned.map((b) => b.bounds.x + b.bounds.width));
  return { left, right };
}

/** Document margins: the median text column across pages, so one odd page does not set them. */
export function inferMargins(pages: IRPageIR[]): PageMargins {
  const first = pages[0];
  const fallback = { left: 72, right: 72, top: 72, bottom: 72 };
  if (!first) return fallback;
  const cols = pages.map(inferPageColumn).filter((c): c is PageColumn => c !== null);
  if (cols.length === 0) return fallback;
  let minTopGap = Infinity, minBottom = Infinity;
  for (const p of pages) {
    for (const b of p.blocks) {
      if (!isTextualBlock(b)) continue;
      minTopGap = Math.min(minTopGap, p.height - (b.bounds.y + b.bounds.height));
      minBottom = Math.min(minBottom, b.bounds.y);
    }
  }
  return {
    left: clamp(median(cols.map((c) => c.left)), MIN_MARGIN, MAX_MARGIN),
    right: clamp(first.width - median(cols.map((c) => c.right)), MIN_MARGIN, MAX_MARGIN),
    top: clamp(minTopGap, MIN_MARGIN, MAX_MARGIN),
    bottom: clamp(minBottom, MIN_MARGIN, MAX_MARGIN),
  };
}

export function inferParagraphLayout(
  block: TextBlock,
  previous: TextBlock | undefined,
  column: PageColumn | null,
  margins: PageMargins,
  pageWidth: number,
): ParagraphLayout {
  const col = column ?? { left: margins.left, right: pageWidth - margins.right };
  const gapL = block.bounds.x - col.left;
  const gapR = col.right - (block.bounds.x + block.bounds.width);

  let alignment: ParagraphLayout['alignment'] = 'left';
  let leftIndentPt = 0;
  if (gapL > 2 * ALIGN_TOLERANCE && gapR > 2 * ALIGN_TOLERANCE && Math.abs(gapL - gapR) <= ALIGN_TOLERANCE) {
    alignment = 'center';
  } else if (gapR <= ALIGN_TOLERANCE && gapL > 30) {
    alignment = 'right';
  } else {
    const fromMargin = block.bounds.x - margins.left;
    if (fromMargin > INDENT_THRESHOLD) leftIndentPt = Math.min(fromMargin, (pageWidth - margins.left - margins.right) * 0.6);
  }

  let spacingBeforePt = 0;
  if (previous) {
    const gap = previous.bounds.y - (block.bounds.y + block.bounds.height);
    if (gap > 0) spacingBeforePt = Math.min(gap, MAX_SPACING_BEFORE);
  }
  return { alignment, leftIndentPt: Math.round(leftIndentPt * 10) / 10, spacingBeforePt: Math.round(spacingBeforePt * 10) / 10 };
}

/**
 * The smallest painted fill that fully contains the block's text (3 pt tolerance), as a hex
 * colour. Light text on a coloured band (white on orange, white on black) was written to Word
 * with no band at all, i.e. invisible white-on-white text.
 */
export function findBackgroundFill(block: TextBlock, fills: IRFillRect[] | undefined): string | undefined {
  if (!fills || fills.length === 0) return undefined;
  const tol = 3;
  let best: IRFillRect | undefined;
  for (const f of fills) {
    if (block.bounds.x < f.x - tol || block.bounds.x + block.bounds.width > f.x + f.width + tol) continue;
    if (block.bounds.y < f.y - tol || block.bounds.y + block.bounds.height > f.y + f.height + tol) continue;
    if (!best || f.width * f.height < best.width * best.height) best = f;
  }
  return best?.color;
}
