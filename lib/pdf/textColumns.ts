// Two-column page detection for PDF → Word/ODT/EPUB-style text extraction.
//
// The extraction groups runs into lines by their Y alone. On a page set in two columns the line
// of the left column and the line of the right column at the same height became ONE line
// ("…kiedy kupić,którym spotyka się…"), every such pair became its own paragraph, and the two
// columns came out interleaved — measured on a Chrome-made two-column article: 86 "paragraphs"
// for 22, with markers in the order ALFA1 BETA1 ALFA2 BETA2 …
//
// This module only DECIDES whether a page is two columns of running text and which runs belong
// where; the caller runs its normal grouping once per band, so a page that is not detected is
// processed exactly as before. The test is deliberately strict — a wrong split would reorder a
// page that used to read correctly:
//   - a column of lines starting at one common x in the middle part of the page (≥ 6 lines);
//   - a clear vertical gutter left of it that no line crosses within the column area;
//   - BOTH sides dense: the typical line fills at least half of its column. That is what
//     separates text columns from a key/value list ("Name:   John") or a table of contents
//     (titles left, page numbers right), which must keep reading row by row;
//   - the two sides stand side by side (their vertical extents overlap).
// Lines that do cross the gutter (a title over both columns, a footer) split the page into what
// is above the columns, the columns, and what is below.

export interface ColumnRun {
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  fontSize: number;
  rotation: number;
}

export interface TextColumnBox { x: number; width: number }

export interface TextColumnSplit<T> {
  /** [above the columns, left column, right column, below the columns] — every input run is in exactly one. */
  bands: [T[], T[], T[], T[]];
  columns: [TextColumnBox, TextColumnBox];
}

interface Segment { x0: number; x1: number; y: number; chars: number }

const MIN_LINES = 6;
const MIN_COLUMN_WIDTH = 90;
const MIN_COLUMN_CHARS = 150;
const EDGE_TOLERANCE = 3;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s.length === 0 ? 0 : s[Math.floor(s.length / 2)]!;
}

/** Runs → line segments: runs on one baseline, split wherever a gap wider than 1.5 em opens. */
function lineSegments(runs: ColumnRun[]): Segment[] {
  const sorted = [...runs].sort((a, b) => (b.position.y - a.position.y) || (a.position.x - b.position.x));
  const lines: ColumnRun[][] = [];
  for (const r of sorted) {
    const line = lines.find((l) => Math.abs(l[0]!.position.y - r.position.y) < Math.max(l[0]!.height, r.height) * 0.5);
    if (line) line.push(r); else lines.push([r]);
  }
  const segments: Segment[] = [];
  for (const line of lines) {
    line.sort((a, b) => a.position.x - b.position.x);
    let cur: Segment | null = null;
    for (const r of line) {
      const x0 = r.position.x;
      const x1 = r.position.x + r.width;
      if (cur && x0 - cur.x1 <= r.fontSize * 1.5) {
        cur.x1 = Math.max(cur.x1, x1);
        cur.chars += r.text.trim().length;
      } else {
        cur = { x0, x1, y: r.position.y, chars: r.text.trim().length };
        segments.push(cur);
      }
    }
  }
  return segments;
}

export function detectTextColumns<T extends ColumnRun>(runs: T[]): TextColumnSplit<T> | null {
  const text = runs.filter((r) => r.text.trim() !== '' && Math.abs(r.rotation) < 1);
  if (text.length < 2 * MIN_LINES) return null;

  const sizeChars = new Map<string, number>();
  for (const r of text) sizeChars.set(r.fontSize.toFixed(1), (sizeChars.get(r.fontSize.toFixed(1)) ?? 0) + r.text.length);
  let bodyFont = 12;
  let most = -1;
  for (const [size, chars] of sizeChars) if (chars > most) { most = chars; bodyFont = parseFloat(size); }
  const minGutter = Math.max(6, bodyFont * 0.6);

  const segments = lineSegments(text);
  const minX = Math.min(...segments.map((s) => s.x0));
  const maxX = Math.max(...segments.map((s) => s.x1));
  const span = maxX - minX;
  if (span < 2 * MIN_COLUMN_WIDTH) return null;

  // Candidate right-column left edges: the x that most segments start at, in the middle of the page.
  const counts = new Map<number, number>();
  for (const s of segments) {
    if (s.x0 < minX + 0.25 * span || s.x0 > minX + 0.75 * span) continue;
    const key = Math.round(s.x0);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const candidates = [...counts.keys()]
    .map((k) => ({ x: k, n: segments.filter((s) => Math.abs(s.x0 - k) <= EDGE_TOLERANCE).length }))
    .filter((c) => c.n >= MIN_LINES)
    .sort((a, b) => b.n - a.n);

  for (const cand of candidates) {
    const aligned = segments.filter((s) => Math.abs(s.x0 - cand.x) <= EDGE_TOLERANCE);
    const colX = Math.min(...aligned.map((s) => s.x0));
    const startsRight = (s: Segment) => s.x0 >= colX - EDGE_TOLERANCE;
    const endsLeft = (s: Segment) => s.x1 <= colX - minGutter;
    const crossing = segments.filter((s) => !startsRight(s) && !endsLeft(s));

    // The column area is bounded by the nearest gutter-crossing line above and below the aligned lines.
    const alignedTop = Math.max(...aligned.map((s) => s.y));
    const alignedBottom = Math.min(...aligned.map((s) => s.y));
    if (crossing.some((s) => s.y < alignedTop && s.y > alignedBottom)) continue;
    const above = crossing.filter((s) => s.y >= alignedTop).map((s) => s.y);
    const below = crossing.filter((s) => s.y <= alignedBottom).map((s) => s.y);
    const upper = above.length ? Math.min(...above) : Infinity;
    const lower = below.length ? Math.max(...below) : -Infinity;
    const inArea = (s: { y: number }) => s.y < upper && s.y > lower;

    const right = segments.filter((s) => startsRight(s) && inArea(s));
    const left = segments.filter((s) => endsLeft(s) && inArea(s));
    if (left.length < MIN_LINES || right.length < MIN_LINES) continue;
    if (aligned.filter(inArea).length < 0.5 * right.length) continue;

    const leftX = Math.min(...left.map((s) => s.x0));
    const leftEnd = Math.max(...left.map((s) => s.x1));
    const rightEnd = Math.max(...right.map((s) => s.x1));
    const leftWidth = leftEnd - leftX;
    const rightWidth = rightEnd - colX;
    if (colX - leftEnd < minGutter) continue;
    if (leftWidth < MIN_COLUMN_WIDTH || rightWidth < MIN_COLUMN_WIDTH) continue;
    // Dense on both sides: running text, not labels beside values or titles beside page numbers.
    if (median(left.map((s) => s.x1 - s.x0)) < 0.5 * leftWidth) continue;
    if (median(right.map((s) => s.x1 - s.x0)) < 0.5 * rightWidth) continue;
    const chars = (list: Segment[]) => list.reduce((a, s) => a + s.chars, 0);
    if (chars(left) < MIN_COLUMN_CHARS || chars(right) < MIN_COLUMN_CHARS) continue;
    // Side by side: the vertical extents overlap by at least half of the shorter column.
    const lTop = Math.max(...left.map((s) => s.y));
    const lBottom = Math.min(...left.map((s) => s.y));
    const rTop = Math.max(...right.map((s) => s.y));
    const rBottom = Math.min(...right.map((s) => s.y));
    const overlap = Math.min(lTop, rTop) - Math.max(lBottom, rBottom);
    if (overlap < 0.5 * Math.min(lTop - lBottom, rTop - rBottom)) continue;

    // Where the columns END. Content under a two-column section that happens not to reach across
    // the gutter (a picture caption, a code listing, the next heading, a page number) is not part
    // of either column and must be read AFTER the right one. A column ends where, below the last
    // line of the right column, the next line down is separated by much more than a line step;
    // a left column that simply runs on further than the right one (the last page of an
    // article) has no such gap and stays whole.
    const stepsOf = (list: Segment[]): number[] => {
      const ys = [...new Set(list.map((s) => Math.round(s.y * 10) / 10))].sort((a, b) => b - a);
      return ys.slice(1).map((y, i) => ys[i]! - y);
    };
    const step = median([...stepsOf(left), ...stepsOf(right)].filter((d) => d > 0)) || bodyFont * 1.4;
    let cut = lower;
    for (const side of [left, right]) {
      const ys = [...new Set(side.map((s) => s.y))].sort((a, b) => b - a);
      for (let i = 1; i < ys.length; i++) {
        if (ys[i]! < rBottom && ys[i - 1]! - ys[i]! > 2.5 * step) { cut = Math.max(cut, ys[i]!); break; }
      }
    }

    const middle = (leftEnd + colX) / 2;
    const bands: [T[], T[], T[], T[]] = [[], [], [], []];
    for (const r of runs) {
      const y = r.position.y;
      if (y >= upper) bands[0].push(r);
      else if (y <= cut) bands[3].push(r);
      else if (r.position.x + r.width / 2 < middle) bands[1].push(r);
      else bands[2].push(r);
    }
    return { bands, columns: [{ x: leftX, width: leftWidth }, { x: colX, width: rightWidth }] };
  }
  return null;
}

interface LineBlock {
  kind: string;
  runs?: ColumnRun[];
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * Inside one column the extraction yields one block per LINE whenever a line is made of several
 * runs (justified text is one run per word): written out as they are, a narrow column became a
 * stack of one-line paragraphs. Consecutive line blocks are joined into a paragraph while they
 * look like one: same type size, the next line starts at the column's left edge, the line step
 * is the column's ordinary step (a larger gap is paragraph spacing), and the line before it was
 * not a short last line. Headings, list items, pictures and rotated text are never joined.
 * Only used for the bands of a detected two-column page.
 */
export function mergeColumnLines<B extends LineBlock>(blocks: B[], column: TextColumnBox): B[] {
  const isLine = (b: B): b is B & { runs: ColumnRun[] } =>
    b.kind === 'paragraph' && !!b.runs && b.runs.length > 0 && b.runs.every((r) => Math.abs(r.rotation) < 1);
  const baseline = (b: { runs: ColumnRun[] }) => b.runs[0]!.position.y;
  const lastLineY = (b: { runs: ColumnRun[] }) => Math.min(...b.runs.map((r) => r.position.y));
  const lastLineRuns = (b: { runs: ColumnRun[] }) => {
    const y = lastLineY(b);
    return b.runs.filter((r) => Math.abs(r.position.y - y) < r.height * 0.5);
  };
  const lineWidth = (runs: ColumnRun[]) =>
    Math.max(...runs.map((r) => r.position.x + r.width)) - Math.min(...runs.map((r) => r.position.x));

  // The column's ordinary line step: the median baseline distance between neighbouring lines.
  const steps: number[] = [];
  for (let i = 1; i < blocks.length; i++) {
    const a = blocks[i - 1]!;
    const b = blocks[i]!;
    if (!isLine(a) || !isLine(b)) continue;
    const d = lastLineY(a) - baseline(b);
    if (d > 0 && d <= 2.2 * b.runs[0]!.fontSize) steps.push(d);
  }
  if (steps.length === 0) return blocks;
  const step = median(steps);

  const out: B[] = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    if (prev && isLine(prev) && isLine(b)) {
      const gap = lastLineY(prev) - baseline(b);
      const sameSize = Math.abs(prev.runs[0]!.fontSize - b.runs[0]!.fontSize) < 0.5;
      const atColumnLeft = Math.abs(b.bounds.x - column.x) <= 3;
      const prevFull = lineWidth(lastLineRuns(prev)) >= 0.75 * column.width;
      if (sameSize && atColumnLeft && prevFull && gap > 0 && gap <= step * 1.25) {
        const x0 = Math.min(prev.bounds.x, b.bounds.x);
        const y0 = Math.min(prev.bounds.y, b.bounds.y);
        const x1 = Math.max(prev.bounds.x + prev.bounds.width, b.bounds.x + b.bounds.width);
        const y1 = Math.max(prev.bounds.y + prev.bounds.height, b.bounds.y + b.bounds.height);
        prev.runs.push(...b.runs);
        prev.bounds = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
        continue;
      }
    }
    out.push(b);
  }
  return out;
}
