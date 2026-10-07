// Reading a positioned document back: the reverse of fixedLayoutDocx.ts / fixedLayoutOdt.ts.
//
// Why it exists: PDF -> Word with the faithful layout writes every line as a paragraph with an
// exact line height, an indent or tab stops, and borderless one-row tables for side-by-side
// columns, over a page picture. The ordinary Word/OpenDocument readers of this site (docxToIR /
// odtToIR) know none of that — they reflow paragraphs under one another with their own line
// height — so the same file sent back through Word -> PDF came out as 41 loose pages instead of
// 27. A document built this way says exactly where every line goes, so it is read as that:
// positions, not flow.
//
// It is recognised by its structure, not by a marker: zero page margins and an exact line height
// on every paragraph. A document that fails either test (or contains anything this reader does
// not model: a table with several rows, an inline picture, a page break inside a line) is not
// "positioned" and the caller falls back to the ordinary reader — `null`, never a guess.
//
// The arithmetic is the word processor's own: paragraphs stack from the top of the page, each
// adding its space before and its lines; a line's baseline sits FIXED_DESCENT of the font size
// above the bottom of its line box (the model the writers were calibrated with in OpenOffice).

import type { FixedBlock, FixedPageLayout, FixedRun, MeasureText } from './fixedLayout';
import { FIXED_DESCENT } from './fixedLayout';
import { frameAscent, wrapRuns } from './fixedFrames';

export interface PlacedSegment {
  /** Left edge, points from the left edge of the page. */
  x: number;
  runs: FixedRun[];
}

export interface PlacedLine {
  /** Baseline, points from the TOP of the page. */
  baseline: number;
  segments: PlacedSegment[];
}

export interface PlacedPicture {
  /** Top-left corner and size, points from the page's top-left corner. */
  x: number;
  y: number;
  width: number;
  height: number;
  data: Uint8Array;
  mime: 'image/jpeg' | 'image/png';
}

export interface PlacedPage {
  width: number;
  height: number;
  /** The page picture that lies behind everything. */
  background?: { data: Uint8Array; mime: 'image/jpeg' | 'image/png' };
  /** The page's photos, bottom to top: above the background, behind the text. */
  pictures?: PlacedPicture[];
  lines: PlacedLine[];
  /** Text frames whose lines are not laid out yet (see layoutPlacedBoxes). */
  boxes?: PlacedBox[];
}

/** A text frame as the document has it: where it is, and its paragraphs. */
export interface PlacedBox {
  x: number;
  y: number;
  width: number;
  paragraphs: Array<{
    /** Exact height of every line of the paragraph, points. */
    lineHeight: number;
    /** The paragraph's text; more than one entry where it has line breaks of its own. */
    lines: FixedRun[][];
  }>;
}

/**
 * Turns the text frames of the pages into placed lines, the way a word processor does: each
 * paragraph is wrapped into its frame's width with the metrics of the written font, every line is
 * as high as its paragraph says and has its baseline four fifths of that below its top (measured,
 * see fixedFrames.ts). Without metrics nothing is wrapped (every paragraph line is one line).
 */
export function layoutPlacedBoxes(pages: PlacedPage[], measure?: MeasureText): void {
  for (const page of pages) {
    for (const box of page.boxes ?? []) {
      let top = box.y;
      for (const para of box.paragraphs) {
        for (const hard of para.lines) {
          // An empty line (an empty paragraph, two line breaks in a row) still takes its height.
          const wrapped = (measure ? wrapRuns(hard, box.width, measure) : null) ?? [hard];
          for (const runs of wrapped.length > 0 ? wrapped : [[]]) {
            if (runs.some((r) => r.text.trim())) page.lines.push({ baseline: top + frameAscent(para.lineHeight), segments: [{ x: box.x, runs }] });
            top += para.lineHeight;
          }
        }
      }
    }
    delete page.boxes;
  }
}

/** A picture as the document refers to it, before its bytes are loaded. */
interface PictureRef { source: string; x: number; y: number; width: number; height: number; z: number }

/**
 * Loads the pictures a page refers to. The one that covers the whole page is its background;
 * the others keep their stacking order.
 */
async function attachPictures(page: PlacedPage, refs: PictureRef[], load: (source: string) => Promise<{ data: Uint8Array; mime: 'image/jpeg' | 'image/png' } | null>): Promise<boolean> {
  const ordered = [...refs].sort((a, b) => a.z - b.z);
  for (const ref of ordered) {
    const loaded = await load(ref.source);
    if (!loaded) return false;
    const wholePage = ref.x < 1 && ref.y < 1 && ref.width > page.width - 1 && ref.height > page.height - 1;
    if (wholePage && !page.background && !page.pictures) page.background = loaded;
    else (page.pictures ??= []).push({ x: ref.x, y: ref.y, width: ref.width, height: ref.height, ...loaded });
  }
  return true;
}

/** The same view of a layout that has not been written yet (what the writers are given). */
export function placedLinesOf(layout: FixedPageLayout): PlacedLine[] {
  const out: PlacedLine[] = [];
  const walk = (blocks: FixedBlock[]): void => {
    for (const b of blocks) {
      if (b.kind === 'text') for (const l of b.lines) out.push({ baseline: l.baseline, segments: l.segments.map((s) => ({ x: s.x, runs: s.runs })) });
      else for (const c of b.columns) walk(c.blocks);
    }
  };
  walk(layout.blocks);
  return out;
}

/** Thrown inside the readers for "this is not a positioned document"; never leaves this file. */
class NotPositioned extends Error {}
const no = (why: string): never => { throw new NotPositioned(why); };

/** Content taller than its page would have been broken by a word processor; then this reading is wrong. */
const PAGE_OVERFLOW_PT = 2;

function childEls(el: Element | null, local?: string): Element[] {
  const out: Element[] = [];
  if (!el) return out;
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (!local || (n as Element).localName === local)) out.push(n as Element);
  }
  return out;
}
const childEl = (el: Element | null, local: string): Element | null => childEls(el, local)[0] ?? null;

function descendant(el: Element, local: string): Element | null {
  for (const c of childEls(el)) {
    if (c.localName === local) return c;
    const d = descendant(c, local);
    if (d) return d;
  }
  return null;
}

/** An attribute by namespace; "" (what some DOM implementations return for a missing one) = absent. */
function attrNs(el: Element | null, ns: string, name: string): string | null {
  if (!el) return null;
  const v = el.getAttributeNS(ns, name);
  return v === null || v === '' ? null : v;
}

function parseXml(xml: string): Element {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.documentElement;
  if (!root || doc.getElementsByTagName('parsererror').length > 0) return no('xml');
  return root;
}

function imageMime(path: string): 'image/jpeg' | 'image/png' {
  if (/\.png$/i.test(path)) return 'image/png';
  if (/\.jpe?g$/i.test(path)) return 'image/jpeg';
  return no('picture type');
}

interface Flow { lines: PlacedLine[]; height: number }

/** Lines gathered while walking one paragraph: a segment starts at an indent or a tab stop. */
class LineBuilder {
  readonly lines: PlacedSegment[][] = [[]];
  private seg: PlacedSegment | null = null;
  private tabCount = 0;
  constructor(private readonly originX: number, private readonly indent: number, private readonly tabs: number[]) {}
  tab(): void {
    const pos = this.tabs[this.tabCount++];
    if (pos === undefined) return no('tab without a stop');
    this.seg = { x: this.originX + pos, runs: [] };
    this.lines[this.lines.length - 1]!.push(this.seg);
  }
  lineBreak(): void {
    this.lines.push([]);
    this.seg = null;
    this.tabCount = 0;
  }
  text(run: FixedRun): void {
    if (!run.text) return;
    if (!this.seg) {
      this.seg = { x: this.originX + this.indent, runs: [] };
      this.lines[this.lines.length - 1]!.push(this.seg);
    }
    this.seg.runs.push(run);
  }
  /** The paragraph as placed lines; `top` is where its first line box starts. */
  place(top: number, lineHeight: number): PlacedLine[] {
    const out: PlacedLine[] = [];
    this.lines.forEach((segs, i) => {
      const segments = segs.filter((s) => s.runs.length > 0);
      if (segments.length === 0) return;
      const size = Math.max(...segments.flatMap((s) => s.runs.map((r) => r.fontSize)));
      out.push({ baseline: top + (i + 1) * lineHeight - FIXED_DESCENT * size, segments });
    });
    return out;
  }
}

// ---------------------------------------------------------------------------------------- Word

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
/** DrawingML measures in English Metric Units. */
const EMU_PER_PT = 12700;
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const wAttr = (el: Element | null, name: string): string | null => attrNs(el, W_NS, name);

/** Twentieths of a point -> points; a missing value is 0, a malformed one is not our document. */
function twips(v: string | null): number {
  if (v === null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n / 20 : no('measure');
}

function wOn(parent: Element | null, name: string): boolean {
  const el = childEl(parent, name);
  if (!el) return false;
  const v = wAttr(el, 'val');
  return !(v === '0' || v === 'false' || v === 'off' || v === 'none');
}

function docxRunFormat(rPr: Element | null, link: string | undefined): Omit<FixedRun, 'text'> {
  const fonts = childEl(rPr, 'rFonts');
  const sz = Number(wAttr(childEl(rPr, 'sz'), 'val'));
  const color = wAttr(childEl(rPr, 'color'), 'val');
  const format: Omit<FixedRun, 'text'> = {
    font: wAttr(fonts, 'ascii') ?? wAttr(fonts, 'hAnsi') ?? 'Arial',
    fontSize: sz > 0 ? sz / 2 : 10,
    bold: wOn(rPr, 'b'),
    italic: wOn(rPr, 'i'),
    color: color && /^[0-9a-f]{6}$/i.test(color) ? color : '000000',
    scale: Number(wAttr(childEl(rPr, 'w'), 'val')) || 100,
    spacingTw: Number(wAttr(childEl(rPr, 'spacing'), 'val')) || 0,
    // half-points
    raise: (Number(wAttr(childEl(rPr, 'position'), 'val')) || 0) / 2,
  };
  if (wOn(rPr, 'u')) format.underline = true;
  if (link) format.link = link;
  return format;
}

interface DocxContext {
  /** Relationship id -> target (a media path inside the package, or a link address). */
  rels: Map<string, string>;
}

interface DocxParagraph extends Flow { pictures: PictureRef[] }

function readDocxParagraph(p: Element, originX: number, top: number, ctx: DocxContext): DocxParagraph {
  const pPr = childEl(p, 'pPr');
  const spacing = childEl(pPr, 'spacing');
  if (wAttr(spacing, 'lineRule') !== 'exact') return no('a paragraph without an exact line height');
  const lineHeight = twips(wAttr(spacing, 'line'));
  if (!(lineHeight > 0)) return no('line height');
  const before = twips(wAttr(spacing, 'before'));
  const after = twips(wAttr(spacing, 'after'));
  const ind = childEl(pPr, 'ind');
  const indent = twips(wAttr(ind, 'left') ?? wAttr(ind, 'start'));
  const tabs = childEls(childEl(pPr, 'tabs'), 'tab')
    .filter((t) => wAttr(t, 'val') !== 'clear')
    .map((t) => twips(wAttr(t, 'pos')))
    .sort((a, b) => a - b);

  const builder = new LineBuilder(originX, indent, tabs);
  const pictures: PictureRef[] = [];
  const visitRun = (r: Element, link?: string): void => {
    const format = docxRunFormat(childEl(r, 'rPr'), link);
    for (const c of childEls(r)) {
      if (c.localName === 'tab') builder.tab();
      else if (c.localName === 'br' || c.localName === 'cr') {
        // A page or column break in the middle of a paragraph is not something the writer makes.
        const type = wAttr(c, 'type');
        if (type && type !== 'textWrapping') return no('break inside a paragraph');
        builder.lineBreak();
      } else if (c.localName === 't') builder.text({ ...format, text: c.textContent ?? '' });
      else if (c.localName === 'drawing') {
        // Only pictures anchored to the page, behind the text (the page picture and the photos
        // above it). An inline picture takes part in the flow, which this reader does not model.
        const anchor = childEl(c, 'anchor');
        const blip = anchor ? descendant(anchor, 'blip') : null;
        const rel = attrNs(blip, R_NS, 'embed');
        if (!anchor || anchor.getAttribute('behindDoc') !== '1' || !rel) return no('a picture that is not anchored behind the text');
        const offset = (axis: string): number => {
          const pos = childEl(anchor, axis);
          if (pos?.getAttribute('relativeFrom') !== 'page') return no('a picture not positioned from the page');
          return (Number(childEl(pos, 'posOffset')?.textContent) || 0) / EMU_PER_PT;
        };
        const extent = childEl(anchor, 'extent');
        pictures.push({
          source: rel, x: offset('positionH'), y: offset('positionV'),
          width: (Number(extent?.getAttribute('cx')) || 0) / EMU_PER_PT, height: (Number(extent?.getAttribute('cy')) || 0) / EMU_PER_PT,
          z: Number(anchor.getAttribute('relativeHeight')) || 0,
        });
      } else if (c.localName === 'pict' || c.localName === 'object') return no('embedded object');
    }
  };
  for (const c of childEls(p)) {
    if (c.localName === 'r') visitRun(c);
    else if (c.localName === 'hyperlink') {
      const id = attrNs(c, R_NS, 'id');
      const link = id ? ctx.rels.get(id) : undefined;
      for (const r of childEls(c, 'r')) visitRun(r, link);
    }
  }
  const lines = builder.place(top + before, lineHeight);
  return { lines, height: before + lineHeight * builder.lines.length + after, pictures };
}

function readDocxTable(tbl: Element, originX: number, top: number, ctx: DocxContext): Flow {
  const rows = childEls(tbl, 'tr');
  if (rows.length !== 1) return no('a table with several rows');
  const row = rows[0]!;
  const grid = childEls(childEl(tbl, 'tblGrid'), 'gridCol').map((g) => twips(wAttr(g, 'w')));
  const minHeight = twips(wAttr(childEl(childEl(row, 'trPr'), 'trHeight'), 'val'));
  let x = originX + twips(wAttr(childEl(childEl(tbl, 'tblPr'), 'tblInd'), 'w'));
  let height = minHeight;
  const lines: PlacedLine[] = [];
  childEls(row, 'tc').forEach((tc, i) => {
    const tcPr = childEl(tc, 'tcPr');
    if (childEl(tcPr, 'gridSpan') || childEl(tcPr, 'vMerge')) return no('merged cells');
    const width = grid[i] ?? twips(wAttr(childEl(tcPr, 'tcW'), 'w'));
    const inner = readDocxBlocks(childEls(tc), x, top, ctx);
    lines.push(...inner.lines);
    height = Math.max(height, inner.height);
    x += width;
  });
  return { lines, height };
}

/** Paragraphs and tables of a table cell, stacked from `top`. */
function readDocxBlocks(children: Element[], originX: number, top: number, ctx: DocxContext): Flow {
  const lines: PlacedLine[] = [];
  let y = top;
  for (const el of children) {
    let flow: Flow | null = null;
    if (el.localName === 'p') {
      const p = readDocxParagraph(el, originX, y, ctx);
      if (p.pictures.length > 0) return no('a picture inside a table');
      flow = p;
    } else if (el.localName === 'tbl') flow = readDocxTable(el, originX, y, ctx);
    if (!flow) continue;
    lines.push(...flow.lines);
    y += flow.height;
  }
  return { lines, height: y - top };
}

function parseRelationships(xml: string | undefined): Map<string, string> {
  const rels = new Map<string, string>();
  if (!xml) return rels;
  for (const r of childEls(parseXml(xml), 'Relationship')) {
    const id = r.getAttribute('Id');
    const target = r.getAttribute('Target');
    if (id && target) rels.set(id, target);
  }
  return rels;
}

/**
 * The pages of a positioned Word document, or null when the document is not one (see the top of
 * this file).
 */
export async function readFixedDocx(file: Blob): Promise<PlacedPage[] | null> {
  try {
    const JSZip = (await import('jszip')).default;
    // Not a package at all: not ours to report, the ordinary reader has its own message.
    const zip = await JSZip.loadAsync(await file.arrayBuffer()).catch(() => null);
    if (!zip) return null;
    const docXml = await zip.file('word/document.xml')?.async('string');
    if (!docXml) return null;
    const body = childEl(parseXml(docXml), 'body');
    if (!body) return null;
    const ctx: DocxContext = { rels: parseRelationships(await zip.file('word/_rels/document.xml.rels')?.async('string')) };

    // A section's properties sit in its LAST paragraph (or, for the last section, at the end of
    // the body), so the page size of a paragraph is only known once its section is closed.
    const sections: Array<{ sectPr: Element; els: Element[] }> = [];
    let open: Element[] = [];
    for (const el of childEls(body)) {
      if (el.localName === 'sectPr') { sections.push({ sectPr: el, els: open }); open = []; continue; }
      open.push(el);
      const inner = el.localName === 'p' ? childEl(childEl(el, 'pPr'), 'sectPr') : null;
      if (inner) { sections.push({ sectPr: inner, els: open }); open = []; }
    }
    if (sections.length === 0 || open.length > 0) return null;

    const pages: PlacedPage[] = [];
    const refs = new Map<PlacedPage, PictureRef[]>();
    for (const section of sections) {
      const size = childEl(section.sectPr, 'pgSz');
      const margin = childEl(section.sectPr, 'pgMar');
      const width = twips(wAttr(size, 'w'));
      const height = twips(wAttr(size, 'h'));
      if (!(width > 0 && height > 0)) return null;
      if (!margin || ['top', 'bottom', 'left', 'right'].some((side) => twips(wAttr(margin, side)) !== 0)) return null;

      let page: PlacedPage | null = null;
      let y = 0;
      const startPage = (): PlacedPage => {
        const fresh: PlacedPage = { width, height, lines: [] };
        pages.push(fresh);
        refs.set(fresh, []);
        y = 0;
        return fresh;
      };
      for (const el of section.els) {
        if (el.localName !== 'p' && el.localName !== 'tbl') continue;
        if (!page || (el.localName === 'p' && wOn(childEl(el, 'pPr'), 'pageBreakBefore'))) page = startPage();
        if (el.localName === 'p') {
          const p = readDocxParagraph(el, 0, y, ctx);
          refs.get(page)!.push(...p.pictures);
          page.lines.push(...p.lines);
          y += p.height;
        } else {
          const t = readDocxTable(el, 0, y, ctx);
          page.lines.push(...t.lines);
          y += t.height;
        }
        if (y > height + PAGE_OVERFLOW_PT) return null;
      }
    }
    if (pages.length === 0) return null;

    const loaded = new Map<string, Uint8Array>();
    for (const page of pages) {
      const ok = await attachPictures(page, refs.get(page) ?? [], async (rel) => {
        const target = ctx.rels.get(rel);
        if (!target) return null;
        const path = target.startsWith('/') ? target.slice(1) : `word/${target}`;
        let data = loaded.get(path);
        if (!data) {
          const entry = zip.file(path);
          if (!entry) return null;
          data = await entry.async('uint8array');
          loaded.set(path, data);
        }
        return { data, mime: imageMime(path) };
      });
      if (!ok) return null;
    }
    return pages;
  } catch (err) {
    if (err instanceof NotPositioned) return null;
    throw err;
  }
}

// -------------------------------------------------------------------------------- OpenDocument

const ODF = {
  office: 'urn:oasis:names:tc:opendocument:xmlns:office:1.0',
  style: 'urn:oasis:names:tc:opendocument:xmlns:style:1.0',
  text: 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
  draw: 'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0',
  svg: 'urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0',
  table: 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
  fo: 'urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0',
  xlink: 'http://www.w3.org/1999/xlink',
};

const UNIT_PT: Record<string, number> = { pt: 1, in: 72, cm: 72 / 2.54, mm: 72 / 25.4, pc: 12, px: 0.75 };

/** An ODF length ("12.5pt", "0.5cm") in points; null when absent or not a length (e.g. "120%"). */
function odfLength(v: string | null): number | null {
  if (v === null) return null;
  const m = /^(-?\d*\.?\d+)(pt|in|cm|mm|pc|px)$/.exec(v.trim());
  return m ? Number(m[1]) * UNIT_PT[m[2]!]! : null;
}
const odfPercent = (v: string | null): number | null => {
  const m = v ? /^(-?\d*\.?\d+)%/.exec(v.trim()) : null;
  return m ? Number(m[1]) : null;
};

interface OdfParagraphStyle { before: number; after: number; line: number | null; indent: number; tabs: number[]; master?: string; breakBefore: boolean }
/** A run's format while it is being inherited: the raise stays a share of the (final) font size. */
type OdfFormat = Omit<FixedRun, 'text' | 'raise'> & { raisePercent: number };

interface OdfStyles {
  paragraph: Map<string, OdfParagraphStyle>;
  /** Text properties a style SETS; what it leaves out is inherited (paragraph -> span -> span). */
  text: Map<string, Partial<OdfFormat>>;
  /** The same for paragraph styles: the format of text written directly in the paragraph. */
  paragraphText: Map<string, Partial<OdfFormat>>;
  tableLeft: Map<string, number>;
  columnWidth: Map<string, number>;
  rowHeight: Map<string, number>;
}

function odfTextProperties(tp: Element | null): Partial<OdfFormat> {
  const set: Partial<OdfFormat> = {};
  if (!tp) return set;
  const font = attrNs(tp, ODF.style, 'font-name');
  const size = odfLength(attrNs(tp, ODF.fo, 'font-size'));
  const weight = attrNs(tp, ODF.fo, 'font-weight');
  const slant = attrNs(tp, ODF.fo, 'font-style');
  const color = attrNs(tp, ODF.fo, 'color');
  const underline = attrNs(tp, ODF.style, 'text-underline-style');
  const scale = odfPercent(attrNs(tp, ODF.style, 'text-scale'));
  const spacing = odfLength(attrNs(tp, ODF.fo, 'letter-spacing'));
  // "12% 100%": raised by 12 % of the font size
  const position = odfPercent(attrNs(tp, ODF.style, 'text-position'));
  if (font) set.font = font;
  if (size !== null) set.fontSize = size;
  if (weight) set.bold = weight === 'bold' || Number(weight) >= 600;
  if (slant) set.italic = slant === 'italic' || slant === 'oblique';
  if (color && /^#[0-9a-f]{6}$/i.test(color)) set.color = color.slice(1);
  if (underline) set.underline = underline !== 'none';
  if (scale !== null) set.scale = scale;
  if (spacing !== null) set.spacingTw = Math.round(spacing * 20);
  if (position !== null) set.raisePercent = position;
  return set;
}

function readOdfStyles(root: Element): OdfStyles {
  const styles: OdfStyles = { paragraph: new Map(), text: new Map(), paragraphText: new Map(), tableLeft: new Map(), columnWidth: new Map(), rowHeight: new Map() };
  for (const s of childEls(childEl(root, 'automatic-styles'), 'style')) {
    const name = attrNs(s, ODF.style, 'name');
    const family = attrNs(s, ODF.style, 'family');
    if (!name) continue;
    if (family === 'paragraph') {
      const pp = childEl(s, 'paragraph-properties');
      const tabs = childEls(childEl(pp, 'tab-stops'), 'tab-stop')
        .map((t) => odfLength(attrNs(t, ODF.style, 'position')))
        .filter((t): t is number => t !== null)
        .sort((a, b) => a - b);
      const style: OdfParagraphStyle = {
        before: odfLength(attrNs(pp, ODF.fo, 'margin-top')) ?? 0,
        after: odfLength(attrNs(pp, ODF.fo, 'margin-bottom')) ?? 0,
        line: odfLength(attrNs(pp, ODF.fo, 'line-height')),
        indent: (odfLength(attrNs(pp, ODF.fo, 'margin-left')) ?? 0) + (odfLength(attrNs(pp, ODF.fo, 'text-indent')) ?? 0),
        tabs,
        breakBefore: attrNs(pp, ODF.fo, 'break-before') === 'page',
      };
      const master = attrNs(s, ODF.style, 'master-page-name');
      if (master) style.master = master;
      styles.paragraph.set(name, style);
      styles.paragraphText.set(name, odfTextProperties(childEl(s, 'text-properties')));
    } else if (family === 'text') {
      styles.text.set(name, odfTextProperties(childEl(s, 'text-properties')));
    } else if (family === 'table') {
      styles.tableLeft.set(name, odfLength(attrNs(childEl(s, 'table-properties'), ODF.fo, 'margin-left')) ?? 0);
    } else if (family === 'table-column') {
      const w = odfLength(attrNs(childEl(s, 'table-column-properties'), ODF.style, 'column-width'));
      if (w !== null) styles.columnWidth.set(name, w);
    } else if (family === 'table-row') {
      const rp = childEl(s, 'table-row-properties');
      styles.rowHeight.set(name, odfLength(attrNs(rp, ODF.style, 'min-row-height')) ?? odfLength(attrNs(rp, ODF.style, 'row-height')) ?? 0);
    }
  }
  return styles;
}

interface OdfParagraph extends Flow { pictures: PictureRef[]; boxes: PlacedBox[]; style: OdfParagraphStyle }

/**
 * The text of one paragraph into `builder`; frames it anchors are handed to `onFrame`.
 */
function walkOdfParagraph(p: Element, styles: OdfStyles, builder: LineBuilder, onFrame: (frame: Element) => void): void {
  const styleName = attrNs(p, ODF.text, 'style-name') ?? '';
  // Text written directly in the paragraph takes the paragraph style's own text properties.
  // This site's writer puts every run in a span, but OpenOffice, saving the same document
  // again, moves a paragraph's single format up to the paragraph — read with a default size,
  // a 34 pt title came back 5 pt too low (its baseline hangs on its font size).
  const base: OdfFormat = {
    font: 'Arial', fontSize: 10, bold: false, italic: false, color: '000000', scale: 100, spacingTw: 0, raisePercent: 0,
    ...styles.paragraphText.get(styleName),
  };
  const emit = (format: OdfFormat, text: string): void => {
    const { raisePercent, ...rest } = format;
    if (!rest.underline) delete rest.underline;
    builder.text({ ...rest, raise: raisePercent / 100 * rest.fontSize, text });
  };

  const walk = (el: Element, format: OdfFormat): void => {
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) { emit(format, n.nodeValue ?? ''); continue; }
      if (n.nodeType !== 1) continue;
      const c = n as Element;
      if (c.localName === 'span') {
        walk(c, { ...format, ...styles.text.get(attrNs(c, ODF.text, 'style-name') ?? '') });
      } else if (c.localName === 'a') {
        const href = attrNs(c, ODF.xlink, 'href');
        walk(c, href ? { ...format, link: href } : format);
      } else if (c.localName === 's') {
        emit(format, ' '.repeat(Number(attrNs(c, ODF.text, 'c')) || 1));
      } else if (c.localName === 'tab') builder.tab();
      else if (c.localName === 'line-break') builder.lineBreak();
      else if (c.localName === 'frame') onFrame(c);
      else if (c.localName === 'soft-page-break' || c.localName === 'bookmark' || c.localName === 'bookmark-start' || c.localName === 'bookmark-end') {
        // carry no text
      } else return no(`<text:${c.localName}>`);
    }
  };
  walk(p, base);
}

/** A text frame: its place and the paragraphs in it. */
function readOdfBox(frame: Element, box: Element, styles: OdfStyles): PlacedBox {
  const len = (name: string): number => odfLength(attrNs(frame, ODF.svg, name)) ?? 0;
  const paragraphs: PlacedBox['paragraphs'] = [];
  for (const p of childEls(box)) {
    if (p.localName !== 'p' && p.localName !== 'h') return no('a frame with something other than paragraphs');
    const style = styles.paragraph.get(attrNs(p, ODF.text, 'style-name') ?? '');
    // As in the body: only a line of fixed height has a baseline this reader can name.
    if (!style || style.line === null || !(style.line > 0)) return no('a paragraph in a frame without a fixed line height');
    if (style.before > 0.05 || style.after > 0.05 || Math.abs(style.indent) > 0.05) return no('a paragraph in a frame with margins');
    const builder = new LineBuilder(0, 0, []);
    walkOdfParagraph(p, styles, builder, () => no('a frame inside a frame'));
    paragraphs.push({ lineHeight: style.line, lines: builder.lines.length > 0 ? builder.lines.map((segs) => segs.flatMap((s) => s.runs)) : [[]] });
  }
  const width = len('width');
  if (!(width > 0)) return no('a frame without a width');
  return { x: len('x'), y: len('y'), width, paragraphs };
}

function readOdfParagraph(p: Element, originX: number, top: number, styles: OdfStyles): OdfParagraph {
  const style = styles.paragraph.get(attrNs(p, ODF.text, 'style-name') ?? '');
  if (!style || style.line === null || !(style.line > 0)) return no('a paragraph without a fixed line height');
  const builder = new LineBuilder(originX, style.indent, style.tabs);
  const pictures: PictureRef[] = [];
  const boxes: PlacedBox[] = [];
  walkOdfParagraph(p, styles, builder, (frame) => {
    const len = (name: string): number => odfLength(attrNs(frame, ODF.svg, name)) ?? 0;
    const href = attrNs(childEl(frame, 'image'), ODF.xlink, 'href');
    const box = childEl(frame, 'text-box');
    if (href) pictures.push({ source: href, x: len('x'), y: len('y'), width: len('width'), height: len('height'), z: Number(attrNs(frame, ODF.draw, 'z-index')) || 0 });
    else if (box) boxes.push(readOdfBox(frame, box, styles));
    else no('a frame that is neither a picture nor a text box');
  });
  return {
    lines: builder.place(top + style.before, style.line),
    height: style.before + style.line * builder.lines.length + style.after,
    style,
    pictures,
    boxes,
  };
}

function readOdfTable(table: Element, originX: number, top: number, styles: OdfStyles): Flow {
  const rows = childEls(table, 'table-row');
  if (rows.length !== 1) return no('a table with several rows');
  const row = rows[0]!;
  const widths: number[] = [];
  for (const col of childEls(table, 'table-column')) {
    const w = styles.columnWidth.get(attrNs(col, ODF.table, 'style-name') ?? '');
    if (w === undefined) return no('column width');
    const repeat = Number(attrNs(col, ODF.table, 'number-columns-repeated')) || 1;
    for (let i = 0; i < repeat; i++) widths.push(w);
  }
  let x = originX + (styles.tableLeft.get(attrNs(table, ODF.table, 'style-name') ?? '') ?? 0);
  let height = styles.rowHeight.get(attrNs(row, ODF.table, 'style-name') ?? '') ?? 0;
  const lines: PlacedLine[] = [];
  childEls(row, 'table-cell').forEach((cell, i) => {
    if (attrNs(cell, ODF.table, 'number-columns-spanned') || attrNs(cell, ODF.table, 'number-rows-spanned')) return no('merged cells');
    const width = widths[i];
    if (width === undefined) return no('cell without a column');
    const inner = readOdfBlocks(childEls(cell), x, top, styles);
    lines.push(...inner.lines);
    height = Math.max(height, inner.height);
    x += width;
  });
  return { lines, height };
}

function readOdfBlocks(children: Element[], originX: number, top: number, styles: OdfStyles): Flow {
  const lines: PlacedLine[] = [];
  let y = top;
  for (const el of children) {
    let flow: Flow | null = null;
    if (el.localName === 'p' || el.localName === 'h') {
      const p = readOdfParagraph(el, originX, y, styles);
      if (p.pictures.length > 0 || p.boxes.length > 0) return no('a picture or a frame inside a table');
      flow = p;
    } else if (el.localName === 'table') flow = readOdfTable(el, originX, y, styles);
    if (!flow) continue;
    lines.push(...flow.lines);
    y += flow.height;
  }
  return { lines, height: y - top };
}

/** Master page name -> page size; null when a page has margins (positions would not be page-relative). */
function readOdfPageSizes(stylesRoot: Element): Map<string, { width: number; height: number }> | null {
  const layouts = new Map<string, { width: number; height: number }>();
  for (const l of childEls(childEl(stylesRoot, 'automatic-styles'), 'page-layout')) {
    const name = attrNs(l, ODF.style, 'name');
    const props = childEl(l, 'page-layout-properties');
    const width = odfLength(attrNs(props, ODF.fo, 'page-width'));
    const height = odfLength(attrNs(props, ODF.fo, 'page-height'));
    if (!name || width === null || height === null) continue;
    const all = odfLength(attrNs(props, ODF.fo, 'margin')) ?? 0;
    if (['margin-top', 'margin-bottom', 'margin-left', 'margin-right'].some((m) => (odfLength(attrNs(props, ODF.fo, m)) ?? all) !== 0)) return null;
    layouts.set(name, { width, height });
  }
  const masters = new Map<string, { width: number; height: number }>();
  for (const m of childEls(childEl(stylesRoot, 'master-styles'), 'master-page')) {
    const name = attrNs(m, ODF.style, 'name');
    const layout = layouts.get(attrNs(m, ODF.style, 'page-layout-name') ?? '');
    if (name && layout) masters.set(name, layout);
  }
  return masters;
}

/** The pages of a positioned OpenDocument text, or null when the document is not one. */
export async function readFixedOdt(file: Blob): Promise<PlacedPage[] | null> {
  try {
    const JSZip = (await import('jszip')).default;
    // Not a package at all: not ours to report, the ordinary reader has its own message.
    const zip = await JSZip.loadAsync(await file.arrayBuffer()).catch(() => null);
    if (!zip) return null;
    const contentXml = await zip.file('content.xml')?.async('string');
    const stylesXml = await zip.file('styles.xml')?.async('string');
    if (!contentXml || !stylesXml) return null;
    const content = parseXml(contentXml);
    const masters = readOdfPageSizes(parseXml(stylesXml));
    if (!masters || masters.size === 0) return null;
    const styles = readOdfStyles(content);
    const text = childEl(childEl(content, 'body'), 'text');
    if (!text) return null;

    const pages: PlacedPage[] = [];
    const refs = new Map<PlacedPage, PictureRef[]>();
    let size = masters.get('Standard') ?? null;
    let page: PlacedPage | null = null;
    let y = 0;
    for (const el of childEls(text)) {
      const isParagraph = el.localName === 'p' || el.localName === 'h';
      if (!isParagraph && el.localName !== 'table') continue;
      let startsPage = !page;
      if (isParagraph) {
        const style = styles.paragraph.get(attrNs(el, ODF.text, 'style-name') ?? '');
        if (style?.master) {
          const next = masters.get(style.master);
          if (!next) return null;
          size = next;
          startsPage = true;
        } else if (style?.breakBefore) startsPage = true;
      }
      if (startsPage) {
        if (!size) return null;
        page = { width: size.width, height: size.height, lines: [] };
        pages.push(page);
        refs.set(page, []);
        y = 0;
      }
      if (!page) return null;
      if (isParagraph) {
        const p = readOdfParagraph(el, 0, y, styles);
        refs.get(page)!.push(...p.pictures);
        if (p.boxes.length > 0) (page.boxes ??= []).push(...p.boxes);
        page.lines.push(...p.lines);
        y += p.height;
      } else {
        const t = readOdfTable(el, 0, y, styles);
        page.lines.push(...t.lines);
        y += t.height;
      }
      if (y > page.height + PAGE_OVERFLOW_PT) return null;
    }
    if (pages.length === 0) return null;

    const loaded = new Map<string, Uint8Array>();
    for (const p of pages) {
      const ok = await attachPictures(p, refs.get(p) ?? [], async (href) => {
        const path = href.startsWith('./') ? href.slice(2) : href;
        let data = loaded.get(path);
        if (!data) {
          const entry = zip.file(path);
          if (!entry) return null;
          data = await entry.async('uint8array');
          loaded.set(path, data);
        }
        return { data, mime: imageMime(path) };
      });
      if (!ok) return null;
    }
    return pages;
  } catch (err) {
    if (err instanceof NotPositioned) return null;
    throw err;
  }
}
