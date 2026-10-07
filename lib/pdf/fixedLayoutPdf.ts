// PDF side of the fixed page layout (see fixedLayout.ts): reads the text runs of every page,
// lays them out, and renders the page WITHOUT the text that was placed — that picture goes
// behind the editable text. Text that could not be placed (rotated, hopelessly overlapping) is
// left in the picture, so nothing visible is ever lost; it is just not editable.

import type { IRTextRun } from '../client-pdf-docx';
import {
  initPdfjs, pdfjsDocOptions, buildFontNameMap, buildFontClassMap, buildPageScaffold, applyLinkAnnotations,
  extractRectsFromOps, buildTableClusters, textRunOpIndex,
  type PdfjsFontCommonObjs, type PdfjsLinkAnnotation,
} from '../client-pdf';
import { buildFixedPageLayout, fixedFontFamily, type FixedBlock, type FixedPageLayout, type MeasureText } from './fixedLayout';
import type { FixedPage, FixedPicture } from './fixedLayoutDocx';
import { getFontBytes } from './fonts';

/** Resolution of the page picture: 2.2 px per point (158 dpi) unless the page is huge. */
export const FIXED_BACKGROUND_SCALE = 2.2;
export const FIXED_BACKGROUND_MAX_PIXELS = 6_000_000;

export function fixedBackgroundScale(widthPt: number, heightPt: number): number {
  const fit = Math.sqrt(FIXED_BACKGROUND_MAX_PIXELS / Math.max(1, widthPt * heightPt));
  return Math.max(0.5, Math.min(FIXED_BACKGROUND_SCALE, fit));
}

// ---------------------------------------------------------------- font metrics

// The files behind each family the layout writes: the metric-compatible open fonts this site
// ships (Liberation Sans = Arial, Tinos = Times New Roman, Cousine = Courier New, Gelasio =
// Georgia). Families without a metric twin here (Verdana, Tahoma, Calibri…) are not listed:
// their text is written in its own family at its natural width.
//
// Arial is measured with the Liberation Sans files that ship for pdf.js, the others with the
// editor's fonts (lib/pdf/fonts.ts). Those were once Latin-1 subsets without "ą ć ę ł ń ś ź ż":
// measured with a guessed width for such letters, every Polish line came out about 2 % narrow
// (a full-width line ended 17 pt early). The files are complete now; a letter a font still
// lacks (Lato has no "č") is measured as its base letter (advanceOf below).
const METRIC_SOURCE: Record<string, string> = {
  'Arial': 'liberation', 'Times New Roman': 'Times New Roman', 'Courier New': 'Cousine', 'Georgia': 'Georgia',
};
const LIBERATION_SANS = '/pdfjs-dist/standard_fonts/LiberationSans-';

export interface LoadedFont {
  unitsPerEm: number;
  glyphForCodePoint(cp: number): { advanceWidth: number; id: number };
}

const metricCache = new Map<string, Promise<LoadedFont | null>>();
const advanceCache = new Map<string, Map<number, number>>();

async function loadMetricFont(family: string, bold: boolean, italic: boolean): Promise<LoadedFont | null> {
  const source = METRIC_SOURCE[family];
  if (!source) return null;
  const key = `${source}|${bold ? 'b' : ''}${italic ? 'i' : ''}`;
  let p = metricCache.get(key);
  if (!p) {
    p = (async () => {
      try {
        let bytes: ArrayBuffer;
        if (source === 'liberation') {
          const res = await fetch(`${LIBERATION_SANS}${bold ? (italic ? 'BoldItalic' : 'Bold') : italic ? 'Italic' : 'Regular'}.ttf`);
          if (!res.ok) return null;
          bytes = await res.arrayBuffer();
        } else {
          bytes = await getFontBytes(source, bold ? 700 : 400, italic);
        }
        const fontkitMod = await import('@pdf-lib/fontkit');
        const fontkit = (fontkitMod as unknown as { default?: { create(b: Uint8Array): LoadedFont }; create?(b: Uint8Array): LoadedFont });
        const create = fontkit.default?.create ?? fontkit.create;
        return create ? create.call(fontkit.default ?? fontkit, new Uint8Array(bytes)) : null;
      } catch {
        return null;
      }
    })();
    metricCache.set(key, p);
  }
  return p;
}

const variantKey = (family: string, bold: boolean, italic: boolean): string => `${family}|${bold ? 'b' : ''}${italic ? 'i' : ''}`;

// Letters with a stroke have no Unicode decomposition; their advance is their base letter's.
const STROKE_BASE: Record<string, string> = { 'ł': 'l', 'Ł': 'L', 'đ': 'd', 'Đ': 'D', 'ø': 'o', 'Ø': 'O', 'ħ': 'h', 'Ħ': 'H', 'ı': 'i', 'ŧ': 't', 'Ŧ': 'T' };

/**
 * Advance of a character in font units, or -1 when the font has neither the character nor its
 * base letter. An accented letter is as wide as the letter under the accent in practically every
 * text face ("ą" = "a", "ć" = "c", "ł" = "l"), which is what makes a Latin-1 subset usable for
 * Polish, Czech or Turkish text.
 */
export function advanceOf(font: LoadedFont, ch: string): number {
  const direct = font.glyphForCodePoint(ch.codePointAt(0)!);
  if (direct && direct.id !== 0) return direct.advanceWidth;
  const base = STROKE_BASE[ch] ?? ch.normalize('NFD')[0];
  if (base && base !== ch) {
    const g = font.glyphForCodePoint(base.codePointAt(0)!);
    if (g && g.id !== 0) return g.advanceWidth;
  }
  return -1;
}

export interface FixedLayoutMetrics {
  /** Loads the metric fonts for these family/weight/style combinations (once each). */
  ensure(variants: Iterable<{ family: string; bold: boolean; italic: boolean }>): Promise<void>;
  /** Measures with what has been loaded; null for a variant that is not (or could not be) loaded. */
  measure: MeasureText;
}

/**
 * Text measurement for the families the layout writes. Font files are fetched on demand — a
 * document set in one sans family needs two or three of the fifteen files. A file that cannot be
 * loaded (offline) leaves its text unfitted.
 */
export function createFixedLayoutMetrics(): FixedLayoutMetrics {
  const fonts = new Map<string, LoadedFont | null>();
  return {
    async ensure(variants) {
      for (const v of variants) {
        const key = variantKey(v.family, v.bold, v.italic);
        if (!fonts.has(key)) fonts.set(key, await loadMetricFont(v.family, v.bold, v.italic));
      }
    },
    measure(text, family, bold, italic, fontSize) {
      const key = variantKey(family, bold, italic);
      const font = fonts.get(key);
      if (!font) return null;
      let cache = advanceCache.get(key);
      if (!cache) { cache = new Map(); advanceCache.set(key, cache); }
      let units = 0;
      let count = 0;
      let missing = 0;
      for (const ch of text) {
        const cp = ch.codePointAt(0)!;
        let adv = cache.get(cp);
        if (adv === undefined) {
          // -1: unknown to this font; the word processor will draw it from another one.
          adv = advanceOf(font, ch);
          cache.set(cp, adv);
        }
        count++;
        if (adv < 0) { missing++; units += font.unitsPerEm * 0.6; } else units += adv;
      }
      // Mostly foreign to this font (CJK, Cyrillic in a Latin-only file…): its width here says
      // nothing about the width it will have, so the text is not fitted at all.
      if (missing > 0 && missing > count * 0.2) return null;
      return units / font.unitsPerEm * fontSize;
    },
  };
}

// ---------------------------------------------------------------- canvas

interface AnyCanvas {
  width: number;
  height: number;
  getContext(kind: '2d'): unknown;
  toBlob?: (cb: (b: Blob | null) => void, type?: string, quality?: number) => void;
  toBuffer?: (type: string, quality?: number) => Uint8Array;
}

function createCanvas(width: number, height: number): AnyCanvas {
  const canvas = document.createElement('canvas') as unknown as AnyCanvas;
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function canvasToJpeg(canvas: AnyCanvas, quality: number): Promise<Uint8Array> {
  if (typeof canvas.toBlob === 'function') {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob!(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('Nie udało się zapisać obrazu strony.');
    return new Uint8Array(await blob.arrayBuffer());
  }
  // Node canvas used by the test scripts.
  return new Uint8Array(canvas.toBuffer!('image/jpeg', Math.round(quality * 100)));
}

/** Share of pixels that are not (near) white, 0…1. Zero = a page with nothing but its text. */
function inkCoverage(ctx: { getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray } }, width: number, height: number): number {
  const { data } = ctx.getImageData(0, 0, width, height);
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i]! < 250 || data[i + 1]! < 250 || data[i + 2]! < 250) ink++;
  }
  return ink / Math.max(1, data.length / 4);
}

// ---------------------------------------------------------------- pages

/** showText operators drawn while the text rendering mode makes text invisible (3) or clip-only (7). */
function invisibleTextOps(fnArray: number[], argsArray: unknown[], OPS: Record<string, number>): Set<number> {
  const out = new Set<number>();
  const stack: number[] = [];
  let mode = 0;
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    if (fn === OPS['save']) stack.push(mode);
    else if (fn === OPS['restore']) mode = stack.pop() ?? mode;
    else if (fn === OPS['setTextRenderingMode']) mode = Number((argsArray[i] as unknown[])?.[0]) || 0;
    else if (fn === OPS['showText'] && (mode === 3 || mode === 7)) out.add(i);
  }
  return out;
}

// ---------------------------------------------------------------- one page

type PdfjsDoc = Awaited<ReturnType<typeof import('pdfjs-dist')['getDocument']>['promise']>;
type PdfjsPage = Awaited<ReturnType<PdfjsDoc['getPage']>>;

interface PreparedPage {
  width: number;
  height: number;
  layout: FixedPageLayout;
  /** Text operators to leave out of the page picture. */
  hide: Set<number>;
  /** Characters of visible text / of invisible text (an OCR layer under a scan). */
  visibleChars: number;
  invisibleChars: number;
  /** Characters of visible text set in a light colour (they need the page's own background). */
  lightChars: number;
  /** Characters of visible text that sit in the cells of a real (well-filled) ruled table. */
  tableChars: number;
  unplacedChars: number;
  /** Images that may become pictures of their own. */
  images: ImageCandidate[];
}

const charCount = (runs: IRTextRun[]): number => runs.reduce((n, r) => n + r.text.trim().length, 0);

function isLight(color: string): boolean {
  const m = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(color ?? '');
  if (!m) return false;
  return 0.299 * parseInt(m[1]!, 16) + 0.587 * parseInt(m[2]!, 16) + 0.114 * parseInt(m[3]!, 16) > 200;
}

/**
 * Characters inside ruled grids that really are tables: at least 2x2, text in a good share of
 * the cells, and cells that hold a table's worth of text — a few words, not paragraphs. The grid
 * detector also fires on decoration: dashed rules and dotted separators line up into a huge,
 * almost empty "grid" (91x36 cells, 1 % filled, on the reported page), and a page of cards and
 * bands forms a coarse one whose "cells" each hold a whole block of text (2x4 cells, 160
 * characters each). Neither is counted.
 */
function realTableChars(runs: IRTextRun[], rects: ReturnType<typeof extractRectsFromOps>, pageHeight: number): number {
  const counted = new Set<IRTextRun>();
  for (const cluster of buildTableClusters(rects)) {
    const { xEdges, yEdges, cols, rows } = cluster;
    if (cols < 2 || rows < 2) continue;
    const x0 = xEdges[0]!, x1 = xEdges[xEdges.length - 1]!, y0 = yEdges[0]!, y1 = yEdges[yEdges.length - 1]!;
    const filled = new Set<number>();
    const inside: IRTextRun[] = [];
    for (const r of runs) {
      if (!r.text.trim()) continue;
      const x = r.position.x + Math.min(r.width, r.fontSize) / 2;
      const y = pageHeight - r.position.y - r.fontSize * 0.3;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      let ci = 0;
      while (ci < cols - 1 && x > xEdges[ci + 1]!) ci++;
      let ri = 0;
      while (ri < rows - 1 && y > yEdges[ri + 1]!) ri++;
      filled.add(ri * cols + ci);
      inside.push(r);
    }
    if (filled.size === 0) continue;
    const perCell = charCount(inside) / filled.size;
    if (filled.size / (cols * rows) >= TABLE_FILL && perCell <= TABLE_CELL_CHARS) for (const r of inside) counted.add(r);
  }
  return charCount([...counted]);
}

/** Share of a grid's cells that must hold text for the grid to count as a table. */
const TABLE_FILL = 0.25;
/** Most text a cell of a real table holds on average (characters). */
const TABLE_CELL_CHARS = 60;

async function preparePage(page: PdfjsPage, OPS: Record<string, number>, metrics: FixedLayoutMetrics | undefined): Promise<PreparedPage> {
  const base = page.getViewport({ scale: 1 });
  const opList = await page.getOperatorList();
  const commonObjs = page.commonObjs as unknown as PdfjsFontCommonObjs;
  const fontNames = buildFontNameMap(commonObjs, opList, OPS);
  const hints = buildFontClassMap(commonObjs, opList, OPS);
  const scaffold = buildPageScaffold(opList, OPS, fontNames, { preciseText: true });
  const invisible = invisibleTextOps(opList.fnArray, opList.argsArray, OPS);
  const isInvisible = (r: IRTextRun): boolean => {
    const op = textRunOpIndex(r);
    return op !== undefined && invisible.has(op);
  };
  const runs = scaffold.textRuns.filter((r) => !isInvisible(r));
  applyLinkAnnotations(runs, await page.getAnnotations() as PdfjsLinkAnnotation[]);
  // Underlines are NOT turned into underlined text here: in a PDF an underline is a drawn line,
  // and it stays in the page picture — underlining the text as well would show it twice.
  const rects = extractRectsFromOps(scaffold.ops, base.height);

  if (metrics) {
    await metrics.ensure(runs.filter((r) => r.text.trim()).map((r) => ({ family: fixedFontFamily(r.fontName, hints.get(r.fontName)), bold: r.bold, italic: r.italic })));
  }
  const layout = buildFixedPageLayout(runs, base.width, base.height, { ...(metrics ? { measure: metrics.measure } : {}), fontHint: (name) => hints.get(name) });
  const keep = new Set<number>();
  for (const r of layout.unplaced) {
    const op = textRunOpIndex(r);
    if (op !== undefined) keep.add(op);
  }
  // Hidden in the picture: every text operator that produced a run (also the overprint twins
  // that were dropped), except invisible text (never painted anyway) and unplaced runs.
  const hide = new Set<number>(scaffold.textOps.filter((op) => !keep.has(op) && !invisible.has(op)));
  return {
    width: base.width,
    height: base.height,
    layout,
    hide,
    visibleChars: charCount(runs),
    invisibleChars: charCount(scaffold.textRuns.filter(isInvisible)),
    lightChars: charCount(runs.filter((r) => isLight(r.color))),
    tableChars: realTableChars(runs, rects, base.height),
    unplacedChars: charCount(layout.unplaced),
    images: imageCandidates(opList.fnArray, opList.argsArray, OPS, (x, y) => base.convertToViewportPoint(x, y), base.width, base.height),
  };
}

/** The page drawn without the hidden text operators. The caller frees the canvas. */
async function renderTextFree(page: PdfjsPage, hide: Set<number>, scale: number): Promise<{ canvas: AnyCanvas; ctx: CanvasRenderingContext2D }> {
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvasContext: ctx,
    canvas: canvas as unknown as HTMLCanvasElement,
    viewport,
    operationsFilter: (index: number) => !hide.has(index),
  } as Parameters<typeof page.render>[0]).promise;
  return { canvas, ctx };
}

// ---------------------------------------------------------------- photos as pictures of their own

// A photo on the page used to be baked into the page picture: it could not be moved, replaced
// or deleted without the whole background. Each image the PDF paints is now cut out as a
// picture of its own, lying between the page picture and the text.
//
// How, without decoding a single image format: the page is drawn once more with every OTHER
// candidate image and all placed text left out, and the rectangle the image covers is cropped
// from that. So the picture is what the page shows there — clipped corners, masks and
// rotation included, with whatever is painted over the image baked in — and putting it back at
// the same place gives the same page by construction. Its corners outside a rounded clip carry
// the page colour behind them (a JPEG has no transparency; a PNG of every photo would make the
// document ten times the size).

/** Smaller than this on either side is decoration (an icon, a bullet) and stays in the page picture. */
const PICTURE_MIN_SIDE_PT = 24;
/** A page with more images than this is a sliced or tiled picture, not a page of photos. */
const PICTURE_MAX_PER_PAGE = 12;
/** Resolution of a cut-out picture: the image's own, between the page picture's and about 300 dpi. */
const PICTURE_MAX_SCALE = 4.2;
const PICTURE_MAX_PIXELS = 4_000_000;
/** Share of its rectangle an image must visibly change; less means it is clipped away or a faint overlay. */
const PICTURE_MIN_CONTRIBUTION = 0.5;

/** One picture to cut out: the operators that paint it (several when images lie on one another). */
export interface ImageCandidate { ops: number[]; x: number; y: number; width: number; height: number; pxPerPt: number }

type Mat = [number, number, number, number, number, number];
const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];

/**
 * Where the page's images are drawn, in page coordinates from the top-left. Images that lie on
 * one another (a photo over its placeholder, a picture and its shadow) are one candidate, cut
 * out together. Images that are too small or that come by the dozen are not candidates.
 */
export function imageCandidates(
  fnArray: number[], argsArray: unknown[], OPS: Record<string, number>,
  toViewport: (x: number, y: number) => number[], pageWidth: number, pageHeight: number,
): ImageCandidate[] {
  const found: ImageCandidate[] = [];
  const stack: Mat[] = [];
  let ctm: Mat = [1, 0, 0, 1, 0, 0];
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i] as unknown[] | null;
    if (fn === OPS['save']) stack.push(ctm);
    else if (fn === OPS['restore']) ctm = stack.pop() ?? ctm;
    else if (fn === OPS['transform'] && args?.length === 6) ctm = mul(ctm, args as unknown as Mat);
    else if (fn === OPS['paintFormXObjectBegin']) {
      // A form saves the graphics state and applies its own matrix.
      stack.push(ctm);
      const m = args?.[0];
      if (Array.isArray(m) && m.length === 6) ctm = mul(ctm, m as unknown as Mat);
    } else if (fn === OPS['paintFormXObjectEnd']) ctm = stack.pop() ?? ctm;
    else if (fn === OPS['paintImageXObject']) {
      // An image fills the unit square of the current coordinate system.
      const m = ctm;
      const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => toViewport(m[0] * u! + m[2] * v! + m[4], m[1] * u! + m[3] * v! + m[5]));
      const xs = corners.map((c) => c[0]!);
      const ys = corners.map((c) => c[1]!);
      const x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(pageWidth, Math.max(...xs));
      const y0 = Math.max(0, Math.min(...ys)), y1 = Math.min(pageHeight, Math.max(...ys));
      const natural = Number(args?.[1]) || 0;
      const fullWidth = Math.max(...xs) - Math.min(...xs);
      if (x1 - x0 >= PICTURE_MIN_SIDE_PT && y1 - y0 >= PICTURE_MIN_SIDE_PT) {
        found.push({ ops: [i], x: x0, y: y0, width: x1 - x0, height: y1 - y0, pxPerPt: fullWidth > 0 ? natural / fullWidth : 0 });
      }
    }
  }
  // Images that overlap are merged (transitively) into one candidate over their common box.
  const touches = (a: ImageCandidate, b: ImageCandidate): boolean =>
    a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
  const merged: ImageCandidate[] = [];
  for (const c of found) {
    let cur = c;
    for (let k = merged.length - 1; k >= 0; k--) {
      const m = merged[k]!;
      if (!touches(m, cur)) continue;
      const x = Math.min(m.x, cur.x), y = Math.min(m.y, cur.y);
      cur = {
        ops: [...m.ops, ...cur.ops].sort((p, q) => p - q), x, y,
        width: Math.max(m.x + m.width, cur.x + cur.width) - x, height: Math.max(m.y + m.height, cur.y + cur.height) - y,
        pxPerPt: Math.max(m.pxPerPt, cur.pxPerPt),
      };
      merged.splice(k, 1);
      k = merged.length; // the grown box may now touch boxes it did not touch before
    }
    merged.push(cur);
  }
  merged.sort((a, b) => a.ops[0]! - b.ops[0]!);
  return merged.length > PICTURE_MAX_PER_PAGE ? [] : merged;
}

/** One rectangle of the page, drawn without the hidden operators. */
async function renderRegion(page: PdfjsPage, hide: Set<number>, scale: number, x: number, y: number, width: number, height: number): Promise<{ canvas: AnyCanvas; ctx: CanvasRenderingContext2D }> {
  const viewport = page.getViewport({ scale, offsetX: -x * scale, offsetY: -y * scale });
  const canvas = createCanvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvasContext: ctx,
    canvas: canvas as unknown as HTMLCanvasElement,
    viewport,
    operationsFilter: (index: number) => !hide.has(index),
  } as Parameters<typeof page.render>[0]).promise;
  return { canvas, ctx };
}

const release = (canvas: AnyCanvas): void => { canvas.width = 0; canvas.height = 0; };

/**
 * The images of a page as pictures of their own, in painting order, and the operators that
 * drew them (to be left out of the page picture).
 */
async function cutOutPictures(page: PdfjsPage, candidates: ImageCandidate[], textHide: Set<number>, backgroundScale: number): Promise<{ pictures: FixedPicture[]; ops: number[] }> {
  const pictures: FixedPicture[] = [];
  const ops: number[] = [];
  const allOps = candidates.flatMap((c) => c.ops);
  for (const c of candidates) {
    const without = new Set([...textHide, ...allOps]);
    const withIt = new Set([...textHide, ...allOps.filter((op) => !c.ops.includes(op))]);
    // Does the image show at all? Compared at 1 px/pt: the page with it and without it.
    const a = await renderRegion(page, withIt, 1, c.x, c.y, c.width, c.height);
    const b = await renderRegion(page, without, 1, c.x, c.y, c.width, c.height);
    const pa = a.ctx.getImageData(0, 0, a.canvas.width, a.canvas.height).data;
    const pb = b.ctx.getImageData(0, 0, b.canvas.width, b.canvas.height).data;
    let changed = 0;
    for (let i = 0; i < pa.length; i += 4) {
      if (Math.abs(pa[i]! - pb[i]!) > 8 || Math.abs(pa[i + 1]! - pb[i + 1]!) > 8 || Math.abs(pa[i + 2]! - pb[i + 2]!) > 8) changed++;
    }
    const share = changed / Math.max(1, pa.length / 4);
    release(a.canvas);
    release(b.canvas);
    if (share < PICTURE_MIN_CONTRIBUTION) continue;

    const wanted = Math.min(PICTURE_MAX_SCALE, Math.max(backgroundScale, c.pxPerPt));
    const scale = Math.min(wanted, Math.sqrt(PICTURE_MAX_PIXELS / Math.max(1, c.width * c.height)));
    const cut = await renderRegion(page, withIt, scale, c.x, c.y, c.width, c.height);
    pictures.push({ x: c.x, y: c.y, width: c.width, height: c.height, data: await canvasToJpeg(cut.canvas, 0.9), mime: 'image/jpeg' });
    release(cut.canvas);
    ops.push(...c.ops);
  }
  return { pictures, ops };
}

async function openPdf(file: File): Promise<{ doc: PdfjsDoc; OPS: Record<string, number> }> {
  const buf = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(buf))).promise;
  return { doc, OPS: pdfjsLib.OPS as unknown as Record<string, number> };
}

// ---------------------------------------------------------------- whole document

export interface FixedPagesResult {
  pages: FixedPage[];
  /** Characters placed as editable text / left in the page picture, over the whole document. */
  placedChars: number;
  unplacedChars: number;
  /** Text metrics of the fonts the layout was fitted with (what the writers may wrap text with). */
  measure: MeasureText;
}

/** Every page of a PDF as a fixed layout plus its text-free picture. */
export async function pdfToFixedPages(file: File, onProgress?: (page: number, total: number) => void): Promise<FixedPagesResult> {
  const { doc, OPS } = await openPdf(file);
  const metrics = createFixedLayoutMetrics();
  const pages: FixedPage[] = [];
  let placedChars = 0;
  let unplacedChars = 0;
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      onProgress?.(p, doc.numPages);
      const page = await doc.getPage(p);
      const prep = await preparePage(page, OPS, metrics);
      placedChars += prep.visibleChars - prep.unplacedChars;
      unplacedChars += prep.unplacedChars;
      const scale = fixedBackgroundScale(prep.width, prep.height);
      const cut = await cutOutPictures(page, prep.images, prep.hide, scale);
      const { canvas, ctx } = await renderTextFree(page, new Set([...prep.hide, ...cut.ops]), scale);
      const background = inkCoverage(ctx, canvas.width, canvas.height) === 0
        ? undefined
        : { data: await canvasToJpeg(canvas, 0.9), mime: 'image/jpeg' as const };
      canvas.width = 0;
      canvas.height = 0;
      pages.push({ layout: prep.layout, ...(background ? { background } : {}), ...(cut.pictures.length > 0 ? { pictures: cut.pictures } : {}) });
      page.cleanup();
    }
  } finally {
    await doc.cleanup();
  }
  return { pages, placedChars, unplacedChars, measure: metrics.measure };
}

// ---------------------------------------------------------------- which engine?

/** What one page looks like, for choosing between the fixed layout and the flow engine. */
export interface PageLayoutSignal {
  /** Share of the page (0…1) covered by anything but text. */
  coverage: number;
  /** Side-by-side text blocks whose baselines do not line up. */
  columnBlocks: number;
  visibleChars: number;
  invisibleChars: number;
  lightChars: number;
  /** Characters of visible text inside real ruled tables. */
  tableChars: number;
}

export type ResolvedLayoutMode = 'fixed' | 'flow';

function countColumnBlocks(blocks: FixedBlock[]): number {
  let n = 0;
  for (const b of blocks) {
    if (b.kind !== 'columns') continue;
    n += 1;
    for (const c of b.columns) n += countColumnBlocks(c.blocks);
  }
  return n;
}

/** A scan: a picture of a page, with at most an invisible OCR layer. */
export function isScannedPage(s: PageLayoutSignal): boolean {
  return s.visibleChars < 20 && (s.invisibleChars > 50 || s.coverage > 0.5);
}

/** A page that is mostly one real table: the flow engine turns it into a real Word table. */
export function isTablePage(s: PageLayoutSignal): boolean {
  return s.visibleChars > 0 && s.tableChars >= 0.6 * s.visibleChars;
}

/** A designed page: graphics, colour, or text arranged in ways a flow of paragraphs cannot follow. */
export function isDesignedPage(s: PageLayoutSignal): boolean {
  if (isScannedPage(s) || isTablePage(s)) return false;
  return s.coverage >= 0.04 || s.columnBlocks >= 2 || s.lightChars >= 10;
}

/**
 * Fixed layout or flow? The flow engine (paragraphs, lists, real tables) suits plain text
 * documents; on a designed page it produces nonsense, so the choice leans to the fixed layout:
 * it is taken as soon as a quarter of the document's pages are designed. Scans go to the flow
 * engine, which keeps their OCR text as text.
 */
export function chooseLayoutMode(signals: PageLayoutSignal[]): ResolvedLayoutMode {
  const real = signals.filter((s) => !isScannedPage(s));
  if (real.length === 0 || real.length * 2 < signals.length) return 'flow';
  const designed = real.filter(isDesignedPage).length;
  return designed / real.length >= 0.25 ? 'fixed' : 'flow';
}

/** Pages looked at when classifying a long document (evenly spread). */
export const LAYOUT_SAMPLE_PAGES = 24;

/** Looks at (a sample of) the pages at low resolution and picks the engine. */
export async function detectPdfLayoutMode(file: File): Promise<{ mode: ResolvedLayoutMode; signals: PageLayoutSignal[] }> {
  const { doc, OPS } = await openPdf(file);
  const signals: PageLayoutSignal[] = [];
  try {
    const total = doc.numPages;
    const step = Math.max(1, total / LAYOUT_SAMPLE_PAGES);
    const picked = new Set<number>();
    for (let i = 0; i < total && picked.size < LAYOUT_SAMPLE_PAGES; i += step) picked.add(Math.min(total, Math.floor(i) + 1));
    for (const p of picked) {
      const page = await doc.getPage(p);
      const prep = await preparePage(page, OPS, undefined);
      const { canvas, ctx } = await renderTextFree(page, prep.hide, 0.5);
      signals.push({
        coverage: inkCoverage(ctx, canvas.width, canvas.height),
        columnBlocks: countColumnBlocks(prep.layout.blocks),
        visibleChars: prep.visibleChars,
        invisibleChars: prep.invisibleChars,
        lightChars: prep.lightChars,
        tableChars: prep.tableChars,
      });
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }
  } finally {
    await doc.cleanup();
  }
  return { mode: chooseLayoutMode(signals), signals };
}
