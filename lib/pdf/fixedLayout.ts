// Fixed ("faithful") page layout for PDF → Word / OpenDocument.
//
// The flow engine (extractFormattedTextFromScaffolds + docxLayout) rebuilds a document as
// paragraphs, lists and tables. That is the right result for a report or a contract, and the wrong
// one for a designed page — a brochure, an offer, a slide: rounded cards, dashed rules, photos in
// a row, a price badge beside a list, text vertically centred against a two-line value. Guessing
// "structure" there produced a page-sized false table and lost every picture.
//
// This module does what layout-preserving converters do instead: the page's graphics become ONE
// picture behind the text (rendered by pdf.js with the text left out), and the text is put back on
// top of it, editable, exactly where it was.
//
// "Exactly where it was" is done with ordinary body text only — no text boxes, no frames:
//   - every visual line is a paragraph with an exact line height and an exact space before it,
//   - every piece of text on that line starts at a tab stop at its original x,
//   - text blocks that sit side by side with baselines that do not line up (a label centred
//     against two lines, a price next to five rows) go into a borderless layout table, one cell
//     per column, each cell laid out the same way (recursively).
// Text boxes would be the obvious tool, but Apache OpenOffice 4 does not draw DOCX text boxes or
// frames at all (measured: both render as nothing / as plain flowing text), while indents, tabs,
// exact line heights and tables behave the same in Word, LibreOffice and OpenOffice.
//
// The fonts of a designed PDF are almost never installed on the reader's machine, and a missing
// font is replaced by whatever the word processor likes (OpenOffice: a serif). So fonts are mapped
// to the three families every system has (Arial / Times New Roman / Courier New, or their metric
// twins), and each piece of text is fitted to its original width with character scaling and
// spacing computed from the real metrics of those families — a right-aligned value still ends
// where it ended, and text never runs into the next tab stop.
//
// Everything here is pure geometry; rendering the background and reading the PDF live in
// fixedLayoutPdf.ts, the writers in fixedLayoutDocx.ts / fixedLayoutOdt.ts.

import type { IRTextRun } from '../client-pdf-docx';
import { docxFontFamily } from '../client-pdf-docx';

// ---------------------------------------------------------------- model

export interface FixedRun {
  text: string;
  /** Font family written to the document (always one the reader has). */
  font: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  /** RRGGBB, upper case. */
  color: string;
  underline?: boolean;
  link?: string;
  /** Horizontal character scale in percent (100 = none). */
  scale: number;
  /** Extra space after every character, in twentieths of a point (may be negative). */
  spacingTw: number;
  /** Baseline shift in points, positive = up (superscripts, text a fraction off the row). */
  raise: number;
}

/** Text that starts at one x on a line and runs without a wide gap. */
export interface FixedSegment {
  /** Left edge, page coordinates (points from the page's left edge). */
  x: number;
  /** Original width in points. */
  width: number;
  runs: FixedRun[];
}

/** One visual line: segments left to right on a common baseline. */
export interface FixedLine {
  /** Baseline, points from the top of the page. */
  baseline: number;
  /** Largest font size on the line. */
  fontSize: number;
  segments: FixedSegment[];
}

/**
 * One paragraph: usually one line; several when consecutive lines form a block of running text
 * (same left edge, same size, even step) — then they are one paragraph with line breaks.
 */
export interface FixedTextBlock {
  kind: 'text';
  /** Space before the paragraph, points (from the end of whatever precedes it in its container). */
  before: number;
  /** Exact height of every line of the paragraph, points. */
  lineHeight: number;
  lines: FixedLine[];
}

/** Side-by-side columns whose lines do not share baselines: a borderless one-row table. */
export interface FixedColumnsBlock {
  kind: 'columns';
  /** Top of the table, points from the top of the page (it follows its predecessor directly). */
  top: number;
  /** Height the content needs, points. */
  height: number;
  columns: FixedColumn[];
}

export interface FixedColumn {
  /** Left edge of the cell, page coordinates. */
  x: number;
  width: number;
  blocks: FixedBlock[];
}

export type FixedBlock = FixedTextBlock | FixedColumnsBlock;

export interface FixedPageLayout {
  width: number;
  height: number;
  blocks: FixedBlock[];
  /** Runs that could not be placed as text (rotated, hopelessly overlapping): they stay in the picture. */
  unplaced: IRTextRun[];
}

// ---------------------------------------------------------------- constants

/** Height reserved at the top of every page for the paragraph that carries the background. */
export const FIXED_PAGE_HEAD_PT = 1;
/** Height of the empty paragraph that must follow a table (two tables in a row would merge). */
export const FIXED_AFTER_TABLE_PT = 1;
/**
 * Height kept free at the bottom of every page: the paragraph that closes a section (pages of
 * another size follow) is 1 pt high and must still fit under the last line.
 */
export const FIXED_PAGE_TAIL_PT = 1;
/** Part of the font size below the baseline that a line keeps free. */
const DESCENT = 0.22;
/** The same number for readers of a written document (fixedLayoutRead.ts). */
export const FIXED_DESCENT = DESCENT;
/** Part of the font size above the baseline that text occupies. */
const ASCENT = 0.8;
/** Natural line height as a multiple of the font size. */
const NATURAL = 1.2;
/** Smallest line height (multiple of the font size) text may be given; less is clipped by Word. */
const MIN_LINE = 0.98;
/** Never give a line less than this, whatever happens (then it is drawn, possibly clipped). */
const HARD_MIN_LINE = 0.62;
/** A horizontal gap wider than this many font sizes starts a new segment (a tab stop). */
const SEGMENT_GAP = 1.2;
/** A run reaching back more than this many font sizes into the text before it may be an overprint. */
const OVERPRINT = 0.15;
/** Narrowest vertical strip (points) accepted as the gap between two columns. */
const MIN_GUTTER = 4;
const MAX_DEPTH = 4;

// ---------------------------------------------------------------- fonts

export type FontClass = 'sans' | 'serif' | 'mono';

/** Families that are safe to name in a document: present on Windows, macOS and (as twins) Linux. */
const SYSTEM_FAMILIES: Record<string, string> = {
  'arial': 'Arial', 'times new roman': 'Times New Roman', 'courier new': 'Courier New',
  'verdana': 'Verdana', 'georgia': 'Georgia', 'tahoma': 'Tahoma', 'trebuchet ms': 'Trebuchet MS',
  // (Verdana, Tahoma, Trebuchet, Calibri and Cambria have no metric twin among this site's
  // fonts, so their text is written in its own family at its natural width — see METRIC_SOURCE.)
  'calibri': 'Calibri', 'cambria': 'Cambria', 'symbol': 'Symbol', 'wingdings': 'Wingdings',
};

const MONO_NAMES = /mono|courier|consol|menlo|typewriter|inconsolata|\bcode\b/i;
const SERIF_NAMES = /times|georgia|garamond|minion|palatino|bookman|cambria|merriweather|playfair|baskerville|caslon|didot|bodoni|century|charter|tinos|antiqua|roman|lora|crimson|cormorant|spectral|slab|\bserif\b|serif$/i;
const SANS_NAMES = /sans|grotesk|grotesque|gothic|helvet|arial|arimo|roboto|lato|inter\b|montserrat|poppins|nunito|ubuntu|gotham|futura|avenir|\bdin\b|frutiger|univers|myriad|verdana|tahoma|calibri|carlito|segoe|raleway|oswald|barlow|rubik|manrope|quicksand|proxima/i;

/** Sans, serif or monospace — from the font's name, else from the PDF's own descriptor flags. */
export function classifyFont(rawName: string, hint?: FontClass): FontClass {
  const name = rawName.replace(/^[A-Z]{6}\+/, '');
  if (MONO_NAMES.test(name)) return 'mono';
  if (SANS_NAMES.test(name)) return 'sans';
  if (SERIF_NAMES.test(name)) return 'serif';
  return hint ?? 'sans';
}

/** The family a run is written in: the PDF's own when every system has it, else its class's standard. */
export function fixedFontFamily(rawName: string, hint?: FontClass): string {
  const cleaned = (docxFontFamily(rawName) ?? '').toLowerCase();
  const system = SYSTEM_FAMILIES[cleaned];
  if (system) return system;
  const cls = classifyFont(rawName, hint);
  return cls === 'mono' ? 'Courier New' : cls === 'serif' ? 'Times New Roman' : 'Arial';
}

/** Width in points of `text` set in `family` at `fontSize`, or null when the metrics are unknown. */
export type MeasureText = (text: string, family: string, bold: boolean, italic: boolean, fontSize: number) => number | null;

// ---------------------------------------------------------------- runs → lines

interface PlacedRun {
  src: IRTextRun;
  x: number;
  baseline: number;
  width: number;
  run: FixedRun;
}

// Hebrew, Arabic and their presentation forms: a PDF holds such text in drawing order, and a word
// processor would run the bidirectional algorithm over it again and mirror it.
const RTL_TEXT = /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}]/u;
// Private-use characters are icon-font glyphs (and symbol fonts): meaningless in any other font.
const PRIVATE_USE = /\p{Co}/u;

/** Control characters (other than tab and line ends) and the replacement character. */
function hasUnprintable(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0xfffd || (c < 0x20 && c !== 9 && c !== 10 && c !== 13)) return true;
  }
  return false;
}

/**
 * Text that can be written as body text and still look right. Right-to-left script and icon
 * glyphs cannot — they are left in the page picture, where they are exactly as drawn.
 */
export function isPlaceableText(text: string): boolean {
  return !RTL_TEXT.test(text) && !PRIVATE_USE.test(text) && !hasUnprintable(text);
}

function sameFormat(a: FixedRun, b: FixedRun): boolean {
  return a.font === b.font && Math.abs(a.fontSize - b.fontSize) < 0.01 && a.bold === b.bold && a.italic === b.italic
    && a.color === b.color && !!a.underline === !!b.underline && a.link === b.link && Math.abs(a.raise - b.raise) < 0.01;
}

function hexColor(c: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(c ?? '');
  return m ? m[1]!.toUpperCase() : '000000';
}

/**
 * Lines of a page from its text runs. Rotated runs cannot be body text and are returned as
 * unplaced; whitespace-only runs are dropped (their gap is what separates the text around them).
 */
export function buildFixedLines(
  runs: IRTextRun[],
  pageHeight: number,
  fontHint?: (fontName: string) => FontClass | undefined,
): { lines: FixedLine[]; unplaced: IRTextRun[]; sources: Map<FixedSegment, IRTextRun[]> } {
  const unplaced: IRTextRun[] = [];
  const placed: PlacedRun[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    if (Math.abs(r.rotation ?? 0) > 1 || !(r.fontSize > 0.5) || !isPlaceableText(r.text)) { if (r.text.trim()) unplaced.push(r); continue; }
    placed.push({
      src: r,
      x: r.position.x,
      baseline: pageHeight - r.position.y,
      width: r.width,
      run: {
        text: r.text,
        font: fixedFontFamily(r.fontName, fontHint?.(r.fontName)),
        fontSize: r.fontSize,
        bold: r.bold,
        italic: r.italic,
        color: hexColor(r.color),
        ...(r.underline ? { underline: true } : {}),
        ...(r.link ? { link: r.link } : {}),
        scale: 100,
        spacingTw: 0,
        raise: 0,
      },
    });
  }

  // Rows: runs whose baselines agree within a tenth of the smaller font size.
  placed.sort((a, b) => a.baseline - b.baseline || a.x - b.x);
  const rows: PlacedRun[][] = [];
  for (const p of placed) {
    const row = rows[rows.length - 1];
    const ref = row?.[0];
    if (row && ref && Math.abs(p.baseline - ref.baseline) <= Math.max(0.35, 0.1 * Math.min(p.run.fontSize, ref.run.fontSize))) row.push(p);
    else rows.push([p]);
  }

  const sources = new Map<FixedSegment, IRTextRun[]>();
  const lines: FixedLine[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    // The row's baseline is that of its largest text; the rest is raised or lowered onto it.
    const inked = row.filter((p) => p.run.text.trim());
    if (inked.length === 0) continue;
    const lead = inked.reduce((m, p) => (p.run.fontSize > m.run.fontSize ? p : m), inked[0]!);
    const segments: FixedSegment[] = [];
    let cur: { seg: FixedSegment; end: number; src: IRTextRun[] } | null = null;
    for (const p of row) {
      const size = Math.max(p.run.fontSize, cur?.seg.runs[cur.seg.runs.length - 1]?.fontSize ?? 0);
      const gap = cur ? p.x - cur.end : 0;
      if (!p.run.text.trim()) {
        // A run of spaces is not text of its own: it is the space after what precedes it.
        if (cur && gap <= SEGMENT_GAP * size) {
          const prev = cur.seg.runs[cur.seg.runs.length - 1]!;
          if (!/\s$/.test(prev.text)) prev.text += ' ';
          cur.end = Math.max(cur.end, p.x + p.width);
          cur.seg.width = cur.end - cur.seg.x;
          cur.src.push(p.src);
        }
        continue;
      }
      // Text printed over text: a run that starts well inside what is already on the line (a
      // second copy of a footer with another year, a drawn shadow). Two texts cannot share a
      // place as body text — interleaved by x they read "SekretyHandlSekretyHandluu" — so the
      // first stays text and the one printed over it stays in the page picture.
      // (Kerning also overlaps, by a tenth of the font size at most; an overprinted run overlaps
      // by half of itself.)
      const overlap = cur ? cur.end - p.x : 0;
      if (cur && overlap > OVERPRINT * size && overlap >= 0.5 * Math.min(p.width, cur.end - cur.seg.x)) {
        unplaced.push(p.src);
        continue;
      }
      const shift = lead.baseline - p.baseline;
      if (Math.abs(shift) >= 1) p.run.raise = shift;
      if (cur && gap <= SEGMENT_GAP * size) {
        const prev = cur.seg.runs[cur.seg.runs.length - 1]!;
        if (gap > 0.15 * size && !/\s$/.test(prev.text) && !/^\s/.test(p.run.text)) prev.text += ' ';
        // Many producers (Chrome) draw one glyph per operator: text in one format is one run.
        if (sameFormat(prev, p.run)) prev.text += p.run.text;
        else cur.seg.runs.push(p.run);
        cur.end = Math.max(cur.end, p.x + p.width);
        cur.seg.width = cur.end - cur.seg.x;
        cur.src.push(p.src);
      } else {
        const seg: FixedSegment = { x: p.x, width: p.width, runs: [p.run] };
        cur = { seg, end: p.x + p.width, src: [p.src] };
        segments.push(seg);
        sources.set(seg, cur.src);
      }
    }
    if (segments.length > 0) lines.push({ baseline: lead.baseline, fontSize: lead.run.fontSize, segments });
  }
  return { lines, unplaced, sources };
}

// ---------------------------------------------------------------- fitting widths

/** Index just after the last space at or before `index` in `text` (never 0), or -1 without one. */
function wordBoundaryBefore(text: string, index: number): number {
  for (let i = Math.min(index, text.length - 1); i > 0; i--) {
    if (text[i - 1] === ' ' && text[i] !== ' ') return i;
  }
  return -1;
}

function segmentChars(seg: FixedSegment): number {
  return seg.runs.reduce((n, r) => n + r.text.length, 0);
}

/**
 * Make a segment as wide as it was in the PDF: a character scale (whole percent) for a large
 * difference, character spacing (twentieths of a point) for the rest. The spacing is spread so
 * the total is right to a twentieth of a point: the first characters get one unit more, which
 * means splitting a run in two. The result is never wider than the original (it must not reach
 * the next tab stop).
 */
export function fitSegmentWidth(seg: FixedSegment, measure: MeasureText): void {
  // A trailing space would be fitted too and then push nothing; drop it.
  const last = seg.runs[seg.runs.length - 1];
  if (last && seg.runs.length > 0) {
    const trimmed = last.text.replace(/\s+$/, '');
    if (trimmed.length > 0 && trimmed.length < last.text.length) {
      const w = measure(last.text.slice(trimmed.length), last.font, last.bold, last.italic, last.fontSize);
      // The original width included that space; take the same share off the target.
      if (w !== null) seg.width = Math.max(0, seg.width - w);
      last.text = trimmed;
    }
  }
  let natural = 0;
  for (const r of seg.runs) {
    const w = measure(r.text, r.font, r.bold, r.italic, r.fontSize);
    if (w === null) return;
    natural += w;
  }
  const chars = segmentChars(seg);
  if (natural <= 0 || chars === 0 || seg.width <= 0) return;
  const target = Math.max(0, seg.width - 0.3);
  const ratio = target / natural;
  let scale = 100;
  if (ratio < 0.97 || ratio > 1.03) scale = Math.min(200, Math.max(50, Math.floor(ratio * 100)));
  const scaled = natural * scale / 100;
  // Spacing counts for every character but is not wanted after the last one; n-1 gaps.
  const gaps = Math.max(1, chars - 1);
  const totalTw = Math.floor((target - scaled) * 20);
  const base = Math.floor(totalTw / gaps);
  let extra = totalTw - base * gaps;
  const out: FixedRun[] = [];
  for (const r of seg.runs) {
    r.scale = scale;
    if (extra > 0 && extra < r.text.length) {
      // The run is split where the extra unit runs out — but only between words: a run boundary
      // inside a word is harmless to a word processor and a nuisance to everything that reads
      // the file as text. The split moves back to the previous space (never forward: the text
      // must not get wider), which costs at most one word's worth of twentieths of a point.
      const cut = wordBoundaryBefore(r.text, extra);
      if (cut > 0) {
        out.push({ ...r, text: r.text.slice(0, cut), spacingTw: base + 1 });
        out.push({ ...r, text: r.text.slice(cut), spacingTw: base });
      } else {
        out.push({ ...r, spacingTw: base });
      }
      extra = 0;
    } else if (extra > 0) {
      out.push({ ...r, spacingTw: base + 1 });
      extra -= r.text.length;
    } else {
      out.push({ ...r, spacingTw: base });
    }
  }
  seg.runs = out;
}

// ---------------------------------------------------------------- vertical layout

const boxTop = (l: FixedLine): number => l.baseline - ASCENT * l.fontSize;
const boxBottom = (l: FixedLine): number => l.baseline + DESCENT * l.fontSize;

/** Room a line has when it follows `prev` directly: the tallest exact line height it could get. */
function roomAfter(prev: FixedLine | null, line: FixedLine, floor: number): number {
  const from = prev ? Math.max(floor, boxBottom(prev)) : floor;
  return boxBottom(line) - from;
}

/** Can these lines (sorted by baseline) simply be stacked as paragraphs? */
function stackable(lines: FixedLine[], floor: number): boolean {
  let prev: FixedLine | null = null;
  for (const l of lines) {
    if (roomAfter(prev, l, floor) < MIN_LINE * l.fontSize - 0.01) return false;
    prev = l;
  }
  return true;
}

function lineLeft(l: FixedLine): number {
  return l.segments[0]!.x;
}
/** Vertical strips no text touches, wide enough to separate columns: the columns' x ranges. */
function splitColumns(segs: Array<{ seg: FixedSegment; line: FixedLine }>): Array<Array<{ seg: FixedSegment; line: FixedLine }>> {
  const sorted = [...segs].sort((a, b) => a.seg.x - b.seg.x);
  const cols: Array<Array<{ seg: FixedSegment; line: FixedLine }>> = [];
  let end = -Infinity;
  for (const s of sorted) {
    if (cols.length === 0 || s.seg.x - end >= MIN_GUTTER) cols.push([s]);
    else cols[cols.length - 1]!.push(s);
    end = Math.max(end, s.seg.x + s.seg.width);
  }
  return cols;
}

/** Segments back into lines (same baseline = same line), sorted top to bottom. */
function regroupLines(segs: Array<{ seg: FixedSegment; line: FixedLine }>): FixedLine[] {
  const byLine = new Map<FixedLine, FixedSegment[]>();
  for (const s of segs) {
    const list = byLine.get(s.line);
    if (list) list.push(s.seg);
    else byLine.set(s.line, [s.seg]);
  }
  const out: FixedLine[] = [];
  for (const [line, list] of byLine) {
    list.sort((a, b) => a.x - b.x);
    const fontSize = list.reduce((m, s) => Math.max(m, ...s.runs.map((r) => r.fontSize)), 0);
    out.push({ baseline: line.baseline, fontSize: fontSize || line.fontSize, segments: list });
  }
  return out.sort((a, b) => a.baseline - b.baseline);
}

interface LayoutState {
  unplacedSegments: FixedSegment[];
}

/**
 * Lines that overlap and cannot be told apart by columns (a superscript, text printed over text):
 * keep the lines carrying the most text, hang short neighbours on them as raised/lowered runs,
 * and give up on the rest (they stay in the page picture).
 */
function resolveOverlap(lines: FixedLine[], state: LayoutState): FixedLine[] {
  const weight = (l: FixedLine): number => l.segments.reduce((n, s) => n + segmentChars(s), 0) * l.fontSize;
  const order = [...lines].sort((a, b) => weight(b) - weight(a));
  const kept: FixedLine[] = [];
  const rejected: FixedLine[] = [];
  for (const l of order) {
    const trial = [...kept, l].sort((a, b) => a.baseline - b.baseline);
    if (stackable(trial, -Infinity)) kept.push(l);
    else rejected.push(l);
  }
  kept.sort((a, b) => a.baseline - b.baseline);
  for (const l of rejected) {
    const host = kept.reduce<FixedLine | null>((m, k) => (!m || Math.abs(k.baseline - l.baseline) < Math.abs(m.baseline - l.baseline) ? k : m), null);
    const shift = host ? host.baseline - l.baseline : Infinity;
    const clear = host ? l.segments.every((s) => host.segments.every((h) => s.x >= h.x + h.width - 0.5 || s.x + s.width <= h.x + 0.5)) : false;
    if (host && clear && Math.abs(shift) <= 0.7 * host.fontSize) {
      for (const s of l.segments) {
        for (const r of s.runs) r.raise += shift;
        host.segments.push(s);
      }
      host.segments.sort((a, b) => a.x - b.x);
    } else {
      state.unplacedSegments.push(...l.segments);
    }
  }
  return kept;
}

/** Stack lines as paragraphs starting at `cursor`; returns the blocks and where they end. */
function stackLines(lines: FixedLine[], cursor: number, limit: number): { blocks: FixedTextBlock[]; cursor: number } {
  const blocks: FixedTextBlock[] = [];
  let y = cursor;
  for (const l of lines) {
    // Never past the bottom of the container: a line that did would spill onto a new page.
    const bottom = Math.min(boxBottom(l), limit);
    const room = bottom - y;
    const height = Math.max(Math.min(NATURAL * l.fontSize, room), HARD_MIN_LINE * l.fontSize);
    const before = Math.max(0, room - height);
    blocks.push({ kind: 'text', before, lineHeight: height, lines: [l] });
    y += before + height;
  }
  return { blocks, cursor: y };
}

/**
 * Consecutive single-segment paragraphs that are lines of one block of running text — same left
 * edge, same size and colour, an even step no tighter than the font — become one paragraph with
 * line breaks, so the block can be selected, restyled and copied as a paragraph.
 */
function mergeRunningText(blocks: FixedTextBlock[]): FixedTextBlock[] {
  const out: FixedTextBlock[] = [];
  const single = (b: FixedTextBlock): FixedLine | null => (b.lines.length >= 1 && b.lines.every((l) => l.segments.length === 1) ? b.lines[b.lines.length - 1]! : null);
  for (const b of blocks) {
    const prev = out[out.length - 1];
    const pl = prev ? single(prev) : null;
    const bl = b.lines.length === 1 ? single(b) : null;
    if (prev && pl && bl) {
      const step = bl.baseline - pl.baseline;
      const prevStep = prev.lines.length > 1 ? prev.lines[prev.lines.length - 1]!.baseline - prev.lines[prev.lines.length - 2]!.baseline : step;
      const sameLeft = Math.abs(lineLeft(bl) - lineLeft(prev.lines[0]!)) <= 1;
      const sameSize = Math.abs(bl.fontSize - pl.fontSize) <= 0.3;
      const even = Math.abs(step - prevStep) <= 0.4 && step >= MIN_LINE * bl.fontSize && step <= 1.8 * bl.fontSize;
      // The first line's own height becomes the step too; it may only grow into its free space.
      const first = prev.lines.length === 1 ? prev.before + prev.lineHeight - step : 0;
      if (sameLeft && sameSize && even && first >= -0.01 && Math.abs(b.before + b.lineHeight - step) <= 0.05) {
        if (prev.lines.length === 1) { prev.before = Math.max(0, first); prev.lineHeight = step; }
        prev.lines.push(bl);
        continue;
      }
    }
    out.push(b);
  }
  return out;
}

/**
 * Lay out the lines of one container (a page or a table cell). `cursor` is where the container's
 * free space starts and `limit` where it ends, both in points from the top of the page.
 */
function layoutContainer(lines: FixedLine[], cursor: number, limit: number, depth: number, state: LayoutState): { blocks: FixedBlock[]; cursor: number } {
  const sorted = [...lines].sort((a, b) => boxTop(a) - boxTop(b) || a.baseline - b.baseline);
  // Groups of lines whose boxes overlap vertically (transitively).
  const groups: FixedLine[][] = [];
  let groupBottom = -Infinity;
  for (const l of sorted) {
    if (groups.length > 0 && boxTop(l) < groupBottom - 0.01) {
      groups[groups.length - 1]!.push(l);
      groupBottom = Math.max(groupBottom, boxBottom(l));
    } else {
      groups.push([l]);
      groupBottom = boxBottom(l);
    }
  }

  const blocks: FixedBlock[] = [];
  let y = cursor;
  let pendingText: FixedLine[] = [];
  const flushText = (): void => {
    if (pendingText.length === 0) return;
    const res = stackLines(pendingText, y, limit);
    blocks.push(...mergeRunningText(res.blocks));
    y = res.cursor;
    pendingText = [];
  };

  for (const group of groups) {
    const byBaseline = [...group].sort((a, b) => a.baseline - b.baseline);
    // Only conflicts INSIDE the group matter here; a line squeezed by what precedes it (the
    // paragraph after a table) is simply given a little less height by stackLines.
    if (stackable(byBaseline, -Infinity)) { pendingText.push(...byBaseline); continue; }

    const segs = byBaseline.flatMap((line) => line.segments.map((seg) => ({ seg, line })));
    const cols = depth < MAX_DEPTH ? splitColumns(segs) : [segs];
    if (cols.length < 2) {
      pendingText.push(...resolveOverlap(byBaseline, state));
      continue;
    }
    flushText();
    const top = y;
    const columns: FixedColumn[] = [];
    let bottom = top;
    for (let i = 0; i < cols.length; i++) {
      const colLines = regroupLines(cols[i]!);
      // The 1 pt paragraph that follows the table has to fit under it as well.
      const res = layoutContainer(colLines, top, limit - FIXED_AFTER_TABLE_PT, depth + 1, state);
      const x = Math.min(...cols[i]!.map((s) => s.seg.x));
      columns.push({ x, width: 0, blocks: res.blocks });
      bottom = Math.max(bottom, res.cursor);
    }
    blocks.push({ kind: 'columns', top, height: bottom - top, columns });
    y = bottom + FIXED_AFTER_TABLE_PT;
  }
  flushText();
  return { blocks, cursor: y };
}

/** Cell edges: a column's cell starts a little left of its text and ends where the next begins. */
function sizeColumns(blocks: FixedBlock[], left: number, right: number): void {
  for (const b of blocks) {
    if (b.kind !== 'columns') continue;
    const starts = b.columns.map((c, i) => (i === 0 ? left : Math.max(left, c.x - 1)));
    b.columns.forEach((c, i) => {
      const x0 = starts[i]!;
      const x1 = i + 1 < starts.length ? starts[i + 1]! : right;
      c.x = x0;
      c.width = Math.max(1, x1 - x0);
      sizeColumns(c.blocks, x0, x1);
    });
  }
}

export interface FixedLayoutOptions {
  /** Left edge of the text area (the page's left margin), points. */
  left?: number;
  measure?: MeasureText;
  fontHint?: (fontName: string) => FontClass | undefined;
}

/** The fixed layout of one page from its text runs. */
export function buildFixedPageLayout(runs: IRTextRun[], pageWidth: number, pageHeight: number, opts: FixedLayoutOptions = {}): FixedPageLayout {
  const { lines, unplaced, sources } = buildFixedLines(runs, pageHeight, opts.fontHint);
  const state: LayoutState = { unplacedSegments: [] };
  const { blocks } = layoutContainer(lines, FIXED_PAGE_HEAD_PT, pageHeight - 0.5 - FIXED_PAGE_TAIL_PT, 0, state);
  sizeColumns(blocks, opts.left ?? 0, pageWidth);
  for (const seg of state.unplacedSegments) unplaced.push(...(sources.get(seg) ?? []));
  if (opts.measure) {
    const fit = (list: FixedBlock[]): void => {
      for (const b of list) {
        if (b.kind === 'text') for (const l of b.lines) for (const s of l.segments) fitSegmentWidth(s, opts.measure!);
        else for (const c of b.columns) fit(c.blocks);
      }
    };
    fit(blocks);
  }
  return { width: pageWidth, height: pageHeight, blocks, unplaced };
}

/** All text of a layout in reading order (lines top to bottom, columns left to right). */
export function fixedLayoutText(layout: FixedPageLayout): string {
  const out: string[] = [];
  const walk = (list: FixedBlock[]): void => {
    for (const b of list) {
      if (b.kind === 'text') for (const l of b.lines) out.push(l.segments.map((s) => s.runs.map((r) => r.text).join('')).join('\t'));
      else for (const c of b.columns) walk(c.blocks);
    }
  };
  walk(layout.blocks);
  return out.join('\n');
}

