// A PDF that is a DOCUMENT — an invoice, a price list, a report with a table in it — written as a
// worksheet: everything on the pages in reading order, tables as cells and the text around them
// as rows.
//
// PDF → Excel used to take every PDF for a sheet printed by this app's own Excel → PDF renderer
// (see mergeBandsForRoundtrip in client-pdf.ts): only border LINES counted as cell borders, only
// the first table of a page was read, pages were stitched by their left edge, and whatever was
// not inside a table was dropped. Measured on PDFs from other programs: a browser's invoice ended
// in an error, a table drawn with filled rectangles came out as one cell holding the whole page,
// dates centred in merged cells were lost, and a report with one table kept 17% of its words.
//
// The page structure comes from the same analysis PDF → Word uses (extractFormattedTextFromPDF:
// tables with their merges from the divider-based grid, text grouped into lines and paragraphs,
// reading order, two-column pages); this module only lays it out on a grid:
//   - a table starts in column A, one sheet row per table row, merges kept;
//   - text outside a table is one row per line of the page (a 500-character paragraph in one
//     cell would run off the screen); a line whose parts stand far apart ("Razem netto:
//     1 234,00 zł", two address blocks side by side) has a cell per part;
//   - text is put in the column it stands in on the page (the columns of the table on that page),
//     so a totals block under a table lines up with the table's columns;
//   - pages follow each other without a gap, so a table that runs over several pages stays one
//     block of rows (a header the source repeats on every page is repeated here too — nothing is
//     guessed away).
// Pure: no PDF, no DOM — testable on hand-built blocks.
import type {
  IRBlock, IRPageIR, IRSheetMergedRange, IRSpreadsheetCell, IRSpreadsheetRunFormat, IRTableBlock, IRTextRun,
} from '../client-pdf-docx';
import { blocksInReadingOrder } from './docxLayout';

export type MakeSheetCell = (text: string, fmt?: { bold?: boolean; italic?: boolean }) => IRSpreadsheetCell;

export interface DocumentSheet {
  cells: (IRSpreadsheetCell | undefined)[][];
  /** Column widths in points (the caller converts to character units). */
  columnWidthsPt: number[];
  mergedRanges: IRSheetMergedRange[];
  /** Number of tables written. Zero = the document has no table. */
  tables: number;
}

/** Parts of one line further apart than this many ems are separate cells. */
export const SEGMENT_GAP_EM = 2.5;
/** A gap wider than this many ems between two runs of a part is a word space the PDF did not draw. */
const WORD_GAP_EM = 0.15;
/** Tolerance when deciding which column an x position belongs to (pt). */
const COLUMN_TOLERANCE = 3;
/** Width of a column no table defines (Excel's own default, 8.43 characters). */
const DEFAULT_COLUMN_PT = 48;
/** Character size a worksheet shows cells in; column widths are scaled from the PDF's text size to it. */
const SHEET_FONT_PT = 11;

export interface LineSegment { text: string; x0: number; x1: number; bold: boolean; italic: boolean }

const blank = (t: string): boolean => t.trim() === '';
const tidy = (t: string): string => t.replace(/\s+/g, ' ').trim();

/** Style most of the text is set in (by characters). */
function dominantStyle(runs: IRTextRun[]): { bold: boolean; italic: boolean } {
  let total = 0, bold = 0, italic = 0;
  for (const r of runs) {
    const n = r.text.trim().length;
    total += n;
    if (r.bold) bold += n;
    if (r.italic) italic += n;
  }
  return { bold: total > 0 && bold * 2 > total, italic: total > 0 && italic * 2 > total };
}

/**
 * The runs of a block or cell as lines, in the order they come in (the page analysis has already
 * put them in reading order). Not re-sorted by position: where a PDF lets the text of one cell run
 * over its neighbour (clipped on the page, so nobody sees it), sorting interleaves the two texts
 * word by word.
 */
export function runsToLines(runs: IRTextRun[]): IRTextRun[][] {
  const lines: IRTextRun[][] = [];
  let y = 0, size = 0;
  for (const r of runs) {
    const cur = lines[lines.length - 1];
    if (cur && Math.abs(r.position.y - y) <= 0.6 * Math.max(size, r.fontSize)) {
      cur.push(r);
      size = Math.max(size, r.fontSize);
    } else {
      lines.push([r]);
      y = r.position.y;
      size = r.fontSize;
    }
  }
  return lines;
}

/** One line cut into the parts that stand apart on the page. */
export function lineSegments(line: IRTextRun[]): LineSegment[] {
  const out: { runs: IRTextRun[]; text: string; x0: number; x1: number }[] = [];
  let pending = ''; // white-space runs seen since the last drawn text
  for (const r of line) {
    if (blank(r.text)) { pending += r.text; continue; }
    const cur = out[out.length - 1];
    const gap = cur ? r.position.x - cur.x1 : 0;
    if (!cur || gap > SEGMENT_GAP_EM * r.fontSize) {
      out.push({ runs: [r], text: r.text, x0: r.position.x, x1: r.position.x + r.width });
    } else {
      // A run that starts well before the previous one ends is another piece of text set over
      // it (two texts in one cell, a few points apart): a new word, not the same one going on.
      const spaced = pending !== '' || gap > WORD_GAP_EM * r.fontSize || gap < -0.3 * r.fontSize;
      cur.text += (spaced && !/\s$/.test(cur.text) && !/^\s/.test(r.text) ? ' ' : '') + r.text;
      cur.runs.push(r);
      cur.x1 = Math.max(cur.x1, r.position.x + r.width);
    }
    pending = '';
  }
  return out.map((s) => ({ text: tidy(s.text), x0: s.x0, x1: s.x1, ...dominantStyle(s.runs) }));
}

/** Lines of one paragraph read as one text: a space at each line end, none after a hyphen. */
function joinLines(texts: string[]): string {
  let out = '';
  for (const t of texts) {
    if (t === '') continue;
    out += out === '' || /[-‐–]$/.test(out) ? t : ' ' + t;
  }
  return out;
}

/** Column edges of a table: left edge of each column and the table's right edge. */
function tableEdges(t: IRTableBlock): number[] {
  const edges = [t.bounds.x];
  for (const w of t.columnWidths) edges.push(edges[edges.length - 1]! + w);
  return edges;
}

/** Column an x position stands in; the column after the last one when it is right of the table. */
export function columnAt(x: number, edges: number[] | undefined): number {
  if (!edges || edges.length < 2) return 0;
  let col = 0;
  for (let i = 0; i < edges.length; i++) if (edges[i]! <= x + COLUMN_TOLERANCE) col = i;
  return col; // edges.length - 1 = one past the last column
}

const isText = (b: IRBlock): b is Extract<IRBlock, { runs: IRTextRun[] }> => 'runs' in b;

function medianFontSize(t: IRTableBlock): number {
  const sizes: number[] = [];
  for (const row of t.cells) for (const c of row) for (const r of c.runs) if (!blank(r.text)) sizes.push(r.fontSize);
  if (sizes.length === 0) return SHEET_FONT_PT;
  sizes.sort((a, b) => a - b);
  return sizes[sizes.length >> 1]!;
}

export function pagesToSheet(pages: IRPageIR[], makeCell: MakeSheetCell): DocumentSheet {
  const rows: (IRSpreadsheetCell | undefined)[][] = [];
  const mergedRanges: IRSheetMergedRange[] = [];
  let tables = 0;
  let widest: IRTableBlock | undefined;

  // The table whose columns the text of a page is placed in: the page's own first table, else the
  // one before it, else the first one of the document.
  const ordered = pages.map((pg) => blocksInReadingOrder(pg.blocks, pg.height));
  const firstTable = ordered.flat().find((b): b is IRTableBlock => b.kind === 'table');
  let lastTable: IRTableBlock | undefined;

  const put = (row: (IRSpreadsheetCell | undefined)[], col: number, cell: IRSpreadsheetCell): void => {
    while (row.length <= col) row.push(undefined);
    row[col] = cell;
  };
  const styled = (text: string, style: { bold: boolean; italic: boolean }, extra?: Partial<IRSpreadsheetRunFormat>): IRSpreadsheetCell => {
    const cell = makeCell(text, style);
    if (extra && Object.keys(extra).length > 0) cell.fmt = { ...(cell.fmt ?? {}), ...extra };
    return cell;
  };

  for (const blocks of ordered) {
    const pageTable = blocks.find((b): b is IRTableBlock => b.kind === 'table');
    const edges = pageTable ?? lastTable ?? firstTable;
    const refEdges = edges ? tableEdges(edges) : undefined;

    for (const b of blocks) {
      if (b.kind === 'table') {
        tables++;
        lastTable = b;
        if (!widest || b.columnWidths.length > widest.columnWidths.length) widest = b;
        const nCols = b.columnWidths.length;
        const xs = tableEdges(b);
        const base = rows.length;
        const taken: boolean[][] = b.cells.map(() => new Array<boolean>(nCols).fill(false));
        b.cells.forEach((cellsOfRow, r) => {
          const row: (IRSpreadsheetCell | undefined)[] = new Array(nCols).fill(undefined);
          let c = 0;
          for (const src of cellsOfRow) {
            while (c < nCols && taken[r]![c]) c++;
            if (c >= nCols) break;
            const colspan = Math.max(1, Math.min(src.colspan, nCols - c));
            const rowspan = Math.max(1, Math.min(src.rowspan, b.cells.length - r));
            for (let dr = 0; dr < rowspan; dr++) for (let dc = 0; dc < colspan; dc++) taken[r + dr]![c + dc] = true;
            const drawn = src.runs.filter((x) => !blank(x.text));
            // Line by line, with the spaces the PDF did not draw: between two runs standing apart
            // on a line ("A" "merged") and at every line end.
            const cellLines = runsToLines(src.runs).filter((l) => l.some((x) => !blank(x.text)));
            const text = joinLines(cellLines.map((l) => lineSegments(l).map((x) => x.text).join(' ')));
            if (text !== '' || src.fill) {
              // Rows of a table hold cells of one, two or three lines: all start at the top, as
              // tables are set; the text of a cell merged over several rows sits in the middle.
              const extra: Partial<IRSpreadsheetRunFormat> = { vAlign: rowspan > 1 ? 'middle' : 'top' };
              if (src.fill) extra.fillHex = src.fill.replace(/^#/, '').toUpperCase();
              if (drawn.length > 0) {
                if (cellLines.length > 1) extra.wrap = true;
                // Where the text stands in its cell: against the right edge (amounts) or centred.
                const left = xs[c]!, right = xs[c + colspan]!;
                const first = cellLines[0]!.filter((x) => !blank(x.text));
                const x0 = first[0]!.position.x, last = first[first.length - 1]!, x1 = last.position.x + last.width;
                const padL = x0 - left, padR = right - x1;
                if (padL > 8 && padR < padL * 0.5) extra.hAlign = 'right';
                else if (padL > 8 && Math.abs(padL - padR) < 3) extra.hAlign = 'center';
              }
              const cell = styled(text, dominantStyle(src.runs), extra);
              cell.colspan = colspan;
              cell.rowspan = rowspan;
              row[c] = cell;
            }
            if (colspan > 1 || rowspan > 1) mergedRanges.push({ row: base + r, col: c, rowspan, colspan });
            c += colspan;
          }
          rows.push(row);
        });
        continue;
      }
      if (!isText(b)) continue; // pictures and page shapes have no place in a cell
      const lines = runsToLines(b.runs).map(lineSegments).filter((l) => l.length > 0);
      if (lines.length === 0) continue;
      const marker = b.kind === 'list-item' && b.marker.trim() !== '' && !lines[0]![0]!.text.startsWith(b.marker.trim()) ? b.marker.trim() + ' ' : '';
      lines.forEach((segments, li) => {
        const row: (IRSpreadsheetCell | undefined)[] = [];
        let next = 0;
        segments.forEach((s, si) => {
          const col = Math.max(next, columnAt(s.x0, refEdges));
          put(row, col, styled((li === 0 && si === 0 ? marker : '') + s.text, s));
          next = col + 1;
        });
        rows.push(row);
      });
    }
  }

  const nCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  for (const r of rows) while (r.length < nCols) r.push(undefined);
  // Widths of the widest table, scaled from the size its text is set in to the size a worksheet
  // shows it in (a 4.5 pt schedule keeps its proportions instead of becoming three characters wide).
  const scale = widest ? Math.min(3, Math.max(1, SHEET_FONT_PT / medianFontSize(widest))) : 1;
  const columnWidthsPt: number[] = [];
  for (let c = 0; c < nCols; c++) {
    const w = widest?.columnWidths[c];
    columnWidthsPt.push(w !== undefined ? Math.max(12, w * scale) : DEFAULT_COLUMN_PT);
  }
  return { cells: rows, columnWidthsPt, mergedRanges, tables };
}
