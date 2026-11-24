// Tagged (structure-tree) HTML → PDF renderer — part 3 of the WCAG 2.2 / PDF accessibility
// follow-up series (see AGENTS.md FINDING "RTL" entry's neighbors and the audit report).
//
// The previous htmlToPdf() (still visible in git history) discarded ALL HTML structure before
// rendering (`html.replace(/<[^>]*>/g, '')`) — no headings, no lists, no tables, no images, no
// links, and (per the earlier audit step) no possibility of ever being a Tagged PDF, since there
// was no structure left to tag. This module replaces that: it parses the DOM (DOMParser — the
// same browser-native API already used elsewhere in this codebase, e.g. applyMetadataToXmp in
// client-pdf.ts — not a new dependency), renders each semantic block with pdf-lib, and builds a
// REAL /StructTreeRoot by hand (pdf-lib has no built-in tagging support, same situation as the
// PAdES signature feature's raw /Sig object construction).
//
// Scope/honesty, matching the audit's established "don't overclaim" standard: this produces a
// genuinely Tagged PDF (base ISO 32000 feature — correct reading order, headings, list/table
// structure, image alt text) for the common HTML subset the tool's own DOMPurify allow-list
// already advertises (app/html-to-pdf/page.tsx). The e2e sample document (headings, styled runs,
// a link, a list, a table, a quote, a rule, an image) passes the official veraPDF PDF/UA-1
// profile with 0 failed rules (2026-09-29, see AGENTS.md) — evidence for that sample, not a
// certification of every possible input. Links are tagged (/Link StructElem with an /OBJR to the
// annotation, /Contents = link text), header cells carry /Scope, and the catalog has XMP metadata
// with the PDF/UA identification. Explicitly out of scope: CSS styling (only semantic tags drive
// layout), colspan/rowspan, and nested lists beyond one level's visual indent. The link TEXT stays
// in its paragraph's marked content (the /Link element holds only the annotation reference).
// A table row whose wrapped cell content is taller than a whole page (found 2026-09-23, fixed
// 2026-09-24) is split into consecutive page-sized slices; each slice is emitted as its own /TR
// (a StructElem's content must stay on one page here), so such a row appears as several rows in
// the structure tree and gets a grid line at each slice boundary. Rows that fit a page are
// untouched.

import {
  PDFDocument, PDFName, PDFString, PDFArray, PDFOperator, PDFOperatorNames,
  rgb, type PDFFont, type PDFPage, type PDFRef, type PDFDict,
} from 'pdf-lib';

// ─── HTML → block model ───────────────────────────────────────────────────────────────────

interface InlineRun {
  text: string;
  bold: boolean;
  italic: boolean;
  sub: boolean;
  sup: boolean;
  link?: string;
  /** Inline code (<code>, <kbd>, <samp>, <tt>, a task-list checkbox): drawn in the monospace font. */
  code?: boolean;
  /** <del>, <s>, <strike>: drawn with a line through. */
  strike?: boolean;
}

/** A list item: its own text and the lists nested inside it (each a real /L inside the /LI). */
interface ListItem { runs: InlineRun[]; sublists: ListBlock[] }
interface ListBlock { ordered: boolean; items: ListItem[] }

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; runs: InlineRun[] }
  | { kind: 'paragraph'; runs: InlineRun[] }
  | { kind: 'preformatted'; text: string }
  | { kind: 'blockquote'; runs: InlineRun[] }
  | ({ kind: 'list' } & ListBlock)
  | { kind: 'table'; rows: TableRow[]; widths?: number[] }
  | { kind: 'image'; dataUrl: string; alt: string }
  | { kind: 'rule' }
  | { kind: 'pagebreak' };

type CellAlign = 'left' | 'center' | 'right';
interface TableRow { header: boolean; cells: InlineRun[][]; aligns: CellAlign[] }

// A cell's horizontal alignment: the HTML `align` attribute or a `text-align` in its style.
function cellAlign(cell: Element): CellAlign {
  const fromStyle = /text-align\s*:\s*(left|center|right)/i.exec(cell.getAttribute('style') || '')?.[1];
  const value = (fromStyle || cell.getAttribute('align') || 'left').toLowerCase();
  return value === 'right' || value === 'center' ? value : 'left';
}

// Column widths from <colgroup><col width="N%"> — used only when every column has one and they
// add up to about 100%; otherwise the columns stay equal.
function tableWidths(table: Element, numCols: number): number[] | undefined {
  const cols = Array.from(table.querySelectorAll(':scope > colgroup > col'));
  if (cols.length !== numCols) return undefined;
  const widths = cols.map((c) => /^\s*(\d+(?:\.\d+)?)\s*%\s*$/.exec(c.getAttribute('width') || '')?.[1]).map((w) => (w === undefined ? NaN : Number(w) / 100));
  const sum = widths.reduce((a, b) => a + b, 0);
  return widths.every((w) => w > 0) && Math.abs(sum - 1) < 0.02 ? widths.map((w) => w / sum) : undefined;
}

const SKIP_TAGS = new Set(['script', 'style', 'head', 'template']);
const INLINE_CONTAINER_TAGS = new Set(['div', 'span', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside', 'figure', 'figcaption']);

function normalizeWhitespace(s: string): string {
  return s.replace(/[ \t\r\n]+/g, ' ');
}

interface RunStyle { bold: boolean; italic: boolean; sub: boolean; sup: boolean; link?: string; code: boolean; strike: boolean }

function collectRuns(node: Node, bold = false, italic = false, sub = false, sup = false, link?: string): InlineRun[] {
  return collectStyledRuns(node, { bold, italic, sub, sup, link, code: false, strike: false });
}

function collectStyledRuns(node: Node, st: RunStyle): InlineRun[] {
  const runs: InlineRun[] = [];
  const run = (text: string, s2: RunStyle): InlineRun => ({ text, bold: s2.bold, italic: s2.italic, sub: s2.sub, sup: s2.sup, link: s2.link, ...(s2.code ? { code: true } : {}), ...(s2.strike ? { strike: true } : {}) });
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const text = normalizeWhitespace(child.textContent || '');
      if (text.trim() || (runs.length && text)) runs.push(run(text, st));
    } else if (child.nodeType === 1) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'br') { runs.push(run('\n', st)); return; }
      if (SKIP_TAGS.has(tag)) return;
      // A task-list checkbox ("- [x] done" in Markdown): neither bundled font has a ballot box.
      if (tag === 'input') {
        if ((el.getAttribute('type') || '').toLowerCase() === 'checkbox') runs.push(run(el.hasAttribute('checked') ? '[x] ' : '[ ] ', { ...st, code: true }));
        return;
      }
      if (tag === 'b' || tag === 'strong') { runs.push(...collectStyledRuns(el, { ...st, bold: true })); return; }
      if (tag === 'i' || tag === 'em') { runs.push(...collectStyledRuns(el, { ...st, italic: true })); return; }
      if (tag === 'sub') { runs.push(...collectStyledRuns(el, { ...st, sub: true, sup: false })); return; }
      if (tag === 'sup') { runs.push(...collectStyledRuns(el, { ...st, sub: false, sup: true })); return; }
      if (tag === 'a') { runs.push(...collectStyledRuns(el, { ...st, link: el.getAttribute('href') || undefined })); return; }
      if (tag === 'code' || tag === 'kbd' || tag === 'samp' || tag === 'tt') { runs.push(...collectStyledRuns(el, { ...st, code: true })); return; }
      if (tag === 'del' || tag === 's' || tag === 'strike') { runs.push(...collectStyledRuns(el, { ...st, strike: true })); return; }
      runs.push(...collectStyledRuns(el, st));
    }
  });
  return runs;
}

/** A list and the lists nested in its items, keeping each item's own text apart from them. */
function parseList(el: Element): ListBlock {
  const items: ListItem[] = [];
  el.querySelectorAll(':scope > li').forEach((li) => {
    const own = li.cloneNode(true) as Element;
    own.querySelectorAll(':scope > ul, :scope > ol').forEach((n) => n.remove());
    const sublists = Array.from(li.querySelectorAll(':scope > ul, :scope > ol')).map(parseList).filter((l) => l.items.length);
    const runs = collectRuns(own);
    if (runs.length || sublists.length) items.push({ runs, sublists });
  });
  return { ordered: el.tagName.toLowerCase() === 'ol', items };
}

function collectPreformattedText(el: Element): string {
  return (el.textContent || '').replace(/\r\n/g, '\n');
}

function parseHtmlToBlocks(html: string): { blocks: Block[]; lang?: string; title?: string } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lang = doc.documentElement.getAttribute('lang') || undefined;
  const title = doc.querySelector('title')?.textContent?.trim() || undefined;
  const blocks: Block[] = [];

  function walk(container: Element): void {
    container.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        const text = normalizeWhitespace(child.textContent || '').trim();
        if (text) blocks.push({ kind: 'paragraph', runs: [{ text, bold: false, italic: false, sub: false, sup: false }] });
        return;
      }
      if (child.nodeType !== 1) return;
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (SKIP_TAGS.has(tag)) return;

      if (/^h[1-6]$/.test(tag)) {
        const runs = collectRuns(el);
        if (runs.length) blocks.push({ kind: 'heading', level: Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6, runs });
      } else if (tag === 'p') {
        const runs = collectRuns(el);
        if (runs.length) blocks.push({ kind: 'paragraph', runs });
      } else if (tag === 'pre') {
        const text = collectPreformattedText(el);
        if (text.trim()) blocks.push({ kind: 'preformatted', text });
      } else if (tag === 'blockquote') {
        const runs = collectRuns(el);
        if (runs.length) blocks.push({ kind: 'blockquote', runs });
      } else if (tag === 'ul' || tag === 'ol') {
        const list = parseList(el);
        if (list.items.length) blocks.push({ kind: 'list', ...list });
      } else if (tag === 'dl') {
        el.querySelectorAll(':scope > dt, :scope > dd').forEach((node) => {
          const runs = collectRuns(node, node.tagName.toLowerCase() === 'dt');
          if (runs.length) blocks.push({ kind: 'paragraph', runs });
        });
      } else if (tag === 'table') {
        const rows: TableRow[] = [];
        el.querySelectorAll('tr').forEach((tr) => {
          const cells: InlineRun[][] = [];
          const aligns: CellAlign[] = [];
          let header = false;
          tr.querySelectorAll('th,td').forEach((cell) => {
            if (cell.tagName.toLowerCase() === 'th') header = true;
            cells.push(collectRuns(cell));
            aligns.push(cellAlign(cell));
          });
          if (cells.length) rows.push({ header, cells, aligns });
        });
        if (rows.length) blocks.push({ kind: 'table', rows, widths: tableWidths(el, Math.max(...rows.map((r) => r.cells.length))) });
      } else if (tag === 'img') {
        const src = el.getAttribute('src') || '';
        // Only inline data: URIs — fetching a remote <img src> would be a real network request
        // this app's entire privacy model (100% local processing) explicitly avoids elsewhere.
        if (src.startsWith('data:')) {
          blocks.push({ kind: 'image', dataUrl: src, alt: el.getAttribute('alt') || '' });
        }
      } else if (tag === 'hr') {
        // <hr data-page-break> starts a new page (several invoices in one PDF, each on its own pages).
        blocks.push(el.hasAttribute('data-page-break') ? { kind: 'pagebreak' } : { kind: 'rule' });
      } else if (INLINE_CONTAINER_TAGS.has(tag) || true) {
        // Generic container (div/span/section/... or any other unrecognized tag): no structure
        // of its own, just recurse into children so nothing nested inside is silently dropped.
        walk(el);
      }
    });
  }
  walk(doc.body);
  return { blocks, lang, title };
}

// ─── Fonts ─────────────────────────────────────────────────────────────────────────────────

interface FontSet { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont; mono?: PDFFont }

async function embedFontSet(pdf: PDFDocument, withMono = false): Promise<FontSet> {
  const fontkit = (await import('@pdf-lib/fontkit')).default;
  pdf.registerFontkit(fontkit);
  const load = async (name: string): Promise<PDFFont> => {
    const res = await fetch(`/pdfjs-dist/standard_fonts/${name}.ttf`);
    if (!res.ok) throw new Error(`Font fetch failed: ${name}.ttf`);
    return pdf.embedFont(new Uint8Array(await res.arrayBuffer()));
  };
  const [regular, bold, italic, boldItalic] = await Promise.all([
    load('LiberationSans-Regular'), load('LiberationSans-Bold'),
    load('LiberationSans-Italic'), load('LiberationSans-BoldItalic'),
  ]);
  // Code (blocks and inline) in Cousine, the editor's monospace font (Latin with Polish letters),
  // embedded only when the document has code; before, code was set in the proportional font.
  let mono: PDFFont | undefined;
  if (withMono) {
    try {
      const res = await fetch('/fonts/cousine-regular.ttf');
      if (res.ok) mono = await pdf.embedFont(new Uint8Array(await res.arrayBuffer()));
    } catch { /* falls back to the proportional font */ }
  }
  return { regular, bold, italic, boldItalic, mono };
}

/**
 * Whether the monospace font has every character of `text`. Cousine has no box-drawing characters
 * (the "├──" of a directory tree in a README) and the text font does: such text falls back to it.
 */
function monoCovers(fonts: FontSet, text: string): boolean {
  const kit = (fonts.mono as unknown as { embedder?: { font?: { hasGlyphForCodePoint(cp: number): boolean } } } | undefined)?.embedder?.font;
  if (!kit) return false;
  for (const ch of text) if (ch !== ' ' && !kit.hasGlyphForCodePoint(ch.codePointAt(0)!)) return false;
  return true;
}

function pickFont(fonts: FontSet, bold: boolean, italic: boolean, code = false): PDFFont {
  if (code && fonts.mono) return fonts.mono;
  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.italic;
  return fonts.regular;
}

// ─── Line wrapping (run-aware: a line is a sequence of same-font segments) ─────────────────

interface RunSegment { text: string; font: PDFFont; size: number; baselineShift: number; color: { r: number; g: number; b: number }; link?: string; strike?: boolean }

function wrapRuns(runs: InlineRun[], fonts: FontSet, baseSize: number, maxWidth: number): RunSegment[][] {
  const lines: RunSegment[][] = [];
  let currentLine: RunSegment[] = [];
  let currentLineWidth = 0;

  // `glue`: true means "no space before this word" — needed because a run boundary does NOT
  // always mean a word boundary (e.g. `<b>word</b>,` — the comma is a separate run from a
  // separate text node, but sits directly against "word" with no space in the source). Without
  // tracking this, every new-style segment got an unconditional leading space, producing visibly
  // wrong "word ," spacing on any bold/italic/link text immediately followed by punctuation.
  const pushToken = (word: string, run: InlineRun, glue: boolean) => {
    const font = pickFont(fonts, run.bold, run.italic, !!run.code && monoCovers(fonts, word));
    const size = run.sub || run.sup ? baseSize * 0.7 : font === fonts.mono ? baseSize * 0.92 : baseSize;
    const baselineShift = run.sub ? -baseSize * 0.2 : run.sup ? baseSize * 0.3 : 0;
    const color = run.link ? { r: 0.1, g: 0.3, b: 0.75 } : run.code ? { r: 0.2, g: 0.2, b: 0.2 } : { r: 0, g: 0, b: 0 };
    const wordWidth = font.widthOfTextAtSize(word, size);
    // A word wider than the whole line (a long URL, a long word in a narrow table column) is
    // broken between characters, as a browser does with overflow-wrap; drawn whole, it ran past
    // the edge of its cell or of the page.
    if (wordWidth > maxWidth && word.length > 1) {
      const chars = Array.from(word);
      let piece = '';
      let first = true;
      for (const ch of chars) {
        if (piece && font.widthOfTextAtSize(piece + ch, size) > maxWidth) {
          pushToken(piece, run, first ? glue : true);
          first = false;
          piece = '';
        }
        piece += ch;
      }
      if (piece) pushToken(piece, run, first ? glue : true);
      return;
    }
    let needsSpace = currentLine.length > 0 && !glue;
    let spaceWidth = needsSpace ? font.widthOfTextAtSize(' ', size) : 0;
    if (currentLine.length && currentLineWidth + spaceWidth + wordWidth > maxWidth) {
      lines.push(currentLine);
      currentLine = [];
      currentLineWidth = 0;
      needsSpace = false; // first token on a fresh line never gets a leading space
      spaceWidth = 0;
    }
    const last = currentLine[currentLine.length - 1];
    const sameStyle = last && last.font === font && last.size === size && last.link === run.link && !!last.strike === !!run.strike;
    const prefix = needsSpace ? ' ' : '';
    if (currentLine.length && sameStyle) {
      last.text += prefix + word;
    } else {
      currentLine.push({ text: prefix + word, font, size, baselineShift, color, link: run.link, ...(run.strike ? { strike: true } : {}) });
    }
    currentLineWidth += spaceWidth + wordWidth;
  };

  let pendingSpaceBefore = false; // whitespace seen since the last emitted word (survives across runs)
  for (const run of runs) {
    const parts = run.text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) {
        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = 0;
        pendingSpaceBefore = false;
        return;
      }
      if (part === '') return;
      if (/^\s/.test(part)) pendingSpaceBefore = true;
      const words = part.split(' ').filter(Boolean);
      words.forEach((w, wi) => {
        pushToken(w, run, wi === 0 ? !pendingSpaceBefore : false);
        pendingSpaceBefore = false;
      });
      if (/\s$/.test(part)) pendingSpaceBefore = true;
    });
  }
  if (currentLine.length) lines.push(currentLine);
  return lines.length ? lines : [[]];
}

// ─── Page / structure-tree render state ─────────────────────────────────────────────────────

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

interface RenderState {
  pdf: PDFDocument;
  fonts: FontSet;
  page: PDFPage;
  y: number;
  pageIndex: number;
  pageMcid: number;
  parentTreeByPage: PDFRef[][];
  structTreeRootRef: PDFRef;
  structTreeRootDict: PDFDict;
  /** The StructElem whose marked content is being drawn (a link inside it becomes its child). */
  openElem: { ref: PDFRef; dict: PDFDict } | null;
  /** Link annotations and the /Link StructElem owning each; their /StructParent keys are
   *  assigned once the number of pages (which own keys 0..pages-1) is known. */
  linkAnnots: { annot: PDFDict; linkRef: PDFRef }[];
}

function newPage(state: RenderState): void {
  state.page = state.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  // state.pageIndex is a running COUNT of pages created so far (1 after the first page), which
  // is exactly the 0-based index this new page is about to occupy — it must match the position
  // this page's MCID-owning array will later get in /ParentTree/Nums (built by iterating
  // parentTreeByPage in order), or a reader can never map "MCID n on this page" back to its
  // StructElem. Incrementing pageIndex happens AFTER using it here, not before.
  state.page.node.set(PDFName.of('StructParents'), state.pdf.context.obj(state.pageIndex));
  state.pageIndex += 1;
  state.pageMcid = 0;
  state.parentTreeByPage.push([]);
  state.y = PAGE_HEIGHT - MARGIN;
}

function ensureSpace(state: RenderState, neededHeight: number): void {
  if (state.y - neededHeight < MARGIN) newPage(state);
}

/** Wrap a sequence of page.pushOperators calls in a real BDC/EMC marked-content scope, and
 *  register a matching /StructElem so the content is reachable from /StructTreeRoot via the
 *  page's /ParentTree — the actual mechanism that makes this a Tagged PDF, not decoration. */
function beginMarkedContent(state: RenderState, tag: string, parentRef: PDFRef): { mcid: number; ref: PDFRef; dict: PDFDict } {
  const mcid = state.pageMcid++;
  state.page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [PDFName.of(tag), `<< /MCID ${mcid} >>`]));
  const dict = state.pdf.context.obj({ Type: 'StructElem', S: PDFName.of(tag), P: parentRef, Pg: state.page.ref, K: mcid });
  const ref = state.pdf.context.register(dict);
  state.parentTreeByPage[state.pageIndex - 1]![mcid] = ref;
  state.openElem = { ref, dict: dict as unknown as PDFDict };
  return { mcid, ref, dict: dict as unknown as PDFDict };
}

function endMarkedContent(state: RenderState): void {
  state.page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));
  state.openElem = null;
}

/** A container StructElem with no marked content of its own (e.g. /L, /LI, /Table, /TR) — its
 *  /K is filled in with child refs once they exist, via setKids(). */
function registerContainer(state: RenderState, tag: string, parentRef: PDFRef): { ref: PDFRef; dict: PDFDict } {
  const dict = state.pdf.context.obj({ Type: 'StructElem', S: PDFName.of(tag), P: parentRef, K: [] });
  const ref = state.pdf.context.register(dict);
  return { ref, dict: dict as unknown as PDFDict };
}

// ─── Block renderers ─────────────────────────────────────────────────────────────────────

const HEADING_SIZES: Record<1 | 2 | 3 | 4 | 5 | 6, number> = { 1: 24, 2: 20, 3: 17, 4: 14.5, 5: 13, 6: 12 };

function drawLine(state: RenderState, segments: RunSegment[], x: number, y: number): void {
  let cx = x;
  for (const seg of segments) {
    state.page.drawText(seg.text, { x: cx, y: y + seg.baselineShift, size: seg.size, font: seg.font, color: rgb(seg.color.r, seg.color.g, seg.color.b) });
    if (seg.strike) {
      const w = seg.font.widthOfTextAtSize(seg.text, seg.size);
      const sy = y + seg.baselineShift + seg.size * 0.3;
      state.page.drawLine({ start: { x: cx, y: sy }, end: { x: cx + w, y: sy }, thickness: Math.max(0.5, seg.size * 0.06), color: rgb(seg.color.r, seg.color.g, seg.color.b) });
    }
    if (seg.link) {
      const w = seg.font.widthOfTextAtSize(seg.text, seg.size);
      state.page.drawLine({ start: { x: cx, y: y - 1.5 }, end: { x: cx + w, y: y - 1.5 }, thickness: 0.5, color: rgb(seg.color.r, seg.color.g, seg.color.b) });
      addLinkAnnotation(state, cx, y - 2, w, seg.size + 2, seg.link, seg.text);
    }
    cx += seg.font.widthOfTextAtSize(seg.text, seg.size);
  }
}

// PDF/UA-1 (verified against veraPDF, see AGENTS.md): a link annotation must be reachable from
// the structure tree through a /Link StructElem (7.18.5#1: its /StructParent resolves via the
// /ParentTree to that element, which holds an /OBJR to the annotation), must carry an alternative
// description in /Contents (7.18.5#2, 7.18.1#2), and a page with annotations needs /Tabs /S so
// tab order follows the structure (7.18.3#1).
function addLinkAnnotation(state: RenderState, x: number, y: number, width: number, height: number, uri: string, text: string): void {
  const target = uri;
  if (!/^https?:\/\//i.test(target) && !target.startsWith('#') && !target.startsWith('mailto:')) return; // ignore unsafe/relative schemes
  const context = state.pdf.context;
  const action = context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(target) });
  const annot = context.obj({
    Type: 'Annot', Subtype: 'Link', Rect: [x, y, x + width, y + height],
    Border: [0, 0, 0], A: action, Contents: PDFString.of(text.trim() || target),
  });
  const annotRef = context.register(annot);
  const existing = state.page.node.Annots();
  if (existing) existing.push(annotRef);
  else state.page.node.set(PDFName.of('Annots'), context.obj([annotRef]));
  state.page.node.set(PDFName.of('Tabs'), PDFName.of('S'));

  const parent = state.openElem;
  if (!parent) return;
  const objr = context.obj({ Type: 'OBJR', Obj: annotRef, Pg: state.page.ref });
  const linkDict = context.obj({ Type: 'StructElem', S: PDFName.of('Link'), P: parent.ref, Pg: state.page.ref, K: [objr] });
  const linkRef = context.register(linkDict);
  // The parent's /K is its MCID (an integer) until it gets a structural child; it then becomes
  // an array: the marked content first, then the /Link element(s), in reading order.
  const k = parent.dict.get(PDFName.of('K'));
  if (k instanceof PDFArray) k.push(linkRef);
  else parent.dict.set(PDFName.of('K'), context.obj(k === undefined ? [linkRef] : [k, linkRef]));
  state.linkAnnots.push({ annot: annot as unknown as PDFDict, linkRef });
}

/** Renders wrapped lines under one or more MCID scopes (splitting into a new StructElem if the
 *  block overflows onto a new page — a StructElem's content always stays on a single page in
 *  this renderer; see the module header for why). Returns every StructElem ref created. */
function renderWrappedLines(state: RenderState, tag: string, lines: RunSegment[][], parentRef: PDFRef, x: number, lineHeight: number, spacingAfter: number): PDFRef[] {
  const created: PDFRef[] = [];
  let open: ReturnType<typeof beginMarkedContent> | null = null;
  for (const line of lines) {
    if (state.y - lineHeight < MARGIN) {
      if (open) endMarkedContent(state);
      newPage(state);
      open = null;
    }
    if (!open) {
      open = beginMarkedContent(state, tag, parentRef);
      created.push(open.ref);
    }
    drawLine(state, line, x, state.y - lineHeight * 0.8);
    state.y -= lineHeight;
  }
  if (open) endMarkedContent(state);
  state.y -= spacingAfter;
  return created;
}

function renderHeading(state: RenderState, level: 1 | 2 | 3 | 4 | 5 | 6, runs: InlineRun[], parentRef: PDFRef): PDFRef[] {
  const size = HEADING_SIZES[level];
  state.y -= size * 0.4;
  const boldedRuns = runs.map((r) => ({ ...r, bold: true }));
  const lines = wrapRuns(boldedRuns, state.fonts, size, CONTENT_WIDTH);
  return renderWrappedLines(state, `H${level}`, lines, parentRef, MARGIN, size * 1.25, size * 0.5);
}

function renderParagraph(state: RenderState, runs: InlineRun[], parentRef: PDFRef): PDFRef[] {
  const size = 11;
  const lines = wrapRuns(runs, state.fonts, size, CONTENT_WIDTH);
  return renderWrappedLines(state, 'P', lines, parentRef, MARGIN, size * 1.4, size * 0.9);
}

function renderBlockquote(state: RenderState, runs: InlineRun[], parentRef: PDFRef): PDFRef[] {
  const size = 11;
  const indent = 24;
  const italicRuns = runs.map((r) => ({ ...r, italic: true }));
  const lines = wrapRuns(italicRuns, state.fonts, size, CONTENT_WIDTH - indent);
  const startY = state.y;
  const refs = renderWrappedLines(state, 'BlockQuote', lines, parentRef, MARGIN + indent, size * 1.4, size * 0.9);
  // A thin left rule is purely decorative — mark it as an Artifact (PDF's term for content with
  // no semantic meaning) rather than tagging it as real structure content.
  state.page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContent, [PDFName.of('Artifact')]));
  state.page.drawRectangle({ x: MARGIN + 4, y: state.y, width: 2, height: startY - state.y, color: rgb(0.7, 0.7, 0.7) });
  state.page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));
  return refs;
}

function renderPreformatted(state: RenderState, text: string, parentRef: PDFRef): PDFRef[] {
  const size = 9.5;
  const font = state.fonts.mono ?? state.fonts.regular;
  const maxWidth = CONTENT_WIDTH - 12;
  const lines: RunSegment[][] = [];
  for (const raw of text.replace(/\n$/, '').split('\n')) {
    // Spaces kept as written (indentation is the point of a code block); a tab is 4 spaces.
    // A line wider than the page is broken at the width it measures, not at a guessed count.
    let remaining = raw.replace(/\t/g, '    ');
    do {
      let chunk = '';
      for (const ch of Array.from(remaining)) {
        if (chunk && font.widthOfTextAtSize(chunk + ch, size) > maxWidth) break;
        chunk += ch;
      }
      remaining = remaining.slice(chunk.length);
      // Characters the monospace font lacks (box drawing) are set in the text font, in place.
      const segs: RunSegment[] = [];
      for (const ch of Array.from(chunk)) {
        const f = font === state.fonts.mono && !monoCovers(state.fonts, ch) ? state.fonts.regular : font;
        const last = segs[segs.length - 1];
        if (last && last.font === f) last.text += ch;
        else segs.push({ text: ch, font: f, size, baselineShift: 0, color: { r: 0.15, g: 0.15, b: 0.15 } });
      }
      lines.push(segs.length ? segs : [{ text: '', font, size, baselineShift: 0, color: { r: 0.15, g: 0.15, b: 0.15 } }]);
    } while (remaining.length > 0);
  }
  return renderWrappedLines(state, 'Code', lines, parentRef, MARGIN + 6, size * 1.35, size * 0.9);
}

function renderList(state: RenderState, list: ListBlock, parentRef: PDFRef, level = 0): PDFRef[] {
  const { ref: listRef, dict: listDict } = registerContainer(state, 'L', parentRef);
  const size = 11;
  const indent = 20;
  const x = MARGIN + level * indent;
  const itemKids: PDFRef[] = [];
  list.items.forEach((item, i) => {
    const { ref: liRef, dict: liDict } = registerContainer(state, 'LI', listRef);
    // The label sits on the first line of the body: both start on the same page.
    ensureSpace(state, size * 1.4);
    const label = list.ordered ? `${i + 1}.` : level % 2 ? '–' : '•';
    const lblLines = wrapRuns([{ text: label, bold: false, italic: false, sub: false, sup: false }], state.fonts, size, indent);
    const lblRefs = renderWrappedLinesAtSameBaseline(state, 'Lbl', lblLines, liRef, x, size * 1.4);
    const bodyLines = wrapRuns(item.runs.length ? item.runs : [{ text: ' ', bold: false, italic: false, sub: false, sup: false }], state.fonts, size, CONTENT_WIDTH - (x - MARGIN) - indent);
    if (!item.sublists.length) {
      const bodyRefs = renderWrappedLines(state, 'LBody', bodyLines, liRef, x + indent, size * 1.4, size * 0.3);
      setKidsDirect(state, liDict, [...lblRefs, ...bodyRefs]);
    } else {
      // An item with a nested list: the list belongs in the item's body, next to its text
      // (an /LI holds only /Lbl and /LBody — ISO 32000-1, 14.8.4.3.3).
      const { ref: bodyRef, dict: bodyDict } = registerContainer(state, 'LBody', liRef);
      const textRefs = renderWrappedLines(state, 'P', bodyLines, bodyRef, x + indent, size * 1.4, size * 0.3);
      const nested = item.sublists.flatMap((sub) => renderList(state, sub, bodyRef, level + 1));
      setKidsDirect(state, bodyDict, [...textRefs, ...nested]);
      setKidsDirect(state, liDict, [...lblRefs, bodyRef]);
    }
    itemKids.push(liRef);
  });
  setKidsDirect(state, listDict, itemKids);
  if (level === 0) state.y -= 6;
  return [listRef];
}

// The label (bullet/number) is drawn on the SAME first line as the item body starts, so it
// can't use the generic renderWrappedLines page-advance logic (which would consume a line of
// vertical space for a label that's meant to sit beside the body text, not above it). Labels
// are always short enough to never wrap in practice, so this only ever emits one MCID.
// `lineHeight` is the body's: the label sits on the body's first baseline (it was drawn 0.8 of the
// font size down instead of 0.8 of the line height, 3.5 pt above the text beside it).
function renderWrappedLinesAtSameBaseline(state: RenderState, tag: string, lines: RunSegment[][], parentRef: PDFRef, x: number, lineHeight: number): PDFRef[] {
  if (!lines.length || !lines[0]!.length) return [];
  const { ref, dict: _dict } = beginMarkedContent(state, tag, parentRef);
  void _dict;
  drawLine(state, lines[0]!, x, state.y - lineHeight * 0.8);
  endMarkedContent(state);
  return [ref];
}

function setKidsDirect(state: RenderState, dict: PDFDict, kids: PDFRef[]): void {
  const arr = state.pdf.context.obj(kids);
  dict.set(PDFName.of('K'), arr);
}

function renderTable(state: RenderState, rows: TableRow[], parentRef: PDFRef, widths?: number[]): PDFRef[] {
  const { ref: tableRef, dict: tableDict } = registerContainer(state, 'Table', parentRef);
  const numCols = Math.max(1, ...rows.map((r) => r.cells.length));
  const colW = (c: number): number => (widths ? widths[c]! * CONTENT_WIDTH : CONTENT_WIDTH / numCols);
  const colX: number[] = [MARGIN];
  for (let c = 0; c < numCols; c++) colX.push(colX[c]! + colW(c));
  const size = 10;
  const cellPad = 4;
  const rowRefs: PDFRef[] = [];

  const lineStep = size * 1.35;
  const maxSliceLines = Math.max(1, Math.floor((PAGE_HEIGHT - MARGIN * 2 - cellPad * 2) / lineStep));
  const slices: { header: boolean; cells: InlineRun[][]; aligns: CellAlign[]; cellLines: RunSegment[][][] }[] = [];
  for (const row of rows) {
    const full = row.cells.map((cellRuns, c) => wrapRuns(cellRuns, state.fonts, size, colW(c) - cellPad * 2));
    const total = Math.max(1, ...full.map((l) => l.length));
    for (let start = 0; start < total; start += maxSliceLines) {
      slices.push({ header: row.header, cells: row.cells, aligns: row.aligns, cellLines: full.map((l) => l.slice(start, start + maxSliceLines)) });
    }
  }

  for (const row of slices) {
    const cellLines = row.cellLines;
    const rowLineCount = Math.max(1, ...cellLines.map((l) => l.length));
    const rowHeight = rowLineCount * lineStep + cellPad * 2;
    ensureSpace(state, rowHeight);

    const { ref: trRef, dict: trDict } = registerContainer(state, 'TR', tableRef);
    const rowTop = state.y;
    const cellKids: PDFRef[] = [];
    row.cells.forEach((_runs, colIdx) => {
      const tag = row.header ? 'TH' : 'TD';
      const x = colX[colIdx]! + cellPad;
      const inner = colW(colIdx) - cellPad * 2;
      const align = row.aligns[colIdx] ?? 'left';
      const { ref, dict: cellDict } = beginMarkedContent(state, tag, trRef);
      // PDF/UA-1 7.5#1: a header cell without /Headers+/ID must say what it heads. A <th> row
      // here is always a row of column headers.
      if (row.header) cellDict.set(PDFName.of('A'), state.pdf.context.obj({ O: PDFName.of('Table'), Scope: PDFName.of('Column') }));
      let cy = rowTop - size * 1.1;
      for (const line of cellLines[colIdx] ?? []) {
        const w = line.reduce((sum, seg) => sum + seg.font.widthOfTextAtSize(seg.text, seg.size), 0);
        const lx = align === 'right' ? x + Math.max(0, inner - w) : align === 'center' ? x + Math.max(0, (inner - w) / 2) : x;
        drawLine(state, line, lx, cy - size * 0.1);
        cy -= size * 1.35;
      }
      endMarkedContent(state);
      cellKids.push(ref);
    });
    setKidsDirect(state, trDict, cellKids);
    rowRefs.push(trRef);

    // Grid lines are visual structure, not textual content — Artifact, not tagged.
    state.page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContent, [PDFName.of('Artifact')]));
    for (let c = 0; c <= numCols; c++) {
      const gx = colX[c]!;
      state.page.drawLine({ start: { x: gx, y: rowTop }, end: { x: gx, y: rowTop - rowHeight }, thickness: 0.5, color: rgb(0.75, 0.75, 0.75) });
    }
    state.page.drawLine({ start: { x: MARGIN, y: rowTop - rowHeight }, end: { x: colX[numCols]!, y: rowTop - rowHeight }, thickness: 0.5, color: rgb(0.75, 0.75, 0.75) });
    state.page.drawLine({ start: { x: MARGIN, y: rowTop }, end: { x: colX[numCols]!, y: rowTop }, thickness: 0.5, color: rgb(0.75, 0.75, 0.75) });
    state.page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));

    state.y -= rowHeight;
  }
  setKidsDirect(state, tableDict, rowRefs);
  state.y -= 8;
  return [tableRef];
}

// FINDING (2026-09-23) — pdf-lib's embedPng/embedJpg only ever expose an image's raw PIXEL
// dimensions (no DPI/density is parsed or exposed anywhere in pdf-lib's embedders), but this
// function's own `maxWidth`/drawImage() work in PDF POINTS (1/72in) — the same unit-mismatch
// class already found and fixed for imagesToPdf (jpg-to-pdf) in lib/client-pdf.ts. The old code
// only rescaled an image that already EXCEEDED the page's content width in raw pixel count; any
// narrower image (the common case — a logo, an inline diagram) got scale=1, i.e. 1px treated as
// 1pt, rendering roughly 33% larger than an actual browser would display the same <img> (which
// assumes 96 DPI for a density-less raster image, CSS's "1px = 1/96in"), and any width/height
// HTML attribute on the source <img> was ignored entirely regardless of image size. Converting
// px to pt via the same 96 DPI assumption first — then still capping to content width if the
// (now DPI-corrected) natural size is still too wide — fixes both.
const IMAGE_PX_TO_PT = 72 / 96;

async function renderImage(state: RenderState, dataUrl: string, alt: string, parentRef: PDFRef): Promise<PDFRef[]> {
  const match = /^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i.exec(dataUrl);
  if (!match) return [];
  const mime = match[1]!.toLowerCase();
  const bytes = Uint8Array.from(atob(match[2]!), (c) => c.charCodeAt(0));
  const image = mime.includes('png') ? await state.pdf.embedPng(bytes) : await state.pdf.embedJpg(bytes);
  const naturalWidth = image.width * IMAGE_PX_TO_PT;
  const naturalHeight = image.height * IMAGE_PX_TO_PT;
  const maxWidth = CONTENT_WIDTH;
  // FINDING (2026-09-23) — ensureSpace() below only checks whether the CURRENT page has room
  // for `h` and starts a fresh page if not; it never checks whether `h` fits within a full
  // page's usable height at all. A tall image (e.g. a portrait screenshot scaled to content
  // width, whose aspect ratio makes its scaled height exceed a full page's content area) would
  // still be drawn past the bottom margin even on a brand new page — the excess is silently
  // clipped by the PDF page boundary (content outside a page's MediaBox is not carried to a
  // following page), a real, silent loss of part of the image. Capping height to what a single
  // full page can ever hold, in addition to the existing width cap, guarantees the image
  // (rescaled proportionally, so its aspect ratio is preserved) always fits after ensureSpace()
  // moves to a fresh page.
  const maxHeight = PAGE_HEIGHT - MARGIN * 2;
  const scale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight);
  const w = naturalWidth * scale;
  const h = naturalHeight * scale;
  ensureSpace(state, h);
  const { ref, dict } = beginMarkedContent(state, 'Figure', parentRef);
  // PDF/UA-style validators flag a Figure with no /Alt as an error, so an image the author gave
  // no alt="" text still gets a generic (honest — it says "image", not a fabricated caption)
  // fallback rather than being left without one. See module header for the overall honesty
  // policy this follows from the earlier MarkInfo fix.
  dict.set(PDFName.of('Alt'), PDFString.of(alt.trim() || 'obraz'));
  state.page.drawImage(image, { x: MARGIN, y: state.y - h, width: w, height: h });
  endMarkedContent(state);
  state.y -= h + 10;
  return [ref];
}

function renderRule(state: RenderState): void {
  ensureSpace(state, 16);
  state.y -= 8;
  state.page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContent, [PDFName.of('Artifact')]));
  state.page.drawLine({ start: { x: MARGIN, y: state.y }, end: { x: PAGE_WIDTH - MARGIN, y: state.y }, thickness: 0.75, color: rgb(0.8, 0.8, 0.8) });
  state.page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));
  state.y -= 8;
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildXmp(title: string, lang: string | undefined): string {
  const xmlLang = lang ? xmlEscape(lang) : 'x-default';
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/" xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">
      <dc:format>application/pdf</dc:format>
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xmlEscape(title)}</rdf:li>${lang ? `<rdf:li xml:lang="${xmlLang}">${xmlEscape(title)}</rdf:li>` : ''}</rdf:Alt></dc:title>
      <pdf:Producer>OptimaPDF</pdf:Producer>
      <pdfuaid:part>1</pdfuaid:part>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

// ─── Top-level orchestration ────────────────────────────────────────────────────────────────

/** Whether any code is in the document (the monospace font is embedded only then). */
function needsMono(blocks: Block[]): boolean {
  const inRuns = (runs: InlineRun[]) => runs.some((r) => r.code);
  const inList = (l: ListBlock): boolean => l.items.some((it) => inRuns(it.runs) || it.sublists.some(inList));
  return blocks.some((b) => b.kind === 'preformatted'
    || ((b.kind === 'paragraph' || b.kind === 'heading' || b.kind === 'blockquote') && inRuns(b.runs))
    || (b.kind === 'list' && inList(b))
    || (b.kind === 'table' && b.rows.some((r) => r.cells.some(inRuns))));
}

export async function htmlToTaggedPdf(html: string): Promise<Blob> {
  const { blocks, lang, title } = parseHtmlToBlocks(html);
  const pdf = await PDFDocument.create();
  const fonts = await embedFontSet(pdf, needsMono(blocks));

  const structTreeRootDict = pdf.context.obj({ Type: 'StructTreeRoot', K: [] });
  const structTreeRootRef = pdf.context.register(structTreeRootDict);

  const state: RenderState = {
    pdf, fonts, page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN,
    pageIndex: 0, pageMcid: 0, parentTreeByPage: [],
    structTreeRootRef, structTreeRootDict: structTreeRootDict as unknown as PDFDict,
    openElem: null, linkAnnots: [],
  };
  // newPage() below is only used for subsequent pages; the first page (created above with
  // addPage, matching how every other block-rendering call expects `state.page` to already
  // exist) still needs its own StructParents + parentTreeByPage slot set up identically.
  state.page.node.set(PDFName.of('StructParents'), pdf.context.obj(0));
  state.pageIndex = 1;
  state.parentTreeByPage.push([]);

  const topKids: PDFRef[] = [];
  for (const block of blocks) {
    let refs: PDFRef[] = [];
    if (block.kind === 'heading') refs = renderHeading(state, block.level, block.runs, structTreeRootRef);
    else if (block.kind === 'paragraph') refs = renderParagraph(state, block.runs, structTreeRootRef);
    else if (block.kind === 'blockquote') refs = renderBlockquote(state, block.runs, structTreeRootRef);
    else if (block.kind === 'preformatted') refs = renderPreformatted(state, block.text, structTreeRootRef);
    else if (block.kind === 'list') refs = renderList(state, block, structTreeRootRef);
    else if (block.kind === 'table') refs = renderTable(state, block.rows, structTreeRootRef, block.widths);
    else if (block.kind === 'image') refs = await renderImage(state, block.dataUrl, block.alt, structTreeRootRef);
    else if (block.kind === 'rule') renderRule(state);
    else if (block.kind === 'pagebreak') { if (state.y < PAGE_HEIGHT - MARGIN) newPage(state); }
    topKids.push(...refs);
  }

  if (topKids.length === 0) {
    // Nothing recognized in the input at all (e.g. plain text with no tags) — fall back to a
    // single untagged-but-visible paragraph rather than silently producing a blank PDF.
    const plain = normalizeWhitespace(html.replace(/<[^>]*>/g, ' ')).trim();
    if (plain) {
      const refs = renderParagraph(state, [{ text: plain, bold: false, italic: false, sub: false, sup: false }], structTreeRootRef);
      topKids.push(...refs);
    }
  }

  setKidsDirect(state, state.structTreeRootDict, topKids);

  // /ParentTree: a PDF "number tree" keyed by each page's /StructParents integer, mapping to
  // the array of StructElem refs owning that page's MCIDs in order (PDF32000 §14.7.4.4) — the
  // mechanism a screen reader/validator actually uses to go from "MCID 3 on page 2" back to its
  // owning structure element, distinct from (and in addition to) each StructElem's own /Pg+/K.
  const nums: (number | PDFArray | PDFRef)[] = [];
  state.parentTreeByPage.forEach((refs, idx) => {
    nums.push(idx, pdf.context.obj(refs.filter(Boolean)));
  });
  // Annotations get the keys after the pages' (a key maps an annotation straight to its owning
  // StructElem, not to an array); the tree's keys must stay in ascending order.
  let nextKey = state.parentTreeByPage.length;
  for (const { annot, linkRef } of state.linkAnnots) {
    annot.set(PDFName.of('StructParent'), pdf.context.obj(nextKey));
    nums.push(nextKey, linkRef);
    nextKey++;
  }
  const parentTreeRef = pdf.context.register(pdf.context.obj({ Nums: nums }));
  state.structTreeRootDict.set(PDFName.of('ParentTreeNextKey'), pdf.context.obj(nextKey));

  const catalog = pdf.catalog;
  catalog.set(PDFName.of('StructTreeRoot'), structTreeRootRef);
  state.structTreeRootDict.set(PDFName.of('ParentTree'), parentTreeRef);
  catalog.set(PDFName.of('MarkInfo'), pdf.context.obj({ Marked: true }));
  catalog.set(PDFName.of('ViewerPreferences'), pdf.context.obj({ DisplayDocTitle: true }));
  if (lang) catalog.set(PDFName.of('Lang'), PDFString.of(lang));
  const docTitle = title || 'Document';
  pdf.setTitle(docTitle);
  pdf.setProducer('OptimaPDF');
  // PDF/UA-1 7.1#8: the catalog must carry an XMP metadata stream (with dc:title, matching the
  // Info title), and the PDF/UA identification (pdfuaid:part) lives in it. Uncompressed so
  // metadata readers that do not decode streams can still read it.
  const xmp = buildXmp(docTitle, lang);
  const metadataRef = pdf.context.register(pdf.context.stream(xmp, { Type: 'Metadata', Subtype: 'XML' }));
  catalog.set(PDFName.of('Metadata'), metadataRef);

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
