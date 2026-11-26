// "Pages per sheet" and "Booklet" (plan 2.7, 2026-11-26): pages of a PDF placed on new, larger
// or turned sheets for printing. Each source page becomes a form XObject (vector: text stays text,
// nothing is rasterised), drawn into its cell as the reader sees the page — its crop box, turned
// by /Rotate — scaled to fit and centred. pdf-lib only.
//
// Booklet (saddle stitch): the page count is padded with blank pages to a multiple of 4; sheet s
// carries on its front the pages n-1-2s (left) and 2s (right), on its back 2s+1 (left) and
// n-2-2s (right). Printed double-sided, flipped on the short edge, folded in the middle, the
// pages read in order.
import {
  PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRef, PDFStream, concatTransformationMatrix, drawObject,
  popGraphicsState, pushGraphicsState, rgb, type PDFEmbeddedPage, type PDFPage,
} from 'pdf-lib';

export type SheetSize = 'A4' | 'A3' | 'Letter';
export type PagesPerSheet = 2 | 4 | 6 | 9 | 16;

export interface ImposeOptions {
  mode: 'nup' | 'booklet';
  /** For 'nup'. */
  perSheet?: PagesPerSheet;
  sheet: SheetSize;
  /** Margin around the sheet and between cells, in millimetres. */
  marginMm: number;
  /** A thin frame around every placed page. */
  borders: boolean;
}

export interface ImposeResult {
  bytes: Uint8Array;
  sourcePages: number;
  sheets: number;
  /** Booklet: blank pages added to reach a multiple of 4. */
  blanksAdded: number;
}

const MM = 72 / 25.4;
export const SHEET_SIZES: Record<SheetSize, [number, number]> = { A4: [595.28, 841.89], A3: [841.89, 1190.55], Letter: [612, 792] };
const GRIDS: Record<PagesPerSheet, [number, number]> = { 2: [2, 1], 4: [2, 2], 6: [3, 2], 9: [3, 3], 16: [4, 4] };

interface Cell { x: number; y: number; w: number; h: number }

/** The page as displayed: width and height of the crop box turned by /Rotate. */
export function displayedSize(page: PDFPage): { w: number; h: number; rot: number } {
  const crop = page.getCropBox();
  const rot = ((page.getRotation().angle % 360) + 360) % 360;
  const turned = rot === 90 || rot === 270;
  return { w: turned ? crop.height : crop.width, h: turned ? crop.width : crop.height, rot };
}

/**
 * The matrix that draws an embedded page (coordinates 0..W × 0..H of its unturned crop box) so
 * that the page as displayed fills the box at (ox, oy) of size (W·s, H·s) or (H·s, W·s).
 */
export function placeMatrix(rot: number, W: number, H: number, s: number, ox: number, oy: number): [number, number, number, number, number, number] {
  if (rot === 90) return [0, -s, s, 0, ox, oy + s * W];
  if (rot === 180) return [-s, 0, 0, -s, ox + s * W, oy + s * H];
  if (rot === 270) return [0, s, -s, 0, ox + s * H, oy];
  return [s, 0, 0, s, ox, oy];
}

/** Cells of a cols × rows grid, in reading order (left to right, top to bottom). */
export function gridCells(sheetW: number, sheetH: number, cols: number, rows: number, margin: number): Cell[] {
  const w = (sheetW - margin * (cols + 1)) / cols;
  const h = (sheetH - margin * (rows + 1)) / rows;
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cells.push({ x: margin + c * (w + margin), y: sheetH - margin - (r + 1) * h - r * margin, w, h });
  }
  return cells;
}

/**
 * Sheet orientation and grid direction that make a page of the given shape biggest: a 2-up of
 * portrait pages goes on a landscape sheet, a 6-up of portrait pages is 3 across a landscape sheet.
 */
export function chooseLayout(pageW: number, pageH: number, sheet: [number, number], perSheet: PagesPerSheet, margin: number) {
  const [a, b] = GRIDS[perSheet];
  let best = { sheetW: sheet[0], sheetH: sheet[1], cols: a, rows: b, scale: 0 };
  for (const [sw, sh] of [[sheet[0], sheet[1]], [sheet[1], sheet[0]]] as const) {
    for (const [cols, rows] of [[a, b], [b, a]] as const) {
      const cw = (sw - margin * (cols + 1)) / cols, ch = (sh - margin * (rows + 1)) / rows;
      const scale = Math.min(cw / pageW, ch / pageH);
      if (scale > best.scale + 1e-9) best = { sheetW: sw, sheetH: sh, cols, rows, scale };
    }
  }
  return best;
}

/** Booklet: for n pages (a multiple of 4), the page index (or -1 for none) of every half, sheet by sheet. */
export function bookletOrder(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let s = 0; s < n / 4; s++) {
    out.push([n - 1 - 2 * s, 2 * s]);
    out.push([2 * s + 1, n - 2 - 2 * s]);
  }
  return out;
}

const nums = (o: unknown): number[] | null =>
  o instanceof PDFArray ? o.asArray().map((x) => (x instanceof PDFNumber ? x.asNumber() : NaN)) : null;

/**
 * Comments, stamps, highlights and filled form fields are annotations, drawn by the viewer on top
 * of the page — an embedded page carries only the page's content, so they would vanish from the
 * sheet. Their normal appearance (what the reader sees) is drawn into the page's own content
 * first, placed the way ISO 32000-1 §12.5.5 places it: the form's BBox, transformed by its
 * Matrix, fitted to the annotation's Rect. Hidden and NoView annotations and popups are skipped.
 * Returns how many were drawn.
 */
export function bakeAnnotations(page: PDFPage): number {
  const ctx = page.doc.context;
  const annots = page.node.lookup(PDFName.of('Annots'));
  if (!(annots instanceof PDFArray)) return 0;
  let drawn = 0;
  for (const a of annots.asArray()) {
    const annot = ctx.lookup(a);
    if (!(annot instanceof PDFDict)) continue;
    const subtype = annot.lookup(PDFName.of('Subtype'));
    if (subtype instanceof PDFName && subtype.asString() === '/Popup') continue;
    const flags = (annot.lookup(PDFName.of('F')) as PDFNumber | undefined)?.asNumber?.() ?? 0;
    if (flags & 2 || flags & 32) continue; // Hidden, NoView
    const ap = annot.lookup(PDFName.of('AP'));
    if (!(ap instanceof PDFDict)) continue;
    let n = ap.get(PDFName.of('N'));
    let nObj = ctx.lookup(n);
    if (nObj instanceof PDFDict && !(nObj instanceof PDFStream)) {
      const as = annot.lookup(PDFName.of('AS'));
      n = as instanceof PDFName ? nObj.get(as) : undefined;
      nObj = ctx.lookup(n);
    }
    if (!(nObj instanceof PDFStream)) continue;
    const rect = nums(annot.lookup(PDFName.of('Rect')));
    const bbox = nums(nObj.dict.lookup(PDFName.of('BBox')));
    if (!rect || !bbox || rect.length !== 4 || bbox.length !== 4 || [...rect, ...bbox].some((v) => !Number.isFinite(v))) continue;
    const m = nums(nObj.dict.lookup(PDFName.of('Matrix'))) ?? [1, 0, 0, 1, 0, 0];
    const corners = [[bbox[0]!, bbox[1]!], [bbox[2]!, bbox[1]!], [bbox[0]!, bbox[3]!], [bbox[2]!, bbox[3]!]]
      .map(([x, y]) => [m[0]! * x! + m[2]! * y! + m[4]!, m[1]! * x! + m[3]! * y! + m[5]!]);
    const xs = corners.map((c) => c[0]!), ys = corners.map((c) => c[1]!);
    const [bx0, bx1, by0, by1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const [rx0, ry0, rx1, ry1] = [Math.min(rect[0]!, rect[2]!), Math.min(rect[1]!, rect[3]!), Math.max(rect[0]!, rect[2]!), Math.max(rect[1]!, rect[3]!)];
    if (bx1 - bx0 <= 0 || by1 - by0 <= 0) continue;
    const sx = (rx1 - rx0) / (bx1 - bx0), sy = (ry1 - ry0) / (by1 - by0);
    const ref = n instanceof PDFRef ? n : ctx.register(nObj);
    const name = page.node.newXObject('Annot', ref);
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(sx, 0, 0, sy, rx0 - bx0 * sx, ry0 - by0 * sy), drawObject(name), popGraphicsState());
    drawn++;
  }
  return drawn;
}

function place(sheet: PDFPage, emb: PDFEmbeddedPage, src: PDFPage, cell: Cell, borders: boolean): void {
  const { w, h, rot } = displayedSize(src);
  const crop = src.getCropBox();
  const s = Math.min(cell.w / w, cell.h / h);
  const ox = cell.x + (cell.w - w * s) / 2;
  const oy = cell.y + (cell.h - h * s) / 2;
  const name = sheet.node.newXObject('Pg', emb.ref);
  sheet.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(...placeMatrix(rot, crop.width, crop.height, s, ox, oy)),
    drawObject(name),
    popGraphicsState(),
  );
  if (borders) sheet.drawRectangle({ x: ox, y: oy, width: w * s, height: h * s, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.5 });
}

export async function imposePages(bytes: Uint8Array | ArrayBuffer, opts: ImposeOptions): Promise<ImposeResult> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  if (src.isEncrypted) throw new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.');
  const pages = src.getPages();
  if (pages.length === 0) throw new Error('Plik PDF nie ma stron.');
  for (const p of pages) bakeAnnotations(p);
  // pdf-lib refuses to embed a page without /Contents (a blank page): give it an empty stream.
  for (const p of pages) if (!p.node.get(PDFName.of('Contents'))) p.node.set(PDFName.of('Contents'), src.context.register(src.context.stream('')));
  const out = await PDFDocument.create();
  const embedded = await out.embedPages(pages, pages.map((p) => {
    const c = p.getCropBox();
    return { left: c.x, bottom: c.y, right: c.x + c.width, top: c.y + c.height };
  }));
  const margin = Math.max(0, opts.marginMm) * MM;
  const size = SHEET_SIZES[opts.sheet];
  const first = displayedSize(pages[0]!);

  if (opts.mode === 'booklet') {
    const n = Math.ceil(pages.length / 4) * 4;
    // Two halves side by side: the sheet is turned so its long side is horizontal.
    const sheetW = Math.max(size[0], size[1]), sheetH = Math.min(size[0], size[1]);
    const cells = gridCells(sheetW, sheetH, 2, 1, margin);
    for (const pair of bookletOrder(n)) {
      const sheet = out.addPage([sheetW, sheetH]);
      pair.forEach((i, k) => { if (i < pages.length) place(sheet, embedded[i]!, pages[i]!, cells[k]!, opts.borders); });
    }
    const title = src.getTitle();
    if (title) out.setTitle(title);
    return { bytes: await out.save(), sourcePages: pages.length, sheets: n / 4, blanksAdded: n - pages.length };
  }

  const per = opts.perSheet ?? 2;
  const layout = chooseLayout(first.w, first.h, size, per, margin);
  const cells = gridCells(layout.sheetW, layout.sheetH, layout.cols, layout.rows, margin);
  for (let i = 0; i < pages.length; i += per) {
    const sheet = out.addPage([layout.sheetW, layout.sheetH]);
    for (let k = 0; k < per && i + k < pages.length; k++) place(sheet, embedded[i + k]!, pages[i + k]!, cells[k]!, opts.borders);
  }
  const title = src.getTitle();
  if (title) out.setTitle(title);
  return { bytes: await out.save(), sourcePages: pages.length, sheets: Math.ceil(pages.length / per), blanksAdded: 0 };
}

