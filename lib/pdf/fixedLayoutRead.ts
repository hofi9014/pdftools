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

import type { FixedBlock, FixedPageLayout, FixedRun } from './fixedLayout';
import { FIXED_DESCENT } from './fixedLayout';

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

export interface PlacedPage {
  width: number;
  height: number;
  /** The page picture that lies behind the text. */
  background?: { data: Uint8Array; mime: 'image/jpeg' | 'image/png' };
  lines: PlacedLine[];
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

interface DocxParagraph extends Flow { pictureRel?: string }

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
  let pictureRel: string | undefined;
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
        // Only the page picture: anchored, behind the text. An inline picture takes part in the
        // flow, which this reader does not model.
        const anchor = childEl(c, 'anchor');
        const blip = anchor ? descendant(anchor, 'blip') : null;
        const rel = attrNs(blip, R_NS, 'embed');
        if (!anchor || anchor.getAttribute('behindDoc') !== '1' || !rel) return no('a picture that is not a page background');
        pictureRel = rel;
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
  const out: DocxParagraph = { lines, height: before + lineHeight * builder.lines.length + after };
  if (pictureRel) out.pictureRel = pictureRel;
  return out;
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
      if (p.pictureRel) return no('a picture inside a table');
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

    const pages: Array<PlacedPage & { pictureRel?: string }> = [];
    for (const section of sections) {
      const size = childEl(section.sectPr, 'pgSz');
      const margin = childEl(section.sectPr, 'pgMar');
      const width = twips(wAttr(size, 'w'));
      const height = twips(wAttr(size, 'h'));
      if (!(width > 0 && height > 0)) return null;
      if (!margin || ['top', 'bottom', 'left', 'right'].some((side) => twips(wAttr(margin, side)) !== 0)) return null;

      let page: (PlacedPage & { pictureRel?: string }) | null = null;
      let y = 0;
      const startPage = (): PlacedPage & { pictureRel?: string } => {
        const fresh = { width, height, lines: [] as PlacedLine[] };
        pages.push(fresh);
        y = 0;
        return fresh;
      };
      for (const el of section.els) {
        if (el.localName !== 'p' && el.localName !== 'tbl') continue;
        if (!page || (el.localName === 'p' && wOn(childEl(el, 'pPr'), 'pageBreakBefore'))) page = startPage();
        if (el.localName === 'p') {
          const p = readDocxParagraph(el, 0, y, ctx);
          if (p.pictureRel) page.pictureRel = p.pictureRel;
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

    const pictures = new Map<string, Uint8Array>();
    for (const page of pages) {
      const rel = page.pictureRel;
      delete page.pictureRel;
      if (!rel) continue;
      const target = ctx.rels.get(rel);
      if (!target) return null;
      const path = target.startsWith('/') ? target.slice(1) : `word/${target}`;
      let data = pictures.get(path);
      if (!data) {
        const entry = zip.file(path);
        if (!entry) return null;
        data = await entry.async('uint8array');
        pictures.set(path, data);
      }
      page.background = { data, mime: imageMime(path) };
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
interface OdfStyles {
  paragraph: Map<string, OdfParagraphStyle>;
  text: Map<string, Omit<FixedRun, 'text'>>;
  tableLeft: Map<string, number>;
  columnWidth: Map<string, number>;
  rowHeight: Map<string, number>;
}

function readOdfStyles(root: Element): OdfStyles {
  const styles: OdfStyles = { paragraph: new Map(), text: new Map(), tableLeft: new Map(), columnWidth: new Map(), rowHeight: new Map() };
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
    } else if (family === 'text') {
      const tp = childEl(s, 'text-properties');
      const size = odfLength(attrNs(tp, ODF.fo, 'font-size')) ?? 10;
      const color = attrNs(tp, ODF.fo, 'color');
      const underline = attrNs(tp, ODF.style, 'text-underline-style');
      const format: Omit<FixedRun, 'text'> = {
        font: attrNs(tp, ODF.style, 'font-name') ?? 'Arial',
        fontSize: size,
        bold: attrNs(tp, ODF.fo, 'font-weight') === 'bold',
        italic: attrNs(tp, ODF.fo, 'font-style') === 'italic',
        color: color && /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1) : '000000',
        scale: odfPercent(attrNs(tp, ODF.style, 'text-scale')) ?? 100,
        spacingTw: Math.round((odfLength(attrNs(tp, ODF.fo, 'letter-spacing')) ?? 0) * 20),
        // "12% 100%": raised by 12 % of the font size
        raise: (odfPercent(attrNs(tp, ODF.style, 'text-position')) ?? 0) / 100 * size,
      };
      if (underline && underline !== 'none') format.underline = true;
      styles.text.set(name, format);
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

interface OdfParagraph extends Flow { picture?: string; style: OdfParagraphStyle }

function readOdfParagraph(p: Element, originX: number, top: number, styles: OdfStyles): OdfParagraph {
  const style = styles.paragraph.get(attrNs(p, ODF.text, 'style-name') ?? '');
  if (!style || style.line === null || !(style.line > 0)) return no('a paragraph without a fixed line height');
  const builder = new LineBuilder(originX, style.indent, style.tabs);
  const plain: Omit<FixedRun, 'text'> = { font: 'Arial', fontSize: 10, bold: false, italic: false, color: '000000', scale: 100, spacingTw: 0, raise: 0 };
  let picture: string | undefined;

  const walk = (el: Element, format: Omit<FixedRun, 'text'>): void => {
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) { builder.text({ ...format, text: n.nodeValue ?? '' }); continue; }
      if (n.nodeType !== 1) continue;
      const c = n as Element;
      if (c.localName === 'span') {
        const own = styles.text.get(attrNs(c, ODF.text, 'style-name') ?? '');
        walk(c, own ? { ...own, ...(format.link ? { link: format.link } : {}) } : format);
      } else if (c.localName === 'a') {
        const href = attrNs(c, ODF.xlink, 'href');
        walk(c, href ? { ...format, link: href } : format);
      } else if (c.localName === 's') {
        builder.text({ ...format, text: ' '.repeat(Number(attrNs(c, ODF.text, 'c')) || 1) });
      } else if (c.localName === 'tab') builder.tab();
      else if (c.localName === 'line-break') builder.lineBreak();
      else if (c.localName === 'frame') {
        const href = attrNs(childEl(c, 'image'), ODF.xlink, 'href');
        if (!href) return no('a frame that is not a page picture');
        picture = href;
      } else if (c.localName === 'soft-page-break' || c.localName === 'bookmark' || c.localName === 'bookmark-start' || c.localName === 'bookmark-end') {
        // carry no text
      } else return no(`<text:${c.localName}>`);
    }
  };
  walk(p, plain);
  const out: OdfParagraph = {
    lines: builder.place(top + style.before, style.line),
    height: style.before + style.line * builder.lines.length + style.after,
    style,
  };
  if (picture) out.picture = picture;
  return out;
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
      if (p.picture) return no('a picture inside a table');
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

    const pages: Array<PlacedPage & { picture?: string }> = [];
    let size = masters.get('Standard') ?? null;
    let page: (PlacedPage & { picture?: string }) | null = null;
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
        y = 0;
      }
      if (!page) return null;
      if (isParagraph) {
        const p = readOdfParagraph(el, 0, y, styles);
        if (p.picture) page.picture = p.picture;
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

    const pictures = new Map<string, Uint8Array>();
    for (const p of pages) {
      const path = p.picture;
      delete p.picture;
      if (!path) continue;
      let data = pictures.get(path);
      if (!data) {
        const entry = zip.file(path.replace(/^\.\//, ''));
        if (!entry) return null;
        data = await entry.async('uint8array');
        pictures.set(path, data);
      }
      p.background = { data, mime: imageMime(path) };
    }
    return pages;
  } catch (err) {
    if (err instanceof NotPositioned) return null;
    throw err;
  }
}
