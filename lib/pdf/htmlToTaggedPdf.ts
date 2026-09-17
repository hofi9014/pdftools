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
// already advertises (app/html-to-pdf/page.tsx). It is NOT a formal PDF/UA (ISO 14289) conformance
// claim — that requires additional strict rules and passing an external validator (veraPDF/PAC),
// which this does not attempt. Explicitly out of scope: CSS styling (only semantic tags drive
// layout), colspan/rowspan, nested lists beyond one level's visual indent, and per-link /Link
// structure elements (links ARE clickable and visually marked, just not individually tagged).

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
}

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; runs: InlineRun[] }
  | { kind: 'paragraph'; runs: InlineRun[] }
  | { kind: 'preformatted'; text: string }
  | { kind: 'blockquote'; runs: InlineRun[] }
  | { kind: 'list'; ordered: boolean; items: InlineRun[][] }
  | { kind: 'table'; rows: { header: boolean; cells: InlineRun[][] }[] }
  | { kind: 'image'; dataUrl: string; alt: string }
  | { kind: 'rule' };

const SKIP_TAGS = new Set(['script', 'style', 'head', 'template']);
const INLINE_CONTAINER_TAGS = new Set(['div', 'span', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside', 'figure', 'figcaption']);

function normalizeWhitespace(s: string): string {
  return s.replace(/[ \t\r\n]+/g, ' ');
}

function collectRuns(node: Node, bold = false, italic = false, sub = false, sup = false, link?: string): InlineRun[] {
  const runs: InlineRun[] = [];
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const text = normalizeWhitespace(child.textContent || '');
      if (text.trim() || (runs.length && text)) runs.push({ text, bold, italic, sub, sup, link });
    } else if (child.nodeType === 1) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'br') { runs.push({ text: '\n', bold, italic, sub, sup, link }); return; }
      if (SKIP_TAGS.has(tag)) return;
      if (tag === 'b' || tag === 'strong') { runs.push(...collectRuns(el, true, italic, sub, sup, link)); return; }
      if (tag === 'i' || tag === 'em') { runs.push(...collectRuns(el, bold, true, sub, sup, link)); return; }
      if (tag === 'sub') { runs.push(...collectRuns(el, bold, italic, true, false, link)); return; }
      if (tag === 'sup') { runs.push(...collectRuns(el, bold, italic, false, true, link)); return; }
      if (tag === 'a') { runs.push(...collectRuns(el, bold, italic, sub, sup, el.getAttribute('href') || undefined)); return; }
      runs.push(...collectRuns(el, bold, italic, sub, sup, link));
    }
  });
  return runs;
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
        const items: InlineRun[][] = [];
        el.querySelectorAll(':scope > li').forEach((li) => {
          const runs = collectRuns(li);
          if (runs.length) items.push(runs);
        });
        if (items.length) blocks.push({ kind: 'list', ordered: tag === 'ol', items });
      } else if (tag === 'dl') {
        el.querySelectorAll(':scope > dt, :scope > dd').forEach((node) => {
          const runs = collectRuns(node, node.tagName.toLowerCase() === 'dt');
          if (runs.length) blocks.push({ kind: 'paragraph', runs });
        });
      } else if (tag === 'table') {
        const rows: { header: boolean; cells: InlineRun[][] }[] = [];
        el.querySelectorAll('tr').forEach((tr) => {
          const cells: InlineRun[][] = [];
          let header = false;
          tr.querySelectorAll('th,td').forEach((cell) => {
            if (cell.tagName.toLowerCase() === 'th') header = true;
            cells.push(collectRuns(cell));
          });
          if (cells.length) rows.push({ header, cells });
        });
        if (rows.length) blocks.push({ kind: 'table', rows });
      } else if (tag === 'img') {
        const src = el.getAttribute('src') || '';
        // Only inline data: URIs — fetching a remote <img src> would be a real network request
        // this app's entire privacy model (100% local processing) explicitly avoids elsewhere.
        if (src.startsWith('data:')) {
          blocks.push({ kind: 'image', dataUrl: src, alt: el.getAttribute('alt') || '' });
        }
      } else if (tag === 'hr') {
        blocks.push({ kind: 'rule' });
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

interface FontSet { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont }

async function embedFontSet(pdf: PDFDocument): Promise<FontSet> {
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
  return { regular, bold, italic, boldItalic };
}

function pickFont(fonts: FontSet, bold: boolean, italic: boolean): PDFFont {
  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.italic;
  return fonts.regular;
}

// ─── Line wrapping (run-aware: a line is a sequence of same-font segments) ─────────────────

interface RunSegment { text: string; font: PDFFont; size: number; baselineShift: number; color: { r: number; g: number; b: number }; link?: string }

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
    const size = run.sub || run.sup ? baseSize * 0.7 : baseSize;
    const font = pickFont(fonts, run.bold, run.italic);
    const baselineShift = run.sub ? -baseSize * 0.2 : run.sup ? baseSize * 0.3 : 0;
    const color = run.link ? { r: 0.1, g: 0.3, b: 0.75 } : { r: 0, g: 0, b: 0 };
    const wordWidth = font.widthOfTextAtSize(word, size);
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
    const sameStyle = last && last.font === font && last.size === size && last.link === run.link;
    const prefix = needsSpace ? ' ' : '';
    if (currentLine.length && sameStyle) {
      last.text += prefix + word;
    } else {
      currentLine.push({ text: prefix + word, font, size, baselineShift, color, link: run.link });
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
  return { mcid, ref, dict: dict as unknown as PDFDict };
}

function endMarkedContent(state: RenderState): void {
  state.page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));
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
    if (seg.link) {
      const w = seg.font.widthOfTextAtSize(seg.text, seg.size);
      state.page.drawLine({ start: { x: cx, y: y - 1.5 }, end: { x: cx + w, y: y - 1.5 }, thickness: 0.5, color: rgb(seg.color.r, seg.color.g, seg.color.b) });
      addLinkAnnotation(state, cx, y - 2, w, seg.size + 2, seg.link);
    }
    cx += seg.font.widthOfTextAtSize(seg.text, seg.size);
  }
}

function addLinkAnnotation(state: RenderState, x: number, y: number, width: number, height: number, uri: string): void {
  const target = uri;
  if (!/^https?:\/\//i.test(target) && !target.startsWith('#') && !target.startsWith('mailto:')) return; // ignore unsafe/relative schemes
  const context = state.pdf.context;
  const action = context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(target) });
  const annot = context.obj({
    Type: 'Annot', Subtype: 'Link', Rect: [x, y, x + width, y + height],
    Border: [0, 0, 0], A: action,
  });
  const annotRef = context.register(annot);
  const existing = state.page.node.Annots();
  if (existing) existing.push(annotRef);
  else state.page.node.set(PDFName.of('Annots'), context.obj([annotRef]));
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
  const size = 10;
  const font = state.fonts.regular;
  const rawLines = text.split('\n');
  const lines: RunSegment[][] = [];
  for (const raw of rawLines) {
    // pdf-lib has no monospace font embedded here, so long preformatted lines are hard-wrapped
    // at a fixed character budget rather than measured — good enough to avoid running off the
    // page without pulling in a whole extra font family for one block type.
    let remaining = raw;
    const maxChars = 100;
    do {
      const chunk = remaining.slice(0, maxChars);
      remaining = remaining.slice(maxChars);
      lines.push([{ text: chunk, font, size, baselineShift: 0, color: { r: 0.15, g: 0.15, b: 0.15 } }]);
    } while (remaining.length > 0);
  }
  return renderWrappedLines(state, 'P', lines, parentRef, MARGIN + 6, size * 1.35, size * 0.9);
}

function renderList(state: RenderState, ordered: boolean, items: InlineRun[][], parentRef: PDFRef): PDFRef[] {
  const { ref: listRef, dict: listDict } = registerContainer(state, 'L', parentRef);
  const size = 11;
  const indent = 20;
  const itemKids: PDFRef[] = [];
  items.forEach((runs, i) => {
    const { ref: liRef, dict: liDict } = registerContainer(state, 'LI', listRef);
    const label = ordered ? `${i + 1}.` : '•';
    const lblLines = wrapRuns([{ text: label, bold: false, italic: false, sub: false, sup: false }], state.fonts, size, indent);
    const lblRefs = renderWrappedLinesAtSameBaseline(state, 'Lbl', lblLines, liRef, MARGIN);
    const bodyLines = wrapRuns(runs, state.fonts, size, CONTENT_WIDTH - indent);
    const bodyRefs = renderWrappedLines(state, 'LBody', bodyLines, liRef, MARGIN + indent, size * 1.4, size * 0.3);
    setKidsDirect(state, liDict, [...lblRefs, ...bodyRefs]);
    itemKids.push(liRef);
  });
  setKidsDirect(state, listDict, itemKids);
  state.y -= 6;
  return [listRef];
}

// The label (bullet/number) is drawn on the SAME first line as the item body starts, so it
// can't use the generic renderWrappedLines page-advance logic (which would consume a line of
// vertical space for a label that's meant to sit beside the body text, not above it). Labels
// are always short enough to never wrap in practice, so this only ever emits one MCID.
function renderWrappedLinesAtSameBaseline(state: RenderState, tag: string, lines: RunSegment[][], parentRef: PDFRef, x: number): PDFRef[] {
  if (!lines.length || !lines[0]!.length) return [];
  const { ref, dict: _dict } = beginMarkedContent(state, tag, parentRef);
  void _dict;
  drawLine(state, lines[0]!, x, state.y - 11 * 0.8);
  endMarkedContent(state);
  return [ref];
}

function setKidsDirect(state: RenderState, dict: PDFDict, kids: PDFRef[]): void {
  const arr = state.pdf.context.obj(kids);
  dict.set(PDFName.of('K'), arr);
}

function renderTable(state: RenderState, rows: { header: boolean; cells: InlineRun[][] }[], parentRef: PDFRef): PDFRef[] {
  const { ref: tableRef, dict: tableDict } = registerContainer(state, 'Table', parentRef);
  const numCols = Math.max(1, ...rows.map((r) => r.cells.length));
  const colWidth = CONTENT_WIDTH / numCols;
  const size = 10;
  const cellPad = 4;
  const rowRefs: PDFRef[] = [];

  for (const row of rows) {
    const cellLines = row.cells.map((cellRuns) => wrapRuns(cellRuns, state.fonts, size, colWidth - cellPad * 2));
    const rowLineCount = Math.max(1, ...cellLines.map((l) => l.length));
    const rowHeight = rowLineCount * size * 1.35 + cellPad * 2;
    ensureSpace(state, rowHeight);

    const { ref: trRef, dict: trDict } = registerContainer(state, 'TR', tableRef);
    const rowTop = state.y;
    const cellKids: PDFRef[] = [];
    row.cells.forEach((_runs, colIdx) => {
      const tag = row.header ? 'TH' : 'TD';
      const x = MARGIN + colIdx * colWidth + cellPad;
      const { ref, dict: _d } = beginMarkedContent(state, tag, trRef);
      void _d;
      let cy = rowTop - size * 1.1;
      for (const line of cellLines[colIdx] ?? []) {
        drawLine(state, line, x, cy - size * 0.1);
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
      const gx = MARGIN + c * colWidth;
      state.page.drawLine({ start: { x: gx, y: rowTop }, end: { x: gx, y: rowTop - rowHeight }, thickness: 0.5, color: rgb(0.75, 0.75, 0.75) });
    }
    state.page.drawLine({ start: { x: MARGIN, y: rowTop - rowHeight }, end: { x: MARGIN + numCols * colWidth, y: rowTop - rowHeight }, thickness: 0.5, color: rgb(0.75, 0.75, 0.75) });
    state.page.drawLine({ start: { x: MARGIN, y: rowTop }, end: { x: MARGIN + numCols * colWidth, y: rowTop }, thickness: 0.5, color: rgb(0.75, 0.75, 0.75) });
    state.page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));

    state.y -= rowHeight;
  }
  setKidsDirect(state, tableDict, rowRefs);
  state.y -= 8;
  return [tableRef];
}

async function renderImage(state: RenderState, dataUrl: string, alt: string, parentRef: PDFRef): Promise<PDFRef[]> {
  const match = /^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i.exec(dataUrl);
  if (!match) return [];
  const mime = match[1]!.toLowerCase();
  const bytes = Uint8Array.from(atob(match[2]!), (c) => c.charCodeAt(0));
  const image = mime.includes('png') ? await state.pdf.embedPng(bytes) : await state.pdf.embedJpg(bytes);
  const maxWidth = CONTENT_WIDTH;
  const scale = Math.min(1, maxWidth / image.width);
  const w = image.width * scale;
  const h = image.height * scale;
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

// ─── Top-level orchestration ────────────────────────────────────────────────────────────────

export async function htmlToTaggedPdf(html: string): Promise<Blob> {
  const { blocks, lang, title } = parseHtmlToBlocks(html);
  const pdf = await PDFDocument.create();
  const fonts = await embedFontSet(pdf);

  const structTreeRootDict = pdf.context.obj({ Type: 'StructTreeRoot', K: [] });
  const structTreeRootRef = pdf.context.register(structTreeRootDict);

  const state: RenderState = {
    pdf, fonts, page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN,
    pageIndex: 0, pageMcid: 0, parentTreeByPage: [],
    structTreeRootRef, structTreeRootDict: structTreeRootDict as unknown as PDFDict,
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
    else if (block.kind === 'list') refs = renderList(state, block.ordered, block.items, structTreeRootRef);
    else if (block.kind === 'table') refs = renderTable(state, block.rows, structTreeRootRef);
    else if (block.kind === 'image') refs = await renderImage(state, block.dataUrl, block.alt, structTreeRootRef);
    else if (block.kind === 'rule') renderRule(state);
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
  const nums: (number | PDFArray)[] = [];
  state.parentTreeByPage.forEach((refs, idx) => {
    nums.push(idx, pdf.context.obj(refs.filter(Boolean)));
  });
  const parentTreeRef = pdf.context.register(pdf.context.obj({ Nums: nums }));

  const catalog = pdf.catalog;
  catalog.set(PDFName.of('StructTreeRoot'), structTreeRootRef);
  state.structTreeRootDict.set(PDFName.of('ParentTree'), parentTreeRef);
  catalog.set(PDFName.of('MarkInfo'), pdf.context.obj({ Marked: true }));
  catalog.set(PDFName.of('ViewerPreferences'), pdf.context.obj({ DisplayDocTitle: true }));
  if (lang) catalog.set(PDFName.of('Lang'), PDFString.of(lang));
  pdf.setTitle(title || 'Document');
  pdf.setProducer('OptimaPDF');

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
