// Text frames for the faithful layout in OpenDocument: every block of text of a page as a frame
// of its own, anchored at its place.
//
// Why only OpenDocument: Apache OpenOffice does not draw text boxes from a .docx at all (VML and
// DrawingML ones were both tried), so the Word writer keeps its paragraphs positioned by spacing
// (fixedLayoutDocx.ts). In its own format the same OpenOffice draws frames exactly where they
// are put — measured, see below — and a frame is the better object for a designed page: it can
// be moved or deleted on its own, text typed into it wraps inside it, and it never pushes the
// rest of the page down.
//
// Which kind of frame (measured in Apache OpenOffice 4 on hand-made .odt files, reading the PDF
// it exports and the .odt it saves again):
//   - a <draw:frame><draw:text-box> whose graphic style has NO parent is imported as a DRAWING
//     shape (saved again as "gr…"): it is painted with the drawing layer's default light-blue
//     fill and black outline whatever fo:background-color and fo:border say, a hyperlink written
//     as <text:a><text:span>…</text:span></text:a> loses its text, and a fixed line height or a
//     letter spacing given as a length comes out 1.764 times too large;
//   - the same element whose style has the parent "Frame" (a graphic style that has to exist in
//     styles.xml) is a real Writer text frame (saved again as "fr…"): transparent, no outline,
//     hyperlinks keep their text, fixed line heights and letter spacing are honoured exactly as
//     in body text. That is what is written.
//
// What a Writer frame does with its text:
//   - the frame's left edge is the text's left edge, to a tenth of a point;
//   - with a FIXED line height every line is exactly that high and its baseline lies four fifths
//     of the height below the line's top, whatever the fonts on the line (a 20 pt line at
//     y = 160 pt has its baselines at 176 and 196 pt). Writer's own rule: ascent = 4/5 of the
//     height, in whole twentieths of a point;
//   - a frame does not grow sideways with its text: too narrow a frame wraps a single line.
//     Single lines therefore get all the room up to the next text on their row or the edge of
//     the page.
//
// Running text becomes a real paragraph the word processor wraps itself ("soft") when that is
// provably the same as the PDF's own line breaks: wrapping the words into the frame's width with
// the metrics of the written font must give exactly the PDF's lines, and still give them when
// every width is 1.5 % larger or smaller (the written fonts were measured against OpenOffice to
// a quarter of a percent). Otherwise the lines are kept as they are, with line breaks ("hard").

import type { FixedBlock, FixedLine, FixedPageLayout, FixedRun, MeasureText } from './fixedLayout';

export interface FixedFrame {
  /** Top-left corner and width, points from the page's top-left corner. */
  x: number;
  y: number;
  width: number;
  /** Exact height of every line, points (a whole number of twentieths). */
  lineHeight: number;
  align: 'start' | 'justify';
  /** 'hard': the PDF's lines, kept with line breaks. 'soft': one paragraph, wrapped by the reader's word processor. */
  wrap: 'hard' | 'soft';
  /** The text line by line as the PDF has it, fitted to the PDF's widths. */
  lines: FixedRun[][];
}

/** Line height of a frame that holds a single line, as a share of its largest font size: room for every ascender and descender. */
const SINGLE_LINE_HEIGHT = 1.3;
/** Slack to the right of a frame's longest line, so that small metric differences never wrap it. */
const WIDTH_SLACK_SHARE = 0.04;
const WIDTH_SLACK_MIN_PT = 4;
/** Soft wrapping must survive every width being this much larger or smaller. */
const SOFT_TOLERANCE = 0.015;
/** Fewer lines than this are not worth a paragraph of their own rules. */
const SOFT_MIN_LINES = 2;
/** Lines of justified text end within this of one another. */
const JUSTIFY_EDGE_PT = 1.5;

/** A line height as a word processor stores it: whole twentieths of a point. */
export function frameLineHeight(points: number): number {
  return Math.max(1, Math.round(points * 20)) / 20;
}

/** From the top of a line of fixed height down to its baseline: four fifths, in whole twentieths of a point. */
export function frameAscent(lineHeight: number): number {
  return Math.floor(4 * Math.round(lineHeight * 20) / 5) / 20;
}

/** Where the baselines of `count` lines fall in a frame at `y` whose lines are `lineHeight` high. */
export function frameBaselines(y: number, lineHeight: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(y + i * lineHeight + frameAscent(lineHeight));
  return out;
}

const sameFormat = (a: FixedRun, b: FixedRun): boolean =>
  a.font === b.font && a.fontSize === b.fontSize && a.bold === b.bold && a.italic === b.italic && a.color === b.color
  && !!a.underline === !!b.underline && a.link === b.link && a.scale === b.scale && a.spacingTw === b.spacingTw && a.raise === b.raise;

function mergeRuns(runs: FixedRun[]): FixedRun[] {
  const out: FixedRun[] = [];
  for (const r of runs) {
    const prev = out[out.length - 1];
    if (prev && sameFormat(prev, r)) prev.text += r.text;
    else out.push({ ...r });
  }
  return out;
}

/** Width of runs as the written font draws them (scale and letter spacing included); null = unknown. */
export function runsWidth(runs: FixedRun[], measure: MeasureText): number | null {
  let width = 0;
  for (const r of runs) {
    if (!r.text) continue;
    const w = measure(r.text, r.font, r.bold, r.italic, r.fontSize);
    if (w === null) return null;
    width += w * r.scale / 100 + [...r.text].length * r.spacingTw / 20;
  }
  return width;
}

interface Piece { run: FixedRun; text: string }
interface Word { pieces: Piece[]; spaceBefore: Piece[] }

/** A paragraph's runs as words (a word may cross runs) with the spaces before each. */
function words(runs: FixedRun[]): Word[] {
  const out: Word[] = [];
  let space: Piece[] = [];
  let cur: Word | null = null;
  for (const run of runs) {
    for (const part of run.text.split(/( +)/)) {
      if (!part) continue;
      if (part[0] === ' ') {
        cur = null;
        space.push({ run, text: part });
      } else {
        if (!cur) { cur = { pieces: [], spaceBefore: space }; space = []; out.push(cur); }
        cur.pieces.push({ run, text: part });
      }
    }
  }
  return out;
}

const piecesWidth = (pieces: Piece[], measure: MeasureText): number | null => runsWidth(pieces.map((p) => ({ ...p.run, text: p.text })), measure);

/**
 * Greedy line breaking, as a word processor does it: words go on a line while they fit into
 * `width`; the spaces at a break belong to neither line. `stretch` scales every width (for the
 * stability test). Null when a width is unknown.
 */
export function wrapRuns(runs: FixedRun[], width: number, measure: MeasureText, stretch = 1): FixedRun[][] | null {
  const lines: Piece[][] = [[]];
  let used = 0;
  for (const word of words(runs)) {
    const w = piecesWidth(word.pieces, measure);
    const s = piecesWidth(word.spaceBefore, measure);
    if (w === null || s === null) return null;
    const line = lines[lines.length - 1]!;
    if (line.length > 0 && (used + s + w) * stretch > width) {
      lines.push([...word.pieces]);
      used = w;
    } else {
      if (line.length > 0) line.push(...word.spaceBefore);
      line.push(...word.pieces);
      used += (line.length > word.pieces.length ? s : 0) + w;
    }
  }
  return lines.filter((l) => l.length > 0).map((l) => mergeRuns(l.map((p) => ({ ...p.run, text: p.text }))));
}

const lineText = (runs: FixedRun[]): string => runs.map((r) => r.text).join('').replace(/ +/g, ' ').trim();

/** Words a word processor might break inside (after a hyphen, a slash…): their lines stay hard. */
const BREAKABLE_INSIDE = /[^\s][\p{Pd}/\\|][^\s]/u;
/** A line that ends in a hyphen attached to its word is a hyphenated word: it cannot be re-wrapped. */
const HYPHENATED_END = /[^\s]\p{Pd}$/u;
const SOFT_HYPHEN = String.fromCharCode(0xad);

const trimEnd = (runs: FixedRun[]): FixedRun[] =>
  runs.map((r, k, all) => (k === all.length - 1 ? { ...r, text: r.text.replace(/ +$/, '') } : r));

/**
 * The block as one paragraph, if wrapping it reproduces the PDF's lines robustly; null otherwise.
 */
function softParagraph(lines: FixedLine[], measure: MeasureText): { lines: FixedRun[][]; width: number; align: 'start' | 'justify' } | null {
  if (lines.length < SOFT_MIN_LINES) return null;
  const texts = lines.map((l) => lineText(l.segments[0]!.runs));
  if (texts.some((t) => !t || BREAKABLE_INSIDE.test(t) || HYPHENATED_END.test(t) || t.endsWith(SOFT_HYPHEN))) return null;
  if (lines.some((l) => l.segments[0]!.runs.some((r) => r.raise !== 0))) return null;

  const actual = lines.map((l) => l.segments[0]!.width);
  const right = Math.max(...actual);
  const justified = lines.length >= 3 && actual.slice(0, -1).every((w) => right - w <= JUSTIFY_EDGE_PT);

  let perLine: FixedRun[][];
  if (justified) {
    // Justified text: the PDF stretched the spaces of every line by a different amount. One
    // character scale for the whole paragraph — the smallest ratio of any line, rounded down, so
    // that no line is wider than the frame — and the word processor stretches the spaces back.
    const ratios: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const natural = runsWidth(trimEnd(lines[i]!.segments[0]!.runs).map((r) => ({ ...r, scale: 100, spacingTw: 0 })), measure);
      if (natural === null || natural <= 0) return null;
      ratios.push(actual[i]! / natural);
    }
    const scale = Math.max(50, Math.min(200, Math.floor(Math.min(...ratios) * 100)));
    perLine = lines.map((l) => l.segments[0]!.runs.map((r) => ({ ...r, scale, spacingTw: 0 })));
  } else {
    // Ragged text: every line keeps the fit to its own width in the PDF that the layout gave it
    // (the written font is not the PDF's; one scale for all lines left some up to 17 pt short).
    perLine = lines.map((l) => l.segments[0]!.runs.map((r) => ({ ...r })));
  }
  const merged = softParagraphRuns(perLine);

  // The frame must be wide enough for its longest line and too narrow for any line plus the
  // word that follows it — with room to spare on both sides.
  let longest = 0;
  let shortestOverflow = Infinity;
  for (let i = 0; i < perLine.length; i++) {
    const trimmed = runsWidth(trimEnd(perLine[i]!), measure);
    if (trimmed === null) return null;
    longest = Math.max(longest, trimmed);
    const next = perLine[i + 1] ? words(perLine[i + 1]!)[0] : undefined;
    if (next) {
      const first = piecesWidth(next.pieces, measure);
      const space = runsWidth([{ ...perLine[i]![perLine[i]!.length - 1]!, text: ' ' }], measure);
      if (first === null || space === null) return null;
      shortestOverflow = Math.min(shortestOverflow, trimmed + space + first);
    }
  }
  const width = justified ? right : (longest + shortestOverflow) / 2;
  if (!(longest * (1 + SOFT_TOLERANCE) <= width) || !(shortestOverflow * (1 - SOFT_TOLERANCE) > width)) return null;

  for (const stretch of [1, 1 + SOFT_TOLERANCE, 1 - SOFT_TOLERANCE]) {
    const wrapped = wrapRuns(merged, width, measure, stretch);
    if (!wrapped || wrapped.length !== lines.length || wrapped.some((w, i) => lineText(w) !== texts[i])) return null;
  }
  return { lines: perLine, width, align: justified ? 'justify' : 'start' };
}

/** Every text block of a page as a frame, top to bottom as the layout lists them. */
export function buildPageFrames(layout: FixedPageLayout, measure?: MeasureText): FixedFrame[] {
  const frames: FixedFrame[] = [];
  const pageRight = layout.width - 0.5;
  const slack = (width: number): number => Math.max(WIDTH_SLACK_MIN_PT, width * WIDTH_SLACK_SHARE);
  const copy = (runs: FixedRun[]): FixedRun[] => runs.map((r) => ({ ...r }));

  const walk = (blocks: FixedBlock[]): void => {
    for (const b of blocks) {
      if (b.kind === 'columns') { for (const c of b.columns) walk(c.blocks); continue; }
      const first = b.lines[0]!;
      if (b.lines.length === 1) {
        // Each piece of the line is a frame of its own, with the room up to the next piece.
        const lineHeight = frameLineHeight(SINGLE_LINE_HEIGHT * first.fontSize);
        first.segments.forEach((seg, i) => {
          const rightLimit = first.segments[i + 1]?.x ?? pageRight;
          frames.push({
            x: seg.x, y: first.baseline - frameAscent(lineHeight), width: Math.max(first.fontSize, rightLimit - seg.x),
            lineHeight, align: 'start', wrap: 'hard', lines: [copy(seg.runs)],
          });
        });
        continue;
      }
      // Running text: lines of one size on an even step, starting at one left edge.
      const x = Math.min(...b.lines.map((l) => l.segments[0]!.x));
      const step = (b.lines[b.lines.length - 1]!.baseline - first.baseline) / (b.lines.length - 1);
      const lineHeight = frameLineHeight(step);
      const y = first.baseline - frameAscent(lineHeight);
      const soft = measure ? softParagraph(b.lines, measure) : null;
      if (soft) {
        frames.push({ x, y, width: Math.min(soft.width, pageRight - x), lineHeight, align: soft.align, wrap: 'soft', lines: soft.lines });
        continue;
      }
      const widest = Math.max(...b.lines.map((l) => l.segments[0]!.width));
      frames.push({ x, y, width: Math.min(widest + slack(widest), pageRight - x), lineHeight, align: 'start', wrap: 'hard', lines: b.lines.map((l) => copy(l.segments[0]!.runs)) });
    }
  };
  walk(layout.blocks);
  return frames;
}

/** A soft frame's text as the one paragraph that is written: its lines joined by single spaces. */
export function softParagraphRuns(lines: FixedRun[][]): FixedRun[] {
  const runs: FixedRun[] = [];
  lines.forEach((line, i) => {
    if (i > 0) {
      const last = runs[runs.length - 1];
      if (last && !last.text.endsWith(' ')) last.text += ' ';
    }
    for (const r of line) runs.push({ ...r });
  });
  return mergeRuns(runs);
}
