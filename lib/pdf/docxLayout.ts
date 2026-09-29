// Pure layout inference for PDF→Word: page margins, paragraph alignment, indent and spacing from
// the geometry the PDF extraction already recorded. Without it every paragraph was flush-left with
// no indent and no spacing on a default-margin page, so centred titles, indented text and the
// vertical rhythm of the source were all lost. All values are in PDF points; bounds use the PDF
// convention (y grows upward, bounds.y is the bottom edge).
import type { IRBlock, IRPageIR, IRRect, IRFillRect, IRBoxRect } from '../client-pdf-docx';

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
  // On a page where everything is centred (a section title page) the "column" is just the
  // heaviest centred line, and a wider centred line starts left of it — measured against the
  // column it looked flush-left. A block that sticks out left of the column and is centred on the
  // PAGE is centred.
  // The same holds for blocks IN the column when the column itself is a narrow centred stack.
  const colCentred = Math.abs(col.left - (pageWidth - col.right)) <= 2 * ALIGN_TOLERANCE
    && col.right - col.left < 0.6 * (pageWidth - margins.left - margins.right);
  const pageGapR = pageWidth - (block.bounds.x + block.bounds.width);
  const centredOnPage = (block.bounds.x < col.left - ALIGN_TOLERANCE || colCentred)
    && block.bounds.x > 2 * ALIGN_TOLERANCE && pageGapR > 2 * ALIGN_TOLERANCE
    && Math.abs(block.bounds.x - pageGapR) <= ALIGN_TOLERANCE;
  if ((gapL > 2 * ALIGN_TOLERANCE && gapR > 2 * ALIGN_TOLERANCE && Math.abs(gapL - gapR) <= ALIGN_TOLERANCE) || centredOnPage) {
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

/**
 * Runs that come from different source lines are stored without the space that separated them
 * (a line end is a wrap, not a character), so a table cell or paragraph built from several lines
 * read "uzupełnianiekontroli" / "raportynadzór". Adds the missing space at each line change, but
 * not after a trailing hyphen (a hyphenated word wrap).
 */
export function separateLines<T extends { text: string; fontSize: number; position: { y: number } }>(runs: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i]!;
    const prev = runs[i - 1];
    const newLine = prev !== undefined && Math.abs(prev.position.y - r.position.y) > 0.6 * Math.max(prev.fontSize, r.fontSize);
    if (newLine && prev && r.text !== '' && !/\s$/.test(prev.text) && !/^\s/.test(r.text) && !/[-‐–]$/.test(prev.text)) {
      out.push({ ...r, text: ' ' + r.text });
    } else {
      out.push(r);
    }
  }
  return out;
}

/**
 * Blocks in top-to-bottom order. The IR lists tables before text (they are detected first) and
 * uses a different y origin for tables (top-origin) than for text/images (bottom-origin), so a
 * table always landed at the top of the Word document whatever its position on the page. Sorted by
 * the top edge in one convention; ties keep extraction order (stable).
 */
export function blocksInReadingOrder(blocks: IRBlock[], pageHeight: number): IRBlock[] {
  const top = (b: IRBlock): number => (b.kind === 'table' ? b.bounds.y : pageHeight - (b.bounds.y + b.bounds.height));
  return blocks.map((b, i) => ({ b, i, t: top(b) })).sort((p, q) => (p.t - q.t) || (p.i - q.i)).map((x) => x.b);
}

/**
 * Table-of-contents lines are drawn as "title ........ 12": the dots are a run of their own and
 * the page number a separate run pinned to the right edge. Written as text the dots wrap and the
 * numbers drift; Word models this as a right tab stop with a dot leader. Returns the runs before
 * and after the leader when the line has exactly that shape (something before it, a short page
 * number after it), otherwise null so ordinary lines are never touched.
 */
export function splitDotLeader<T extends { text: string }>(runs: T[]): { before: T[]; after: T[] } | null {
  for (let i = runs.length - 2; i >= 1; i--) {
    const t = runs[i]!.text;
    if (!/^[\s.·…]+$/.test(t) || t.replace(/[\s]/g, '').length < 4) continue;
    const before = runs.slice(0, i);
    const after = runs.slice(i + 1);
    if (!before.some((r) => r.text.trim() !== '')) return null;
    const number = after.map((r) => r.text).join('').trim();
    if (!/^(\d{1,4}|[ivxlcdm]{1,7})$/i.test(number)) return null;
    return { before, after };
  }
  return null;
}

/** The smallest stroked frame that fully contains the block (3 pt tolerance), if any. */
export function findBox(block: TextBlock, boxes: IRBoxRect[] | undefined): IRBoxRect | undefined {
  if (!boxes || boxes.length === 0) return undefined;
  const tol = 3;
  let best: IRBoxRect | undefined;
  for (const b of boxes) {
    if (block.bounds.x < b.x - tol || block.bounds.x + block.bounds.width > b.x + b.width + tol) continue;
    if (block.bounds.y < b.y - tol || block.bounds.y + block.bounds.height > b.y + b.height + tol) continue;
    if (!best || b.width * b.height < best.width * best.height) best = b;
  }
  return best;
}

/**
 * Some exporters (LibreOffice Impress) separate paragraphs with a blank line drawn as a lone " "
 * run on a line of its own; extraction keeps it inside the block, so Word got one endless
 * paragraph. Splits the runs at such blank lines (a blank run that sits on its own line, with text
 * before and after it); a space that is merely between two words on one line is not a separator.
 */
export function splitAtBlankLines<T extends { text: string; fontSize: number; position: { y: number } }>(runs: T[]): T[][] {
  const groups: T[][] = [];
  let current: T[] = [];
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i]!;
    if (r.text.trim() === '') {
      if (!current.some((c) => c.text.trim() !== '')) continue; // leading blank line of a paragraph
      const prev = runs[i - 1];
      const next = runs[i + 1];
      const own = (o: T | undefined) => !o || Math.abs(o.position.y - r.position.y) > 0.6 * Math.max(o.fontSize, r.fontSize);
      if (prev && next && own(prev) && own(next)) {
        if (current.some((c) => c.text.trim() !== '')) groups.push(current);
        current = [];
        continue;
      }
    }
    current.push(r);
  }
  while (current.length > 0 && current[current.length - 1]!.text.trim() === '') current.pop(); // trailing blank line
  if (current.length > 0) groups.push(current);
  return groups.length > 0 ? groups : [runs];
}
