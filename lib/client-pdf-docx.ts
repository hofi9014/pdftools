// IR types shared between extraction (client-pdf.ts) and rendering (docx/pdf)
// Dependencies: docx, pdf-lib, @pdf-lib/fontkit

import { PDFDocument, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib';
import type JSZip from 'jszip';

// ============================================================
// IR TYPES (Phase 1a — without TableBlock)
// ============================================================

export interface IRPoint { x: number; y: number; }
export interface IRRect { x: number; y: number; width: number; height: number; }

export interface IRTextRun {
  text: string;
  fontName: string;
  fontSize: number;
  width: number;
  height: number;
  position: IRPoint;
  color: string;
  bold: boolean;
  italic: boolean;
  rotation: number;
}

export interface IRParagraphBlock {
  kind: 'paragraph';
  runs: IRTextRun[];
  bounds: IRRect;
  role?: 'header' | 'footer' | 'body';
}

export interface IRHeadingBlock {
  kind: 'heading';
  level: number;
  runs: IRTextRun[];
  bounds: IRRect;
  role?: 'header' | 'footer' | 'body';
}

export interface IRListItemBlock {
  kind: 'list-item';
  marker: string;
  level: number;
  runs: IRTextRun[];
  bounds: IRRect;
}

export interface IRImageBlock {
  kind: 'image';
  imageId: string;
  naturalWidth: number;
  naturalHeight: number;
  bounds: IRRect;
}

export interface IRTableCell {
  runs: IRTextRun[];
  colspan: number;
  rowspan: number;
}

export interface IRTableBlock {
  kind: 'table';
  cells: IRTableCell[][];  // cells[row][col], only top-left of merged cells
  bounds: IRRect;
  columnWidths: number[];
}

export type IRBlock = IRParagraphBlock | IRHeadingBlock | IRListItemBlock | IRImageBlock | IRTableBlock;

export interface IRPageIR {
  width: number;
  height: number;
  blocks: IRBlock[];
}

// ============================================================
// IR TYPES — XLSX (Spreadsheet) — Component: xlsxToIR (XLSX → IR)
// ============================================================

export type IRSpreadsheetCellType =
  | 'string' | 'number' | 'date' | 'time' | 'boolean' | 'formula' | 'error' | 'empty';

export interface IRSpreadsheetRunFormat {
  bold?: boolean;
  italic?: boolean;
  colorHex?: string;
  fillHex?: string;
}

export interface IRSpreadsheetCell {
  display: string;
  type: IRSpreadsheetCellType;
  raw: string | number | boolean | null;
  dateEpoch?: '1900' | '1904';
  formula?: string;
  fmt?: IRSpreadsheetRunFormat;
  colspan: number;
  rowspan: number;
  /** True when `type` was inferred by heuristic from display text (e.g. PDF→Excel), not ground truth. */
  inferred?: boolean;
}

export interface IRSheetMergedRange {
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
}

export interface IRConditionalFormattingRule {
  sqref: string;
  type: string;
  operator?: string;
  formula?: string[];
  dxfId?: number;
}

export interface IRSheet {
  kind: 'sheet';
  name: string;
  cells: (IRSpreadsheetCell | undefined)[][];
  columnWidths: number[];
  mergedRanges: IRSheetMergedRange[];
  /** Raw conditional-formatting rules (stored verbatim, NOT evaluated). */
  conditionalFormattingRules?: IRConditionalFormattingRule[];
  /** Frozen header rows, repeated at the top of every PDF page (from <pane state="frozen"> ySplit). Absent = renderer default (1). */
  frozenRows?: number;
  /** Frozen header cols, repeated on every horizontal fragment (from <pane state="frozen"> xSplit). Absent = renderer default (0). */
  frozenCols?: number;
}

export interface IRSpreadsheet {
  kind: 'spreadsheet';
  sheets: IRSheet[];
}

// ============================================================
// DOCX → IR: STYLE RESOLUTION (Component 1)
// ============================================================

const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export interface RunProps {
  font?: string;
  size?: string;
  bold?: boolean;
  italic?: boolean;
  color?: string;
}

export interface StyleDef {
  basedOn?: string;
  rPr?: RunProps;
}

function getLocal(el: Element, local: string): string | null {
  return el.getAttributeNS(WORD_NS, local);
}

function parseBoolAttr(el: Element | null, attr: string): boolean | undefined {
  if (!el) return undefined;
  const v = getLocal(el, attr);
  if (v === null) return true;
  return v !== '0' && v !== 'false';
}

function parseRPr(rPr: Element | null): RunProps | undefined {
  if (!rPr) return undefined;
  const props: RunProps = {};
  const rFonts = rPr.getElementsByTagNameNS(WORD_NS, 'rFonts');
  if (rFonts.length > 0) {
    const font = getLocal(rFonts[0], 'ascii') || getLocal(rFonts[0], 'hAnsi');
    if (font) props.font = font;
  }
  const sz = rPr.getElementsByTagNameNS(WORD_NS, 'sz');
  if (sz.length > 0) {
    const v = getLocal(sz[0], 'val');
    if (v) props.size = v;
  }
  const bold = parseBoolAttr(rPr.getElementsByTagNameNS(WORD_NS, 'b')[0] || null, 'val');
  if (bold !== undefined) props.bold = bold;
  const italic = parseBoolAttr(rPr.getElementsByTagNameNS(WORD_NS, 'i')[0] || null, 'val');
  if (italic !== undefined) props.italic = italic;
  const color = rPr.getElementsByTagNameNS(WORD_NS, 'color');
  if (color.length > 0) {
    const v = getLocal(color[0], 'val');
    if (v) props.color = v;
  }
  return Object.keys(props).length > 0 ? props : undefined;
}

function mergeRunProps(base: RunProps | undefined, override: RunProps | undefined): RunProps {
  if (!base) return override || {};
  if (!override) return base;
  return {
    font: override.font ?? base.font,
    size: override.size ?? base.size,
    bold: override.bold ?? base.bold,
    italic: override.italic ?? base.italic,
    color: override.color ?? base.color,
  };
}

export function parseStylesXml(xml: string): { styles: Map<string, StyleDef>; docDefaults: RunProps } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const result = { styles: new Map<string, StyleDef>(), docDefaults: {} as RunProps };

  const defaults = doc.getElementsByTagNameNS(WORD_NS, 'docDefaults');
  if (defaults.length > 0) {
    const rPrDefault = defaults[0].getElementsByTagNameNS(WORD_NS, 'rPrDefault');
    if (rPrDefault.length > 0) {
      const rPr = rPrDefault[0].getElementsByTagNameNS(WORD_NS, 'rPr');
      if (rPr.length > 0) result.docDefaults = parseRPr(rPr[0]) || {};
    }
  }

  const styleEls = doc.getElementsByTagNameNS(WORD_NS, 'style');
  for (let i = 0; i < styleEls.length; i++) {
    const el = styleEls[i];
    const styleId = getLocal(el, 'styleId');
    if (!styleId) continue;
    const basedOn = el.getElementsByTagNameNS(WORD_NS, 'basedOn');
    const rPr = el.getElementsByTagNameNS(WORD_NS, 'rPr');
    const def: StyleDef = {};
    if (basedOn.length > 0) {
      const v = getLocal(basedOn[0], 'val');
      if (v) def.basedOn = v;
    }
    if (rPr.length > 0) def.rPr = parseRPr(rPr[0]);
    result.styles.set(styleId, def);
  }

  return result;
}

export function resolveRunProps(
  styles: Map<string, StyleDef>,
  docDefaults: RunProps,
  pStyleId: string | undefined,
  pPrRunProps: Partial<RunProps> | undefined,
  runProps: Partial<RunProps> | undefined,
): RunProps {
  let resolved = { ...docDefaults };
  if (pStyleId) {
    const chain: string[] = [];
    let cur: string | undefined = pStyleId;
    while (cur) {
      if (chain.includes(cur)) break;
      chain.unshift(cur);
      cur = styles.get(cur)?.basedOn;
    }
    for (const id of chain) {
      const rPr = styles.get(id)?.rPr;
      if (rPr) resolved = mergeRunProps(resolved, rPr);
    }
  }
  if (pPrRunProps) resolved = mergeRunProps(resolved, pPrRunProps as RunProps);
  if (runProps) resolved = mergeRunProps(resolved, runProps as RunProps);
  return resolved;
}

// ============================================================
// DOCX → IR: IMAGE EXTRACTION (Component 2)
// ============================================================

const IMAGE_REL =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
const DRAWINGML_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const WP_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const VML_NS = 'urn:schemas-microsoft-com:vml';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

export interface DocxImage {
  rId: string;
  target: string;
  /** bytes of the image file (jpeg/png/etc) extracted from word/media/ */
  data: Uint8Array;
  /** width in EMU from <wp:extent> or CSS pt from VML style */
  widthEMU: number;
  heightEMU: number;
  source: 'drawingml' | 'vml' | 'odf';
}

const EMU_PER_PT = 12700;

export function parseRels(xml: string): Map<string, { type: string; target: string }> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const relsNs = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const map = new Map<string, { type: string; target: string }>();
  const rels = doc.getElementsByTagNameNS(relsNs, 'Relationship');
  for (let i = 0; i < rels.length; i++) {
    const id = rels[i].getAttribute('Id');
    const type = rels[i].getAttribute('Type');
    const target = rels[i].getAttribute('Target');
    if (id && type && target) map.set(id, { type, target });
  }
  return map;
}

export function extractImagesFromXml(
  docXml: string,
  rels: Map<string, { type: string; target: string }>,
): { rId: string; widthEMU: number; heightEMU: number; source: 'drawingml' | 'vml' }[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'application/xml');
  const results: { rId: string; widthEMU: number; heightEMU: number; source: 'drawingml' | 'vml' }[] = [];
  const seen = new Set<string>();

  // DrawingML: <a:blip r:embed="rIdX"/>
  const blips = doc.getElementsByTagNameNS(DRAWINGML_NS, 'blip');
  for (let i = 0; i < blips.length; i++) {
    const embed = blips[i].getAttributeNS(REL_NS, 'embed');
    if (!embed) continue;
    const rel = rels.get(embed);
    if (!rel || rel.type !== IMAGE_REL) continue;

    // Walk up to find <wp:extent>
    let parent = blips[i].parentElement;
    let cx = 0, cy = 0;
    while (parent) {
      if (parent.localName === 'anchor' || parent.localName === 'inline') {
        const ext = parent.getElementsByTagNameNS(WP_NS, 'extent');
        if (ext.length > 0) {
          cx = parseInt(ext[0].getAttribute('cx') || '0', 10);
          cy = parseInt(ext[0].getAttribute('cy') || '0', 10);
        }
        break;
      }
      parent = parent.parentElement;
    }
    if (!seen.has(embed)) {
      seen.add(embed);
      results.push({ rId: embed, widthEMU: cx, heightEMU: cy, source: 'drawingml' });
    }
  }

  // VML: <v:imagedata r:id="rIdX"/> or <v:imagedata o:relid="rIdX"/>
  const vImagedata = doc.getElementsByTagNameNS(VML_NS, 'imagedata');
  for (let i = 0; i < vImagedata.length; i++) {
    const rid = vImagedata[i].getAttributeNS(REL_NS, 'id')
      || vImagedata[i].getAttribute('o:relid')
      || vImagedata[i].getAttribute('r:id');
    if (!rid) continue;
    const rel = rels.get(rid);
    if (!rel || rel.type !== IMAGE_REL) continue;
    if (seen.has(rid)) continue;
    seen.add(rid);

    // Walk up to <v:shape> for CSS dimensions
    let parent = vImagedata[i].parentElement;
    let wPt = 0, hPt = 0;
    while (parent) {
      const style = parent.getAttribute('style');
      if (style) {
        const wMatch = style.match(/width:\s*([\d.]+)pt/);
        const hMatch = style.match(/height:\s*([\d.]+)pt/);
        if (wMatch) wPt = parseFloat(wMatch[1]);
        if (hMatch) hPt = parseFloat(hMatch[1]);
        if (wPt && hPt) break;
      }
      parent = parent.parentElement;
    }
    results.push({
      rId: rid,
      widthEMU: Math.round(wPt * EMU_PER_PT),
      heightEMU: Math.round(hPt * EMU_PER_PT),
      source: 'vml',
    });
  }

  return results;
}

// ============================================================
// DOCX → IR: MAIN TRAVERSAL (Component 3)
// ============================================================
// KNOWN LIMITATION: Text inside <w:txbxContent> (text boxes) is
// intentionally excluded. getText() and parseRuns() only read
// direct-child elements, skipping content nested in textboxes
// (which are decorative banners/shapes in this document). This
// means content that exists ONLY inside a text box — and does not
// appear in the main body paragraph text — will be lost. In the
// real_ebook.docx test file, 7 paragraphs (chapter titles like
// "Czy zastanawiałeś się kiedyś…", test result data like
// "218 sztuk sprzedanych / 320 sztuk", guarantee badge
// "365 DNI NA ZWROT!") were affected. Acceptable for MVP because:
// (a) textboxes are visually styled banners, not core body text,
// (b) the same text is often self-duplicated inside the textbox
// (Choice + Fallback), (c) handling would require semantic
// analysis to distinguish "unique textbox content" from
// "decorative duplicate", disproportionate cost for MVP.
// ============================================================

// Unicode ranges for scripts NOT supported by LiberationSans.
// LiberationSans covers: Latin (U+0000-U+024F), Cyrillic (U+0400-U+04FF),
// Greek (U+0370-U+03FF). Everything else below → tofu in PDF output.
//
// IMPORTANT: Only actual SCRIPT blocks are listed. Punctuation (em dash,
// curly quotes, euro sign, CJK punctuation) is NOT listed because it
// renders acceptably even with tofu — a missing-glyph box for "—" or "。"
// is far less disruptive than missing all CJK/Arabic/Hindi characters.
// This catches >99% of real-world content for the project's 16 languages.
const UNSUPPORTED_SCRIPT_RANGES: Array<[number, number]> = [
  [0x0600, 0x06FF],   // Arabic
  [0x0750, 0x077F],   // Arabic Supplement
  [0x08A0, 0x08FF],   // Arabic Extended-A
  [0xFB50, 0xFDFF],   // Arabic Presentation Forms-A
  [0xFE70, 0xFEFF],   // Arabic Presentation Forms-B
  [0x0590, 0x05FF],   // Hebrew
  [0xFB1D, 0xFB4F],   // Hebrew Presentation Forms
  [0x0900, 0x097F],   // Devanagari (Hindi, Marathi, Nepali, Sanskrit)
  [0x0980, 0x09FF],   // Bengali
  [0x0A00, 0x0A7F],   // Gurmukhi (Punjabi)
  [0x0A80, 0x0AFF],   // Gujarati
  [0x0B00, 0x0B7F],   // Oriya
  [0x0B80, 0x0BFF],   // Tamil
  [0x0C00, 0x0C7F],   // Telugu
  [0x0C80, 0x0CFF],   // Kannada
  [0x0D00, 0x0D7F],   // Malayalam
  [0x0E00, 0x0E7F],   // Thai
  [0x1000, 0x109F],   // Myanmar (Burmese)
  [0x10A0, 0x10FF],   // Georgian
  [0x1200, 0x137F],   // Ethiopic
  [0x13A0, 0x13FF],   // Cherokee
  [0x1400, 0x167F],   // Canadian Syllabics
  [0x1800, 0x18AF],   // Mongolian
  [0x0F00, 0x0FFF],   // Tibetan
  [0x1100, 0x11FF],   // Hangul Jamo
  [0x3040, 0x309F],   // Hiragana (Japanese)
  [0x30A0, 0x30FF],   // Katakana (Japanese)
  [0x31F0, 0x31FF],   // Katakana Phonetic Extensions
  [0xAC00, 0xD7AF],   // Hangul Syllables (Korean)
  [0x4E00, 0x9FFF],   // CJK Unified Ideographs (Chinese, Japanese, Korean)
  [0x3400, 0x4DBF],   // CJK Extension A
  [0x20000, 0x2A6DF], // CJK Extension B
  [0x2F800, 0x2FA1F], // CJK Compatibility Ideographs Supplement
  [0x2E80, 0x2EFF],   // CJK Radicals Supplement
  [0x2F00, 0x2FDF],   // Kangxi Radicals
];

function isUnsupportedCodePoint(cp: number): boolean {
  for (let i = 0; i < UNSUPPORTED_SCRIPT_RANGES.length; i++) {
    const [lo, hi] = UNSUPPORTED_SCRIPT_RANGES[i];
    if (cp >= lo && cp <= hi) return true;
  }
  return false;
}

export function detectUnsupportedScript(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i)!;
    if (cp > 0xFFFF) i++; // skip surrogate pair second half
    if (isUnsupportedCodePoint(cp)) return true;
  }
  return false;
}

function hasUnsupportedInRuns(runs: IRTextRun[]): boolean {
  return runs.some(r => detectUnsupportedScript(r.text));
}

export function hasUnsupportedScriptInPages(pages: IRPageIR[]): boolean {
  return pages.some(page =>
    page.blocks.some(b => {
      if (b.kind === 'table') {
        return b.cells.some(row => row.some(cell => hasUnsupportedInRuns(cell.runs)));
      }
      if ('runs' in b) {
        return hasUnsupportedInRuns(b.runs);
      }
      return false;
    }),
  );
}

const DXA_PER_PT = 20;

function getText(el: Element): string {
  let s = '';
  const children = el.childNodes;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.nodeType !== 1) continue;
    const child = node as Element;
    if (child.localName === 't' && child.namespaceURI === WORD_NS) {
      s += child.textContent || '';
    }
  }
  return s;
}

function parseRuns(
  pEl: Element,
  resolvedStyles: { styles: Map<string, StyleDef>; docDefaults: RunProps },
  pStyleId: string | undefined,
  pPrRunProps: Partial<RunProps> | undefined,
): IRTextRun[] {
  const runs: IRTextRun[] = [];
  // Only direct children <w:r> — skip <w:r> inside <w:txbxContent> (textboxes)
  const children = pEl.childNodes;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    if (el.localName !== 'r' || el.namespaceURI !== WORD_NS) continue;
    const text = getText(el);
    if (!text) continue;
    const rPrEl = el.getElementsByTagNameNS(WORD_NS, 'rPr');
    const rPr = rPrEl.length > 0 ? parseRPr(rPrEl[0]) : undefined;
    const resolved = resolveRunProps(
      resolvedStyles.styles, resolvedStyles.docDefaults,
      pStyleId, pPrRunProps, rPr,
    );
    runs.push({
      text,
      fontName: resolved.font || 'Arial',
      fontSize: resolved.size ? parseInt(resolved.size) / 2 : 11,
      width: 0,
      height: 0,
      position: { x: 0, y: 0 },
      color: resolved.color || '000000',
      bold: resolved.bold ?? false,
      italic: resolved.italic ?? false,
      rotation: 0,
    });
  }
  return runs;
}

function parseHeadingLevel(pStyleId: string | null): number | null {
  if (!pStyleId) return null;
  const m = pStyleId.match(/^Heading(\d)$/i);
  return m ? parseInt(m[1]) : null;
}

function processParagraph(
  pEl: Element,
  resolvedStyles: { styles: Map<string, StyleDef>; docDefaults: RunProps },
  imageMap: Map<string, DocxImage>,
  seenRids: Set<string>,
): IRBlock[] {
  const blocks: IRBlock[] = [];
  const pPr = pEl.getElementsByTagNameNS(WORD_NS, 'pPr');
  let pStyleId: string | undefined;
  let numPrEl: Element | null = null;
  let pPrRPr: Partial<RunProps> | undefined;

  if (pPr.length > 0) {
    const styleEls = pPr[0].getElementsByTagNameNS(WORD_NS, 'pStyle');
    if (styleEls.length > 0) pStyleId = getLocal(styleEls[0], 'val') || undefined;
    const numPr = pPr[0].getElementsByTagNameNS(WORD_NS, 'numPr');
    if (numPr.length > 0) numPrEl = numPr[0];
    const rPr = pPr[0].getElementsByTagNameNS(WORD_NS, 'rPr');
    if (rPr.length > 0) pPrRPr = parseRPr(rPr[0]) || undefined;
  }

  // Check for images in this paragraph (direct children only — skip textboxes)
  const pChildren = pEl.childNodes;
  for (let i = 0; i < pChildren.length; i++) {
    const node = pChildren[i];
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    if (el.localName === 'r' && el.namespaceURI === WORD_NS) {
      // Check <w:drawing> direct children of this <w:r>
      const drvs = el.getElementsByTagNameNS(WORD_NS, 'drawing');
      for (let d = 0; d < drvs.length; d++) {
        const blips = drvs[d].getElementsByTagNameNS(DRAWINGML_NS, 'blip');
        for (let j = 0; j < blips.length; j++) {
          const embed = blips[j].getAttributeNS(REL_NS, 'embed');
          if (embed && imageMap.has(embed) && !seenRids.has(embed)) {
            seenRids.add(embed);
            const img = imageMap.get(embed)!;
            const w = emuToPt(img.widthEMU);
            const h = emuToPt(img.heightEMU);
            blocks.push({
              kind: 'image',
              imageId: embed,
              naturalWidth: w,
              naturalHeight: h,
              bounds: { x: 0, y: 0, width: w, height: h },
            });
          }
        }
      }
      // Check <w:pict> direct children of this <w:r>
      const picts = el.getElementsByTagNameNS(VML_NS, 'imagedata');
      for (let j = 0; j < picts.length; j++) {
        const rid = picts[j].getAttributeNS(REL_NS, 'id')
          || picts[j].getAttribute('r:id');
        if (rid && imageMap.has(rid) && !seenRids.has(rid)) {
          seenRids.add(rid);
          const img = imageMap.get(rid)!;
          const w = emuToPt(img.widthEMU);
          const h = emuToPt(img.heightEMU);
          blocks.push({
            kind: 'image',
            imageId: rid,
            naturalWidth: w,
            naturalHeight: h,
            bounds: { x: 0, y: 0, width: w, height: h },
          });
        }
      }
    }
  }

  // Text runs
  const runs = parseRuns(pEl, resolvedStyles, pStyleId, pPrRPr);
  const text = runs.map(r => r.text).join('').trim();
  if (!text && blocks.length > 0) return blocks;
  if (!text) return [];

  const bounds: IRRect = { x: 0, y: 0, width: 0, height: 0 };

  if (numPrEl) {
    const ilvl = numPrEl.getElementsByTagNameNS(WORD_NS, 'ilvl');
    const level = ilvl.length > 0 ? parseInt(getLocal(ilvl[0], 'val') || '0') : 0;
    blocks.unshift({
      kind: 'list-item',
      marker: '•',
      level,
      runs,
      bounds,
    });
  } else {
    const headingLevel = parseHeadingLevel(pStyleId || null);
    if (headingLevel) {
      blocks.unshift({
        kind: 'heading',
        level: headingLevel,
        runs,
        bounds,
      });
    } else {
      blocks.unshift({
        kind: 'paragraph',
        runs,
        bounds,
      });
    }
  }

  return blocks;
}

function emuToPt(emu: number): number {
  return Math.round(emu / EMU_PER_PT * 10) / 10;
}

export interface DocxIRResult {
  pages: IRPageIR[];
  images: Map<string, DocxImage>;
}

function processTable(
  tblEl: Element,
  resolvedStyles: { styles: Map<string, StyleDef>; docDefaults: RunProps },
): IRTableBlock {
  const rows: IRTableCell[][] = [];
  const trEls = tblEl.getElementsByTagNameNS(WORD_NS, 'tr');

  for (let r = 0; r < trEls.length; r++) {
    const row: IRTableCell[] = [];
    const tcEls = trEls[r].getElementsByTagNameNS(WORD_NS, 'tc');
    for (let c = 0; c < tcEls.length; c++) {
      const tc = tcEls[c];
      const tcPr = tc.getElementsByTagNameNS(WORD_NS, 'tcPr');
      let colspan = 1;
      if (tcPr.length > 0) {
        const gs = tcPr[0].getElementsByTagNameNS(WORD_NS, 'gridSpan');
        if (gs.length > 0) colspan = parseInt(getLocal(gs[0], 'val') || '1');
      }
      // Collect all text runs from paragraphs inside this cell
      const cellRuns: IRTextRun[] = [];
      const pEls = tc.getElementsByTagNameNS(WORD_NS, 'p');
      for (let p = 0; p < pEls.length; p++) {
        const pRuns = parseRuns(pEls[p], resolvedStyles, undefined, undefined);
        cellRuns.push(...pRuns);
      }
      row.push({ runs: cellRuns, colspan, rowspan: 1 });
    }
    if (row.length > 0) rows.push(row);
  }

  // Grid column widths from <w:tblGrid>
  const gridCols = tblEl.getElementsByTagNameNS(WORD_NS, 'gridCol');
  const colWidths: number[] = [];
  for (let i = 0; i < gridCols.length; i++) {
    const w = parseInt(getLocal(gridCols[i], 'w') || '0');
    colWidths.push(Math.round(w / DXA_PER_PT));
  }

  const totalW = colWidths.reduce((a, b) => a + b, 0);
  return {
    kind: 'table',
    cells: rows,
    bounds: { x: 0, y: 0, width: totalW, height: 0 },
    columnWidths: colWidths,
  };
}

export async function docxToIR(file: File): Promise<DocxIRResult> {
  const JSZip = (await import('jszip')).default;
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const docXml = await zip.file('word/document.xml')!.async('string');
  const stylesXml = await zip.file('word/styles.xml')?.async('string') || '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>';
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string') || '';

  const resolvedStyles = parseStylesXml(stylesXml);
  const rels = parseRels(relsXml);

  // Build image data map: rId → bytes
  const imageMap = new Map<string, DocxImage>();
  const imageRefs = extractImagesFromXml(docXml, rels);
  for (const ref of imageRefs) {
    const rel = rels.get(ref.rId);
    if (!rel) continue;
    const target = rel.target.startsWith('media/') ? rel.target : `media/${rel.target}`;
    const entry = zip.file(`word/${target}`);
    if (!entry) continue;
    const data = await entry.async('uint8array');
    imageMap.set(ref.rId, {
      rId: ref.rId,
      target,
      data,
      widthEMU: ref.widthEMU,
      heightEMU: ref.heightEMU,
      source: ref.source,
    });
  }

  // Parse document.xml
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'application/xml');
  const body = doc.getElementsByTagNameNS(WORD_NS, 'body');
  if (body.length === 0) return { pages: [{ width: 595, height: 842, blocks: [] }], images: imageMap };

  // Page size from last <w:sectPr>/<w:pgSz>
  let pageW = 595, pageH = 842;
  const sectPr = body[0].getElementsByTagNameNS(WORD_NS, 'sectPr');
  if (sectPr.length > 0) {
    const pgSz = sectPr[sectPr.length - 1].getElementsByTagNameNS(WORD_NS, 'pgSz');
    if (pgSz.length > 0) {
      const w = parseInt(getLocal(pgSz[0], 'w') || '0');
      const h = parseInt(getLocal(pgSz[0], 'h') || '0');
      if (w && h) { pageW = Math.round(w / DXA_PER_PT); pageH = Math.round(h / DXA_PER_PT); }
    }
  }

  // Traverse body children in document order
  const blocks: IRBlock[] = [];
  const seenRids = new Set<string>();
  const children = body[0].childNodes;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    if (el.localName === 'p') {
      blocks.push(...processParagraph(el, resolvedStyles, imageMap, seenRids));
    } else if (el.localName === 'tbl') {
      blocks.push(processTable(el, resolvedStyles));
    }
  }

  return { pages: [{ width: pageW, height: pageH, blocks }], images: imageMap };
}

// ============================================================
// IR → DOCX RENDERER
// ============================================================

const IR_HEADING_MAP: Record<number, string> = {
  1: 'Heading1', 2: 'Heading2', 3: 'Heading3',
  4: 'Heading4', 5: 'Heading5', 6: 'Heading6',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function irRunsToTextRuns(TRC: any, runs: IRTextRun[]): any[] {
  return runs.map(run => new TRC({
    text: run.text,
    bold: run.bold || undefined,
    italics: run.italic || undefined,
    color: run.color.replace('#', ''),
    size: Math.round(run.fontSize * 2),
    font: run.fontName || undefined,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function irRunsToTextRunsRotated(TRC: any, runs: IRTextRun[], rotation: number): any[] {
  const prefix = new TRC({
    text: `[Obrócony tekst ${Math.round(rotation)}°: "`,
    italics: true,
    color: '888888',
    size: 10,
  });
  const content = runs.map(run => new TRC({
    text: run.text,
    italics: true,
    color: '888888',
    size: Math.round(run.fontSize * 2),
    font: run.fontName || undefined,
  }));
  const suffix = new TRC({
    text: '"]',
    italics: true,
    color: '888888',
    size: 10,
  });
  return [prefix, ...content, suffix];
}

export async function renderIRToDocx(pages: IRPageIR[]): Promise<Blob> {
  const {
    Document, Packer, Paragraph, HeadingLevel, TextRun,
    Table, TableRow, TableCell, WidthType, BorderStyle,
  } = await import('docx');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allChildren: any[] = [];

  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.kind === 'table') {
        const table = block as IRTableBlock;
        const docxRows = table.cells.map(row =>
          new TableRow({
            children: row.map(cell => {
              if (!cell) return new TableCell({ children: [new Paragraph('')] });
              const paragraphs = cell.runs.length > 0
                ? [new Paragraph({ children: irRunsToTextRuns(TextRun, cell.runs) })]
                : [new Paragraph('')];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const opts: any = { children: paragraphs };
              if (cell.colspan > 1) opts.columnSpan = cell.colspan;
              if (cell.rowspan > 1) opts.rowSpan = cell.rowspan;
              return new TableCell(opts);
            }),
          })
        );

        // columnWidths from IR are in PDF points; docx columnWidths expects DXA (1pt = 20 DXA)
        allChildren.push(new Table({
          rows: docxRows,
          columnWidths: table.columnWidths.map(w => Math.round(w * 20)),
          width: { size: Math.round(table.columnWidths.reduce((a, b) => a + b, 0) * 20), type: WidthType.DXA },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          },
        }));
        continue;
      }

      const hasRotation = 'runs' in block && (block as { runs: IRTextRun[] }).runs.some(r => Math.abs(r.rotation) > 1);

      if (block.kind === 'image') {
        const img = block as IRImageBlock;
        allChildren.push(new Paragraph({
          children: [new TextRun({
            text: `[Image: ${img.naturalWidth}×${img.naturalHeight}]`,
            italics: true,
            color: '888888',
          })],
        }));
      } else if (block.kind === 'heading') {
        const h = block as IRHeadingBlock;
        const level = Math.min(Math.max(h.level, 1), 6);
        const headingKey = IR_HEADING_MAP[level] as keyof typeof HeadingLevel;
        if (hasRotation) {
          allChildren.push(new Paragraph({
            children: irRunsToTextRunsRotated(TextRun, h.runs, h.runs[0]?.rotation ?? 0),
          }));
        } else {
          allChildren.push(new Paragraph({
            heading: HeadingLevel[headingKey],
            children: irRunsToTextRuns(TextRun, h.runs),
          }));
        }
      } else if (block.kind === 'list-item') {
        const li = block as IRListItemBlock;
        const level = Math.min(li.level, 8);
        if (hasRotation) {
          allChildren.push(new Paragraph({
            children: irRunsToTextRunsRotated(TextRun, li.runs, li.runs[0]?.rotation ?? 0),
          }));
        } else {
          allChildren.push(new Paragraph({
            bullet: { level },
            children: irRunsToTextRuns(TextRun, li.runs),
          }));
        }
      } else {
        const p = block as IRParagraphBlock;
        if (hasRotation) {
          allChildren.push(new Paragraph({
            children: irRunsToTextRunsRotated(TextRun, p.runs, p.runs[0]?.rotation ?? 0),
          }));
        } else {
          allChildren.push(new Paragraph({
            children: irRunsToTextRuns(TextRun, p.runs),
          }));
        }
      }
    }
  }

  const doc = new Document({
    sections: [{ children: allChildren }],
  });
  return await Packer.toBlob(doc);
}

// ============================================================
// IR → PDF RENDERER
// ============================================================
// Renders IRPageIR[] to PDF using LiberationSans (via @pdf-lib/fontkit).
// Covers Latin/Cyrillic/Greek scripts. For Arabic/Devanagari/CJK/Thai/
// Hebrew, detectUnsupportedScript() should trigger fallback to legacy
// officeToPdf() BEFORE reaching this renderer.
//
// KNOWN LIMITATION: Text inside <w:txbxContent> is not present in IR
// (excluded by docxToIR getText/parseRuns). Those paragraphs will
// simply not appear in the output.
//
// KNOWN LIMITATION: tables are split across pages row-by-row, but a
// single table row taller than one page height is not split vertically
// and may overflow the bottom margin.

function hexToColor(hex: string): ReturnType<typeof rgb> {
  const h = hex.replace('#', '');
  return rgb(
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  );
}

const FONT_SIZES: Record<number, number> = {
  1: 24, 2: 20, 3: 16, 4: 13, 5: 11.5, 6: 10.5,
};

type EmbeddedFonts = {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
};

function pickFont(fonts: EmbeddedFonts, bold: boolean, italic: boolean): PDFFont {
  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.italic;
  return fonts.regular;
}

function measureText(fonts: EmbeddedFonts, run: IRTextRun): number {
  return pickFont(fonts, run.bold, run.italic).widthOfTextAtSize(run.text, run.fontSize);
}

function breakIntoLines(
  runs: IRTextRun[],
  fonts: EmbeddedFonts,
  maxLineWidth: number,
): Array<{ runs: Array<{ run: IRTextRun; font: PDFFont; width: number }>; width: number }> {
  const lines: Array<{ runs: Array<{ run: IRTextRun; font: PDFFont; width: number }>; width: number }> = [];
  let currentLine: Array<{ run: IRTextRun; font: PDFFont; width: number }> = [];
  let currentWidth = 0;

  for (const run of runs) {
    const words = run.text.split(/(?<=\s)/);
    for (const word of words) {
      if (!word) continue;
      const wordRun: IRTextRun = { ...run, text: word };
      const w = measureText(fonts, wordRun);
      if (currentLine.length > 0 && currentWidth + w > maxLineWidth) {
        lines.push({ runs: currentLine, width: currentWidth });
        currentLine = [];
        currentWidth = 0;
      }
      currentLine.push({ run: wordRun, font: pickFont(fonts, run.bold, run.italic), width: w });
      currentWidth += w;
    }
  }
  if (currentLine.length > 0) lines.push({ runs: currentLine, width: currentWidth });
  return lines;
}

export async function renderIRToPdf(
  pages: IRPageIR[],
  images: Map<string, DocxImage>,
  loadFontBytes?: (fileName: string) => Promise<Uint8Array>,
): Promise<Blob> {
  // Font loading defaults to browser fetch() from public/pdfjs-dist/standard_fonts/.
  // Callers in Node/test environments may inject their own loader.
  const load = loadFontBytes ?? (async (name: string) => {
    const res = await fetch(`/pdfjs-dist/standard_fonts/${name}`);
    if (!res.ok) throw new Error(`Font fetch failed: ${name} (${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  });

  const fontkit = (await import('@pdf-lib/fontkit')).default;
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fonts: EmbeddedFonts = {
    regular: await pdfDoc.embedFont(await load('LiberationSans-Regular.ttf')),
    bold: await pdfDoc.embedFont(await load('LiberationSans-Bold.ttf')),
    italic: await pdfDoc.embedFont(await load('LiberationSans-Italic.ttf')),
    boldItalic: await pdfDoc.embedFont(await load('LiberationSans-BoldItalic.ttf')),
  };

  const MARGIN = 50;
  let currentPage: PDFPage | null = null;
  let cursorY = 0;
  let pageW = 595;
  let pageH = 842;

  function ensurePage(): void {
    if (!currentPage) {
      currentPage = pdfDoc.addPage([pageW, pageH]);
      cursorY = pageH - MARGIN;
    }
  }

  function breakPage(): void {
    currentPage = null;
  }

  function ensureSpace(needed: number): void {
    ensurePage();
    if (cursorY - needed < MARGIN) breakPage();
    ensurePage();
  }

  function drawTextBlock(
    runs: IRTextRun[],
    fontSize: number,
    indentPt: number,
  ): void {
    if (runs.length === 0) return;
    const availW = pageW - MARGIN * 2 - indentPt;
    const lines = breakIntoLines(runs, fonts, availW);
    const lineH = fontSize * 1.3;

    for (const line of lines) {
      ensureSpace(lineH);
      let x = MARGIN + indentPt;
      for (const seg of line.runs) {
        currentPage!.drawText(seg.run.text, {
          x,
          y: cursorY - seg.run.fontSize,
          size: seg.run.fontSize,
          font: seg.font,
          color: hexToColor(seg.run.color),
        });
        x += seg.width;
      }
      cursorY -= lineH;
    }
  }

  async function renderBlock(block: IRBlock): Promise<void> {
    if (block.kind === 'heading') {
      const h = block as IRHeadingBlock;
      const fs = FONT_SIZES[Math.min(h.level, 6)] || 11;
      ensureSpace(fs * 1.5);
      drawTextBlock(h.runs, fs, 0);
      cursorY -= fs * 0.3;
    } else if (block.kind === 'list-item') {
      const li = block as IRListItemBlock;
      const indent = 20 + li.level * 15;
      const markerW = fonts.regular.widthOfTextAtSize(li.marker + ' ', li.runs[0]?.fontSize || 11);
      ensureSpace(li.runs[0]?.fontSize || 11);
      const fs = li.runs[0]?.fontSize || 11;
      const font = pickFont(fonts, li.runs[0]?.bold || false, li.runs[0]?.italic || false);
      currentPage!.drawText(li.marker + ' ', {
        x: MARGIN + indent - markerW,
        y: cursorY - fs,
        size: fs,
        font,
        color: hexToColor(li.runs[0]?.color || '000000'),
      });
      drawTextBlock(li.runs, fs, indent);
    } else if (block.kind === 'image') {
      await renderImage(block as IRImageBlock);
    } else if (block.kind === 'table') {
      renderTable(block as IRTableBlock);
    } else {
      const p = block as IRParagraphBlock;
      const fs = p.runs[0]?.fontSize || 11;
      drawTextBlock(p.runs, fs, 0);
      cursorY -= fs * 0.3;
    }
  }

  async function renderImage(img: IRImageBlock): Promise<void> {
    const imgData = images.get(img.imageId);
    if (!imgData) {
      // Guard: an image block without its bytes would otherwise render blank
      // silently. docxToIR() returns pages + images together (contract):
      // pass BOTH from the same result. Missing entries here mean a bug.
      console.warn(`[renderIRToPdf] image block references unknown imageId: ${img.imageId}`);
      return;
    }
    const availW = pageW - MARGIN * 2;
    const availH = cursorY - MARGIN;
    if (availH < 50) breakPage();
    const scale = Math.min(1, availW / img.naturalWidth, (pageH - MARGIN * 2) / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ensureSpace(h);
    const target = imgData.target.toLowerCase();
    let embedded: PDFImage | undefined;
    try {
      if (target.endsWith('.jpg') || target.endsWith('.jpeg')) {
        embedded = await pdfDoc.embedJpg(imgData.data);
      } else {
        embedded = await pdfDoc.embedPng(imgData.data);
      }
    } catch { return; }
    if (embedded) {
      currentPage!.drawImage(embedded, {
        x: MARGIN,
        y: cursorY - h,
        width: w,
        height: h,
      });
      cursorY -= h + 5;
    }
  }

  function renderTable(table: IRTableBlock): void {
    const nCols = table.columnWidths.length;
    if (nCols === 0) return;
    const totalW = table.columnWidths.reduce((a, b) => a + b, 0);
    if (totalW === 0) return;
    const tableW = Math.min(totalW, pageW - MARGIN * 2);
    const scale = totalW > 0 && tableW < totalW ? tableW / totalW : 1;
    const colWidths = table.columnWidths.map(w => w * scale);
    // precomputed absolute left edge of each grid column
    const colX: number[] = [];
    let acc = MARGIN;
    for (const w of colWidths) { colX.push(acc); acc += w; }

    const PAD = 4;
    const LINE_H = 12;
    const nRows = table.cells.length;

    // Assign every top-left cell to a (row, gridCol) position, honouring the
    // footprint left by previous colspan/rowspan cells above/left of it.
    const starts: { r: number; g: number; cell: IRTableCell }[] = [];
    const activeRowspan: number[] = new Array(nCols).fill(0);
    for (let r = 0; r < nRows; r++) {
      const row = table.cells[r];
      let g = 0;
      const newlyOwned: number[] = new Array(nCols).fill(0);
      for (let k = 0; k < row.length && g < nCols; k++) {
        while (g < nCols && activeRowspan[g] > 0) g++;
        const cell: IRTableCell | undefined = row[k];
        if (!cell) { g++; continue; }
        const cs = Math.min(Math.max(cell.colspan || 1, 1), nCols - g);
        const rs = Math.max(cell.rowspan || 1, 1);
        starts.push({ r, g, cell });
        for (let cc = 0; cc < cs; cc++) {
          if (rs > 1) {
            // A rowspan cell covers EVERY spanned column in the following rows,
            // not just its first column — mark them all so later rows skip them.
            activeRowspan[g] = Math.max(activeRowspan[g], rs - 1);
            newlyOwned[g] = 1;
          }
          g++;
        }
      }
      // Consume one row of occupancy only for spans started in earlier rows;
      // a span begun in this row must still cover the following rows.
      for (let c = 0; c < nCols; c++) if (!newlyOwned[c]) activeRowspan[c] = Math.max(0, activeRowspan[c] - 1);
    }

    // Pass 1: row heights — base from non-rowspan cells in each row, then grow
    // the last row of any rowspan range to fit its overflow.
    const baseH = new Array<number>(nRows).fill(LINE_H + PAD * 2);
    const cellHeight = (g: number, cs: number, cell: IRTableCell): number => {
      const cw = colWidths.slice(g, g + cs).reduce((a, b) => a + b, 0) - PAD * 2;
      if (cw <= 0 || cell.runs.length === 0) return LINE_H + PAD * 2;
      const lines = breakIntoLines(cell.runs, fonts, Math.max(cw, 1));
      return Math.max(lines.length * LINE_H + PAD * 2, LINE_H + PAD * 2);
    };
    for (const { r, g, cell } of starts) {
      const cs = Math.min(Math.max(cell.colspan || 1, 1), nCols - g);
      const rs = Math.max(cell.rowspan || 1, 1);
      if (rs > 1) continue; // handled below
      baseH[r] = Math.max(baseH[r], cellHeight(g, cs, cell));
    }
    for (const { r, g, cell } of starts) {
      const cs = Math.min(Math.max(cell.colspan || 1, 1), nCols - g);
      const rs = Math.max(cell.rowspan || 1, 1);
      if (rs <= 1) continue;
      const H = cellHeight(g, cs, cell);
      const spanEnd = Math.min(r + rs - 1, nRows - 1);
      let occupied = 0;
      for (let rr = r; rr <= spanEnd; rr++) occupied += baseH[rr];
      if (H > occupied) baseH[spanEnd] += H - occupied;
    }
    const rowHeights = baseH;
    const totalH = rowHeights.reduce((a, b) => a + b, 0);
    ensurePage();

    let tableY = cursorY;
    // Recompute occupancy fresh for the drawing pass (starts above already
    // consumed the occupancy once; use a dedicated copy here).
    const drawActive: number[] = new Array(nCols).fill(0);
    for (let r = 0; r < nRows; r++) {
      const row = table.cells[r];
      const rh = rowHeights[r];
      const newlyOwned: number[] = new Array(nCols).fill(0);

      // Force a page break before this row when it does not fit below the
      // table cursor — but not on an already-empty page (that would risk an
      // infinite break loop for a row taller than the whole page).
      if (tableY - rh < MARGIN && tableY !== pageH - MARGIN) {
        breakPage();
        ensurePage();
        tableY = cursorY;
      }

      let g = 0;
      for (let k = 0; k < row.length && g < nCols; k++) {
        while (g < nCols && drawActive[g] > 0) g++;
        const cell: IRTableCell | undefined = row[k];
        if (!cell) { g++; continue; }
        const cs = Math.min(Math.max(cell.colspan || 1, 1), nCols - g);
        const rs = Math.max(cell.rowspan || 1, 1);
        const cellW = colWidths.slice(g, g + cs).reduce((a, b) => a + b, 0);
        const spanEnd = Math.min(r + rs - 1, nRows - 1);
        const cellY2 = tableY;
        let cellH = 0;
        for (let rr = r; rr <= spanEnd; rr++) cellH += rowHeights[rr];
        const cellXX = colX[g];

        currentPage!.drawRectangle({
          x: cellXX, y: cellY2 - cellH, width: cellW, height: cellH,
          borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.5,
        });

        if (cell.runs.length > 0) {
          const cwInner = cellW - PAD * 2;
          let textY = cellY2 - PAD - LINE_H;
          if (cwInner > 0) {
            const lines = breakIntoLines(cell.runs, fonts, Math.max(cwInner, 1));
            for (const line of lines) {
              let textX = cellXX + PAD;
              if (textY < 60) break; // clamp decoration overflow
              for (const seg of line.runs) {
                currentPage!.drawText(seg.run.text, {
                  x: textX, y: textY, size: seg.run.fontSize,
                  font: seg.font,
                  color: hexToColor(seg.run.color),
                });
                textX += seg.width;
              }
              textY -= LINE_H;
            }
          }
        }

        for (let cc = 0; cc < cs; cc++) {
          if (rs > 1) {
            drawActive[g] = Math.max(drawActive[g], rs - 1);
            newlyOwned[g] = 1;
          }
          g++;
        }
      }
      // Consume one row of occupancy only for spans started in earlier rows.
      for (let c = 0; c < nCols; c++) if (!newlyOwned[c]) drawActive[c] = Math.max(0, drawActive[c] - 1);
      tableY -= rh;
    }
    cursorY = tableY - 5;
  }

  // ── MAIN RENDER LOOP ──
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    pageW = page.width;
    pageH = page.height;

    if (i > 0) breakPage();
    ensurePage();

    for (const block of page.blocks) {
      await renderBlock(block);
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
}

// ============================================================
// ODF → IR (Components 1-3) — OpenDocument (.odt) extraction
// Mirrors the OOXML docxToIR pipeline above, for ODF documents.
// Uses the NATIVE browser global DOMParser (same as parseRels/
// parseStylesXml above) — no @xmldom in production.
// ============================================================

const ODF_OFFICE = 'urn:oasis:names:tc:opendocument:xmlns:office:1.0';
const ODF_STYLE = 'urn:oasis:names:tc:opendocument:xmlns:style:1.0';
const ODF_TEXT = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0';
const ODF_DRAW = 'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0';
const ODF_SVG = 'urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0';
const ODF_TABLE = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0';
const ODF_FO = 'urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0';
const ODF_MANIFEST = 'urn:oasis:names:tc:opendocument:xmlns:manifest:1.0';
const XLINK = 'http://www.w3.org/1999/xlink';

const ODF_A4_W = 595;
const ODF_A4_H = 842;
const ODF_DEFAULT_FONT = 'Arial';
const ODF_DEFAULT_SIZE = 11;

// ============================================================
// ODF Component 1 — STYLE RESOLUTION
// ============================================================

export interface OdfRunProps {
  font?: string;       // style:font-name
  size?: number;       // fo:font-size (pt, decimal)
  bold?: boolean;      // fo:font-weight
  italic?: boolean;    // fo:font-style
  color?: string;      // fo:color (hex, e.g. #E94F1E)
  underline?: string;  // style:text-underline-style
}

export interface OdfStyleDef {
  family: string;                // paragraph | text
  parent?: string;               // style:parent-style-name
  displayName?: string;          // style:display-name
  defaultOutlineLevel?: number;  // style:default-outline-level (headings)
  rPr?: OdfRunProps;
  pPr?: Record<string, string>;  // paragraph props (captured, not mapped to IR run)
}

export interface OdfStyleIndex {
  styles: Map<string, OdfStyleDef>;       // key `${family}\u0000${name}`
  defaults: Map<string, OdfRunProps>;     // family -> default-style text props
  defaultParas: Map<string, Record<string, string>>;
}

// Namespace-aware attribute getter (style:name, text:outline-level, fo:color, ...)
function odfAttr(el: Element | null, local: string): string | null {
  if (!el) return null;
  const nsCandidates = [ODF_STYLE, ODF_TEXT, ODF_FO, ODF_OFFICE];
  for (const ns of nsCandidates) {
    const v = el.getAttributeNS(ns, local);
    if (v !== null) return v;
  }
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes.item(i);
    if (a && a.localName === local) return a.value;
  }
  return null;
}

function odfChildNS(el: Element, ns: string, local: string): Element | undefined {
  const list = el.getElementsByTagNameNS(ns, local);
  return list.length ? (list.item(0) as unknown as Element) : undefined;
}

function odfParseLenPt(v: string | null): number | undefined {
  if (!v) return undefined;
  const m = v.match(/^([-+]?[0-9]*\.?[0-9]+)\s*(pt|mm|cm|in|px)?$/i);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  const unit = (m[2] || 'pt').toLowerCase();
  switch (unit) {
    case 'pt': return n;
    case 'mm': return n * 2.83464567;
    case 'cm': return n * 28.3464567;
    case 'in': return n * 72;
    case 'px': return n;
    default: return n;
  }
}

function odfParseTextProps(te: Element | null): OdfRunProps | undefined {
  if (!te) return undefined;
  const p: OdfRunProps = {};
  const font = odfAttr(te, 'font-name');
  if (font) p.font = font;
  const size = odfParseLenPt(odfAttr(te, 'font-size'));
  if (size !== undefined) p.size = size;
  const w = odfAttr(te, 'font-weight');
  if (w !== null && /bold/i.test(w)) p.bold = true;
  else if (w !== null && /normal/i.test(w)) p.bold = false;
  const st = odfAttr(te, 'font-style');
  if (st !== null && /italic|oblique/i.test(st)) p.italic = true;
  else if (st !== null && /normal/i.test(st)) p.italic = false;
  const c = odfAttr(te, 'color');
  if (c && /^#[0-9a-fA-F]{6}$/.test(c)) p.color = c.toUpperCase();
  const ul = odfAttr(te, 'text-underline-style');
  if (ul && ul !== 'none') p.underline = ul;
  return Object.keys(p).length ? p : undefined;
}

/** Resolve run props for a named style (paragraph or text family) up its parent chain. */
export function resolveOdfRunProps(
  index: OdfStyleIndex,
  styleName: string,
  family: 'paragraph' | 'text',
): OdfRunProps {
  const keyOf = (f: string, n: string) => `${f}\u0000${n}`;
  let resolved: OdfRunProps = { ...(index.defaults.get(family) || {}) };
  const order: string[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = styleName;
  while (cur) {
    if (seen.has(cur)) break;
    seen.add(cur);
    order.unshift(cur);
    const def = index.styles.get(keyOf(family, cur));
    if (!def) break;
    cur = def.parent;
  }
  for (const nm of order) {
    const def = index.styles.get(keyOf(family, nm));
    if (def?.rPr) resolved = { ...resolved, ...def.rPr };
  }
  return resolved;
}

/** Resolve props for a run in a paragraph context: paragraph chain, then run/span chain. */
export function resolveOdfRunContext(
  index: OdfStyleIndex,
  pStyleName: string | undefined,
  runStyleNames: string[],
): { rPr: OdfRunProps; fontFamily: 'text'; chain: string[] } {
  let resolved: OdfRunProps = { ...(index.defaults.get('paragraph') || {}) };
  const seen = new Set<string>();
  const keyOf = (f: string, n: string) => `${f}\u0000${n}`;
  const chain: string[] = [];
  const merged = new Set<string>();

  const collect = (family: 'paragraph' | 'text', name: string): string[] => {
    const order: string[] = [];
    let cur: string | undefined = name;
    while (cur) {
      if (seen.has(cur)) break;
      seen.add(cur);
      order.unshift(cur);
      const def = index.styles.get(keyOf(family, cur));
      if (!def) break;
      cur = def.parent;
    }
    return order;
  };

  const paraOrder = pStyleName ? collect('paragraph', pStyleName) : [];
  for (const nm of paraOrder) {
    if (merged.has(nm)) continue;
    merged.add(nm); chain.push(`p:${nm}`);
    const def = index.styles.get(keyOf('paragraph', nm));
    if (def?.rPr) resolved = { ...resolved, ...def.rPr };
  }

  for (const runStyle of runStyleNames) {
    const textOrder = collect('text', runStyle);
    for (const nm of textOrder) {
      if (merged.has(nm)) continue;
      merged.add(nm); chain.push(`t:${nm}`);
      const def = index.styles.get(keyOf('text', nm));
      if (def?.rPr) resolved = { ...resolved, ...def.rPr };
    }
  }
  return { rPr: resolved, fontFamily: 'text', chain };
}

function odfParseParagraphProps(pe: Element | null): Record<string, string> | undefined {
  if (!pe) return undefined;
  const out: Record<string, string> = {};
  for (let i = 0; i < pe.attributes.length; i++) {
    const a = pe.attributes.item(i);
    if (a) out[a.name] = a.value;
  }
  return Object.keys(out).length ? out : undefined;
}

function odfParseStyleBlock(styleEl: Element): OdfStyleDef {
  const def: OdfStyleDef = { family: odfAttr(styleEl, 'family') || 'paragraph' };
  const name = odfAttr(styleEl, 'name');
  const parent = odfAttr(styleEl, 'parent-style-name');
  const display = odfAttr(styleEl, 'display-name');
  const olevel = odfAttr(styleEl, 'default-outline-level');
  (def as unknown as { name?: string }).name = name || '';
  if (parent) def.parent = parent;
  if (display) def.displayName = display;
  if (olevel) def.defaultOutlineLevel = parseInt(olevel, 10);
  const te = odfChildNS(styleEl, ODF_STYLE, 'text-properties');
  const pe = odfChildNS(styleEl, ODF_STYLE, 'paragraph-properties');
  def.rPr = odfParseTextProps(te || null);
  def.pPr = odfParseParagraphProps(pe || null);
  return def;
}

/** Parse document-styles / document-content roots into a style registry. */
export function parseOdfStyles(xmls: string[]): OdfStyleIndex {
  const index: OdfStyleIndex = { styles: new Map(), defaults: new Map(), defaultParas: new Map() };
  const keyOf = (f: string, n: string) => `${f}\u0000${n}`;
  for (const xml of xmls) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const styleEls = doc.getElementsByTagNameNS(ODF_STYLE, 'style');
    for (let i = 0; i < styleEls.length; i++) {
      const el = styleEls.item(i) as unknown as Element;
      const name = odfAttr(el, 'name');
      if (name) {
        const def = odfParseStyleBlock(el);
        index.styles.set(keyOf(def.family, name), def);
      }
    }
    const defEls = doc.getElementsByTagNameNS(ODF_STYLE, 'default-style');
    for (let i = 0; i < defEls.length; i++) {
      const el = defEls.item(i) as unknown as Element;
      const fam = odfAttr(el, 'family') || 'paragraph';
      const te = odfChildNS(el, ODF_STYLE, 'text-properties');
      const pe = odfChildNS(el, ODF_STYLE, 'paragraph-properties');
      const rp = odfParseTextProps(te || null);
      if (rp) index.defaults.set(fam, rp);
      const pp = odfParseParagraphProps(pe || null);
      if (pp) index.defaultParas.set(fam, pp);
    }
  }
  return index;
}

// ============================================================
// ODF Component 2 — IMAGE EXTRACTION
// ============================================================

/** ODF manifest parser — maps every Pictures/ file entry by full-path. */
export function parseOdfManifest(
  manifestXml: string,
): Map<string, { mediaType: string; fullPath: string }> {
  const doc = new DOMParser().parseFromString(manifestXml, 'application/xml');
  const map = new Map<string, { mediaType: string; fullPath: string }>();
  const entries = doc.getElementsByTagNameNS(ODF_MANIFEST, 'file-entry');
  for (let i = 0; i < entries.length; i++) {
    const el = entries.item(i) as unknown as Element;
    const fullPath = el.getAttributeNS(ODF_MANIFEST, 'full-path');
    const mediaType = el.getAttributeNS(ODF_MANIFEST, 'media-type');
    if (fullPath && fullPath.startsWith('Pictures/')) {
      map.set(fullPath, { mediaType: mediaType || '', fullPath });
    }
  }
  return map;
}

export interface OdfImageRef {
  href: string;
  widthPt: number;
  heightPt: number;
  isBackground: boolean;
}

/**
 * Scan content.xml for <draw:frame> objects embedding a <draw:image>.
 * One entry per image-bearing frame, keyed by xlink:href.
 *  - svg:width/height (frame) converted to pt.
 *  - text:anchor-type="page" => isBackground:true (decorative wallpaper, dropped).
 */
export function extractImagesFromOdtXml(contentXml: string): OdfImageRef[] {
  const doc = new DOMParser().parseFromString(contentXml, 'application/xml');
  const results: OdfImageRef[] = [];
  const seen = new Set<string>();
  const frames = doc.getElementsByTagNameNS(ODF_DRAW, 'frame');
  for (let i = 0; i < frames.length; i++) {
    const frame = frames.item(i) as unknown as Element;
    const imgs = frame.getElementsByTagNameNS(ODF_DRAW, 'image');
    if (imgs.length === 0) continue;
    const img = imgs.item(0) as unknown as Element;
    const href = img.getAttributeNS(XLINK, 'href');
    if (!href) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    const w = odfParseLenPt(frame.getAttributeNS(ODF_SVG, 'width'));
    const h = odfParseLenPt(frame.getAttributeNS(ODF_SVG, 'height'));
    const anchor = frame.getAttributeNS(ODF_TEXT, 'anchor-type');
    results.push({ href, widthPt: w ?? 0, heightPt: h ?? 0, isBackground: anchor === 'page' });
  }
  return results;
}

/**
 * Build the ODF image map (analog of the docxToIR image-map build): read
 * manifest.xml + content.xml, then pull raw bytes for every image-bearing,
 * NON-background frame from Pictures/.
 *  - rId   := xlink:href (Pictures/...) — ODF analogue of rel rId
 *  - source:= 'odf'
 */
export async function extractOdtImages(zip: JSZip): Promise<Map<string, DocxImage>> {
  const manifestXml = await zip.file('META-INF/manifest.xml')!.async('string');
  const contentXml = await zip.file('content.xml')!.async('string');

  parseOdfManifest(manifestXml);
  const refs = extractImagesFromOdtXml(contentXml);

  const imageMap = new Map<string, DocxImage>();
  for (const ref of refs) {
    if (ref.isBackground) continue;
    const entry = zip.file(ref.href);
    if (!entry) continue;
    const data = await entry.async('uint8array');
    imageMap.set(ref.href, {
      rId: ref.href,
      target: ref.href,
      data,
      widthEMU: Math.round(ref.widthPt * EMU_PER_PT),
      heightEMU: Math.round(ref.heightPt * EMU_PER_PT),
      source: 'odf',
    });
  }
  return imageMap;
}

// ============================================================
// ODF Component 3 — MAIN TRAVERSAL
// ============================================================

function odfAttrNS(el: Element | null, ns: string, local: string): string | null {
  return el ? el.getAttributeNS(ns, local) : null;
}

function odfMakeSpaceRun(style: { fontName: string; fontSize: number; color: string }): IRTextRun {
  return {
    text: ' ',
    fontName: style.fontName,
    fontSize: style.fontSize,
    width: 0, height: 0, position: { x: 0, y: 0 },
    color: style.color, bold: false, italic: false, rotation: 0,
  };
}

function odfStylingOf(last: IRTextRun | undefined): { fontName: string; fontSize: number; color: string } {
  return {
    fontName: last?.fontName || ODF_DEFAULT_FONT,
    fontSize: last?.fontSize || ODF_DEFAULT_SIZE,
    color: last?.color || '000000',
  };
}

function odfToIRTextRun(text: string, rPr: OdfRunProps): IRTextRun {
  return {
    text,
    fontName: rPr.font || ODF_DEFAULT_FONT,
    fontSize: rPr.size || ODF_DEFAULT_SIZE,
    width: 0, height: 0, position: { x: 0, y: 0 },
    color: rPr.color ? rPr.color.replace(/^#/, '') : '000000',
    bold: rPr.bold ?? false,
    italic: rPr.italic ?? false,
    rotation: 0,
  };
}

/**
 * Thread the span-style chain so nested <text:span> formatting (e.g. red bold
 * T18_1 in the level-7 heading) applies to inner text nodes. Mirrors OOXML
 * resolveRunProps — paragraph style at base, span styles innermost-last.
 */
function odfCollectRuns(
  containerEl: Element,
  index: OdfStyleIndex,
  pStyleName: string | undefined,
  spanStyles: string[],
  outRuns: IRTextRun[],
  outImages: IRImageBlock[],
  imageMap: Map<string, DocxImage>,
): void {
  const children = containerEl.childNodes;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.nodeType === 3) {
      const txt = (node as unknown as { data: string }).data || '';
      if (txt.trim()) {
        const resolved = resolveOdfRunContext(index, pStyleName, spanStyles);
        outRuns.push(odfToIRTextRun(txt, resolved.rPr));
      } else if (txt) {
        outRuns.push(odfMakeSpaceRun(odfStylingOf(outRuns[outRuns.length - 1])));
      }
      continue;
    }
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    const local = el.localName;
    if (local === 'span') {
      const spanStyle = el.getAttributeNS(ODF_TEXT, 'style-name') || undefined;
      odfCollectRuns(el, index, pStyleName, spanStyle ? [...spanStyles, spanStyle] : spanStyles, outRuns, outImages, imageMap);
    } else if (local === 's' || local === 'tab' || local === 'line-break') {
      outRuns.push(odfMakeSpaceRun(odfStylingOf(outRuns[outRuns.length - 1])));
    } else if (local === 'a') {
      odfCollectRuns(el, index, pStyleName, spanStyles, outRuns, outImages, imageMap);
    } else if (local === 'frame') {
      // caption <text:p> inside a frame is DROPPED — only <draw:image> is read
      const img = odfFrameToIRImage(el, imageMap);
      if (img) outImages.push(img);
    } else if (local === 'g' && el.namespaceURI === ODF_DRAW) {
      odfCollectRuns(el, index, pStyleName, spanStyles, outRuns, outImages, imageMap);
    }
  }
}

function odfFrameToIRImage(frameEl: Element, imageMap: Map<string, DocxImage>): IRImageBlock | null {
  const imgs = frameEl.getElementsByTagNameNS(ODF_DRAW, 'image');
  if (imgs.length === 0) return null;
  const href = odfAttrNS(imgs[0], XLINK, 'href');
  if (!href) return null;
  if (odfAttrNS(frameEl, ODF_TEXT, 'anchor-type') === 'page') return null; // skip decorative bg
  // imageMap is the single source of truth for dimensions. Fallback to the frame's raw
  // svg:width/height ONLY when the image is not in the map — effectively unreachable
  // (page-anchored backgrounds are already skipped above).
  const img = imageMap.get(href);
  return {
    kind: 'image',
    imageId: href,
    naturalWidth: img ? Math.round(img.widthEMU / EMU_PER_PT) : Math.round(odfParseLenPt(odfAttrNS(frameEl, ODF_SVG, 'width')) ?? 0),
    naturalHeight: img ? Math.round(img.heightEMU / EMU_PER_PT) : Math.round(odfParseLenPt(odfAttrNS(frameEl, ODF_SVG, 'height')) ?? 0),
    bounds: {
      x: 0, y: 0,
      width: img ? Math.round(img.widthEMU / EMU_PER_PT) : 0,
      height: img ? Math.round(img.heightEMU / EMU_PER_PT) : 0,
    },
  };
}

function odfMakeBlockRuns(
  containerEl: Element,
  index: OdfStyleIndex,
  pStyleName: string | undefined,
  imageMap: Map<string, DocxImage>,
): { runs: IRTextRun[]; images: IRImageBlock[] } {
  const runs: IRTextRun[] = [];
  const images: IRImageBlock[] = [];
  odfCollectRuns(containerEl, index, pStyleName, [], runs, images, imageMap);
  return { runs, images };
}

/** Heading level: text:outline-level (element) first, else style's default-outline-level. */
function odfResolveHeadingLevel(hEl: Element, index: OdfStyleIndex): number {
  const direct = odfAttrNS(hEl, ODF_TEXT, 'outline-level');
  if (direct !== null && direct !== '') return parseInt(direct, 10);
  const styleName = odfAttrNS(hEl, ODF_TEXT, 'style-name');
  if (styleName) {
    const seen = new Set();
    let cur = index.styles.get(`paragraph\u0000${styleName}`);
    while (cur) {
      if (cur.defaultOutlineLevel != null) return cur.defaultOutlineLevel;
      if (cur.parent == null || seen.has(cur.parent)) break;
      seen.add(cur.parent);
      cur = index.styles.get(`paragraph\u0000${cur.parent}`);
    }
  }
  return 1;
}

function odfProcessParagraph(
  pEl: Element,
  index: OdfStyleIndex,
  imageMap: Map<string, DocxImage>,
  kind: 'paragraph' | 'heading',
  forcedLevel?: number,
): { block?: IRParagraphBlock | IRHeadingBlock; images: IRImageBlock[] } {
  const pStyleName = odfAttrNS(pEl, ODF_TEXT, 'style-name') || undefined;
  const { runs, images } = odfMakeBlockRuns(pEl, index, pStyleName, imageMap);
  const bounds = { x: 0, y: 0, width: 0, height: 0 };
  let block: IRParagraphBlock | IRHeadingBlock | undefined;
  if (kind === 'heading') {
    block = { kind: 'heading', level: forcedLevel ?? odfResolveHeadingLevel(pEl, index), runs, bounds };
  } else {
    block = { kind: 'paragraph', runs, bounds };
  }
  return { block, images };
}

/** Recursively process a <text:list> at structural depth. */
function odfProcessList(
  listEl: Element,
  index: OdfStyleIndex,
  imageMap: Map<string, DocxImage>,
  depth: number,
  out: IRBlock[],
): void {
  const items = listEl.getElementsByTagNameNS(ODF_TEXT, 'list-item');
  for (let i = 0; i < items.length; i++) {
    const li = items[i] as unknown as Element;
    if (li.parentNode !== listEl) continue; // direct children only
    const liChildren = li.childNodes;
    for (let c = 0; c < liChildren.length; c++) {
      const nc = liChildren[c];
      if (nc.nodeType !== 1) continue;
      const el = nc as Element;
      if (el.localName === 'p' || el.localName === 'h') {
        const kind = el.localName === 'h' ? 'heading' : 'paragraph';
        const forced = el.localName === 'h' ? (parseInt(odfAttrNS(el, ODF_TEXT, 'outline-level') || '', 10) || undefined) : undefined;
        const { block, images } = odfProcessParagraph(el, index, imageMap, kind, forced);
        const bounds = { x: 0, y: 0, width: 0, height: 0 };
        // list-item level ALWAYS = STRUCTURAL nesting depth (never heading outline-level)
        if (block) out.push({ kind: 'list-item', marker: '•', level: depth, runs: block.runs, bounds });
        for (const im of images) out.push(im);
      }
      if (el.localName === 'list') {
        odfProcessList(el, index, imageMap, depth + 1, out);
      }
    }
  }
}

/**
 * ODF tables — spec-only (real file has 0 <table:table>). Column widths from
 * <table:table-column style:column-width> measured in pt.
 */
function odfProcessTable(tblEl: Element, index: OdfStyleIndex, imageMap: Map<string, DocxImage>): IRTableBlock {
  const rows: IRTableCell[][] = [];
  const trEls = tblEl.getElementsByTagNameNS(ODF_TABLE, 'table-row');
  for (let r = 0; r < trEls.length; r++) {
    const tr = trEls[r] as unknown as Element;
    if ((tr.parentNode as Element).localName !== 'table') continue;
    const row: IRTableCell[] = [];
    const tcEls = tr.getElementsByTagNameNS(ODF_TABLE, 'table-cell');
    for (let c = 0; c < tcEls.length; c++) {
      const tc = tcEls[c] as unknown as Element;
      if ((tc.parentNode as Element) !== tr) continue;
      const colspan = parseInt(odfAttrNS(tc, ODF_TABLE, 'number-columns-spanned') || '1', 10) || 1;
      const rowspan = parseInt(odfAttrNS(tc, ODF_TABLE, 'number-rows-spanned') || '1', 10) || 1;
      const cellRuns: IRTextRun[] = [];
      const pEls = tc.getElementsByTagNameNS(ODF_TEXT, 'p');
      for (let p = 0; p < pEls.length; p++) {
        const pEl = pEls[p] as unknown as Element;
        const pStyleName = odfAttrNS(pEl, ODF_TEXT, 'style-name') || undefined;
        cellRuns.push(...odfMakeBlockRuns(pEl, index, pStyleName, imageMap).runs);
      }
      row.push({ runs: cellRuns, colspan, rowspan });
    }
    rows.push(row);
  }
  const colWidths: number[] = [];
  const colEls = tblEl.getElementsByTagNameNS(ODF_TABLE, 'table-column');
  for (let i = 0; i < colEls.length; i++) {
    const col = colEls[i] as unknown as Element;
    if ((col.parentNode as Element) !== tblEl) continue;
    colWidths.push(Math.round(odfParseLenPt(odfAttrNS(col, ODF_STYLE, 'column-width')) ?? 0));
  }
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  return { kind: 'table', cells: rows, bounds: { x: 0, y: 0, width: totalW, height: 0 }, columnWidths: colWidths };
}

function odfTraverseOfficeText(
  root: Element,
  index: OdfStyleIndex,
  imageMap: Map<string, DocxImage>,
  out: IRBlock[],
): void {
  // <text:section> / <draw:g> (block level) = transparent containers -> recurse.
  // Block-level <draw:frame> -> IRImageBlock. Caption text inside frames is dropped.
  const children = root.childNodes;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    const local = el.localName;
    if (local === 'section' || (local === 'g' && el.namespaceURI === ODF_DRAW)) {
      odfTraverseOfficeText(el, index, imageMap, out);
    } else if (local === 'h') {
      const { block, images } = odfProcessParagraph(el, index, imageMap, 'heading');
      if (block) out.push(block);
      out.push(...images);
    } else if (local === 'p') {
      const { block, images } = odfProcessParagraph(el, index, imageMap, 'paragraph');
      if (block && block.runs.length > 0) out.push(block);
      out.push(...images);
    } else if (local === 'list') {
      odfProcessList(el, index, imageMap, 0, out);
    } else if (local === 'table' && el.namespaceURI === ODF_TABLE) {
      out.push(odfProcessTable(el, index, imageMap));
    } else if (local === 'frame' && el.namespaceURI === ODF_DRAW) {
      const img = odfFrameToIRImage(el, imageMap);
      if (img) out.push(img);
    }
  }
}

/** Internal working function — exposes the style index for diagnostics/tests. */
export async function odtToIRInternal(
  zip: JSZip,
): Promise<{ pages: IRPageIR[]; images: Map<string, DocxImage>; index: OdfStyleIndex }> {
  const contentXml = await zip.file('content.xml')!.async('string');
  const stylesXml = await zip.file('styles.xml')?.async('string')
    || '<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"><office:styles/></office:document-styles>';

  const index = parseOdfStyles([stylesXml, contentXml]);
  const imageMap = await extractOdtImages(zip);

  const doc = new DOMParser().parseFromString(contentXml, 'application/xml');
  const bodies = doc.getElementsByTagNameNS(ODF_OFFICE, 'text');
  if (bodies.length === 0) {
    return { pages: [{ width: ODF_A4_W, height: ODF_A4_H, blocks: [] }], images: imageMap, index };
  }
  const officeText = bodies[0] as unknown as Element;

  const blocks: IRBlock[] = [];
  odfTraverseOfficeText(officeText, index, imageMap, blocks);

  return { pages: [{ width: ODF_A4_W, height: ODF_A4_H, blocks }], images: imageMap, index };
}

/**
 * PRODUCTION ODT entry point — contract identical to docxToIR(file: File):
 * returns exactly DocxIRResult { pages, images } with NO extra fields.
 */
export async function odtToIR(file: File): Promise<DocxIRResult> {
  const JSZip = (await import('jszip')).default;
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const { pages, images } = await odtToIRInternal(zip);
  return { pages, images };
}

// ============================================================
// XLSX → IR (Component: xlsxToIR)
// ============================================================
// Contract mirror of docxToIR/odtToIR: xlsxToIR(file: File) -> IRSpreadsheet.
// Reads an OOXML .xlsx package (JSZip) via DOMParser and maps:
//   - sharedStrings.xml  -> string cell values (t="s" -> index)
//   - styles.xml         -> cellXfs -> IRSpreadsheetRunFormat (bold/italic/color/fill)
//   - built-in + custom numFmt -> IRSpreadsheetCellType (date/time/percent/currency)
//   - worksheets/sheetN.xml -> cells (values + A1 refs + types), mergeCells
//     (top-left carries colspan/rowspan; covered slots -> undefined), <cols> widths
//   - workbook.xml + rels -> sheet order + names, workbookPr date1904 -> dateEpoch
// Known limitation (per approved design): border + alignment are NOT mapped.
// conditionalFormatting is READ and stored verbatim on IRSheet (conditionalFormattingRules)
// but NOT evaluated here (rule evaluation + dxf color resolution -> pending: Component 2b).

const XLSX_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

function xlsxGetAttr(el: Element, local: string): string | null {
  return el.getAttribute(local);
}

function xlsxRefToRC(ref: string): { row: number; col: number } {
  let col = 0;
  let i = 0;
  for (; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    if (c >= 65 && c <= 90) col = col * 26 + (c - 64);
    else if (c >= 97 && c <= 122) col = col * 26 + (c - 96);
    else break;
  }
  const row = parseInt(ref.slice(i), 10);
  return { row: (isNaN(row) ? 1 : row) - 1, col: col - 1 };
}

// Convert a theme color index to a concrete RGB hex using the theme Dk1/Lt1..accent6.
function xlsxThemeColor(clrScheme: Element | null, themeIdx: number, tint: number): string {
  const hex = xlsxResolveThemeHex(clrScheme, themeIdx);
  if (hex && Math.abs(tint) > 1e-9) return xlsxApplyTint(hex, tint);
  return hex;
}

function xlsxResolveThemeHex(clrScheme: Element | null, themeIdx: number): string {
  const T = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  if (!clrScheme) return '';
  const tags = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
  const tag = tags[themeIdx];
  if (!tag) return '';
  const els = clrScheme.getElementsByTagNameNS(T, tag);
  if (els.length === 0) return '';
  const srgb = els[0].getElementsByTagNameNS(T, 'srgbClr');
  if (srgb.length > 0) return (xlsxGetAttr(srgb[0] as Element, 'val') || '').toUpperCase();
  return '';
}

function xlsxApplyTint(hex: string, tint: number): string {
  const H = 255, L = 0;
  const lum = tint < 0 ? L * (1 + tint) : H * (1 - tint);
  const r = Math.round(parseInt(hex.slice(0, 2), 16) * lum / 255);
  const g = Math.round(parseInt(hex.slice(2, 4), 16) * lum / 255);
  const b = Math.round(parseInt(hex.slice(4, 6), 16) * lum / 255);
  return [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

interface XlsxStyle {
  numFmtId: number;
  formatCode?: string;
  bold?: boolean;
  italic?: boolean;
  colorHex?: string;
  fillHex?: string;
}

function xlsxIsDateLike(style: XlsxStyle | undefined): boolean {
  if (!style) return false;
  const id = style.numFmtId;
  if (id === 14 || id === 15 || id === 16 || id === 17 || id === 22
    || (id >= 27 && id <= 36) || (id >= 50 && id <= 58)) return true;
  if (style.formatCode && /d|m|y|h|s/i.test(style.formatCode)) return true;
  return false;
}

function xlsxIsTimeOnly(style: XlsxStyle | undefined): boolean {
  if (!style) return false;
  return style.numFmtId === 18 || style.numFmtId === 19 || style.numFmtId === 20
    || style.numFmtId === 21 || style.numFmtId === 45 || style.numFmtId === 46;
}

function xlsxIsPercent(style: XlsxStyle | undefined): boolean {
  if (!style) return false;
  return style.numFmtId === 9 || style.numFmtId === 10
    || (!!style.formatCode && /%/.test(style.formatCode));
}

// Serial date formatter. dateEpoch '1900' handles the Excel 1900 leap-year quirk.
// Convert an XLSX serial date to a human-readable string.
// Invariants (industry standard, matches Excel/lotus 1900 & 1904 systems):
//   1900 system: serial 25569 == 1970-01-01   -> epoch = 1899-12-30
//   1904 system: serial 0     == 1904-01-01
// The 1900 leap-year bug (fake 1900-02-29, serial 60) is absorbed by the epoch
// offset and needs NO explicit correction.
function xlsxFormatSerialDate(serial: number, timeOnly: boolean, epoch: '1900' | '1904'): string {
  const whole = Math.floor(serial);
  const frac = serial - whole;
  const milliseconds = Math.round(frac * 86400 * 1000);

  const baseMs = epoch === '1904'
    ? Date.UTC(1904, 0, 1)
    : Date.UTC(1899, 11, 30);
  const d = new Date(baseMs + whole * 86400000 + milliseconds);

  if (timeOnly) {
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const s = d.getUTCSeconds();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${s ? ':' + String(s).padStart(2, '0') : ''}`;
  }
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCFullYear()).slice(2)}`;
}

export async function xlsxToIR(file: File): Promise<IRSpreadsheet> {
  const JSZip = (await import('jszip')).default;
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const sharedStrings: string[] = [];
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  if (sharedXml) {
    const doc = new DOMParser().parseFromString(sharedXml, 'application/xml');
    const siEls = doc.getElementsByTagNameNS(XLSX_NS, 'si');
    for (let i = 0; i < siEls.length; i++) {
      const si = siEls[i] as Element;
      const ts = si.getElementsByTagNameNS(XLSX_NS, 't');
      let text = '';
      for (let j = 0; j < ts.length; j++) text += ts[j].textContent || '';
      sharedStrings.push(text);
    }
  }

  const stylesXml = await zip.file('xl/styles.xml')?.async('string')
    || '<styleSheet xmlns="' + XLSX_NS + '"/>';
  const styleDoc = new DOMParser().parseFromString(stylesXml, 'application/xml');
  const xfs: XlsxStyle[] = [];
  const cellXfsEl = styleDoc.getElementsByTagNameNS(XLSX_NS, 'cellXfs');
  const fonts = styleDoc.getElementsByTagNameNS(XLSX_NS, 'font');
  const fills = styleDoc.getElementsByTagNameNS(XLSX_NS, 'fill');
  const numFmtEls = styleDoc.getElementsByTagNameNS(XLSX_NS, 'numFmt');
  const customFormats = new Map<number, string>();
  for (let i = 0; i < numFmtEls.length; i++) {
    const nf = numFmtEls[i] as Element;
    const id = parseInt(xlsxGetAttr(nf, 'numFmtId') || '0', 10);
    customFormats.set(id, xlsxGetAttr(nf, 'formatCode') || '');
  }
  const clrScheme = styleDoc.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'clrScheme');
  const themeEl = clrScheme.length ? clrScheme[0] as Element : null;
  if (cellXfsEl.length > 0) {
    const xfEls = cellXfsEl[0].getElementsByTagNameNS(XLSX_NS, 'xf');
    for (let i = 0; i < xfEls.length; i++) {
      const xf = xfEls[i] as Element;
      const numFmtId = parseInt(xlsxGetAttr(xf, 'numFmtId') || '0', 10);
      let bold: boolean | undefined;
      let italic: boolean | undefined;
      let colorHex: string | undefined;
      let fillHex: string | undefined;
      const fontId = parseInt(xlsxGetAttr(xf, 'fontId') || '0', 10);
      const font = fonts[fontId] as Element | undefined;
      if (font) {
        if (font.getElementsByTagNameNS(XLSX_NS, 'b').length > 0) bold = true;
        if (font.getElementsByTagNameNS(XLSX_NS, 'i').length > 0) italic = true;
        const color = font.getElementsByTagNameNS(XLSX_NS, 'color');
        if (color.length > 0) {
          const c = color[0] as Element;
          const rgb = xlsxGetAttr(c, 'rgb');
          if (rgb) colorHex = rgb.slice(-6).toUpperCase();
          else {
            const th = xlsxGetAttr(c, 'theme');
            if (th !== null) {
              colorHex = xlsxThemeColor(themeEl, parseInt(th, 10), parseFloat(xlsxGetAttr(c, 'tint') || '0'));
            }
          }
        }
      }
      const fillId = parseInt(xlsxGetAttr(xf, 'fillId') || '0', 10);
      const fill = fills[fillId] as Element | undefined;
      if (fill) {
        const pf = fill.getElementsByTagNameNS(XLSX_NS, 'patternFill');
        if (pf.length > 0) {
          const fg = pf[0].getElementsByTagNameNS(XLSX_NS, 'fgColor');
          if (fg.length > 0) {
            const c = fg[0] as Element;
            const rgb = xlsxGetAttr(c, 'rgb');
            if (rgb) fillHex = rgb.slice(-6).toUpperCase();
            else {
              const th = xlsxGetAttr(c, 'theme');
              if (th !== null) {
                fillHex = xlsxThemeColor(themeEl, parseInt(th, 10), parseFloat(xlsxGetAttr(c, 'tint') || '0'));
              }
            }
          }
        }
      }
      xfs.push({ numFmtId, formatCode: customFormats.get(numFmtId), bold, italic, colorHex, fillHex });
    }
  }

  const workbookXml = await zip.file('xl/workbook.xml')?.async('string') || '';
  const workbookDoc = new DOMParser().parseFromString(workbookXml, 'application/xml');
  const workbookPr = workbookDoc.getElementsByTagNameNS(XLSX_NS, 'workbookPr');
  const date1904 = workbookPr.length > 0 && xlsxGetAttr(workbookPr[0] as Element, 'date1904') === 'true';
  const epoch: '1900' | '1904' = date1904 ? '1904' : '1900';

  // Map sheet order+name to rel target via workbook.xml.rels.
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string') || '';
  const relDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
  const relMap = new Map<string, string>();
  const relEls = relDoc.getElementsByTagNameNS('http://schemas.openxmlformats.org/package/2006/relationships', 'Relationship');
  for (let i = 0; i < relEls.length; i++) {
    const r = relEls[i] as Element;
    const id = r.getAttribute('Id');
    const target = r.getAttribute('Target');
    if (id && target) relMap.set(id, target.replace(/^\/+/, ''));
  }

  const sheets: IRSheet[] = [];
  const sheetEls = workbookDoc.getElementsByTagNameNS(XLSX_NS, 'sheet');
  for (let i = 0; i < sheetEls.length; i++) {
    const sheetEl = sheetEls[i] as Element;
    const name = xlsxGetAttr(sheetEl, 'name') || `Sheet${i + 1}`;
    const rid = sheetEl.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
      || sheetEl.getAttribute('r:id');
    const target = relMap.get(rid || '');
    if (!target) continue;
    const sheetXml = await zip.file(target.startsWith('xl/') ? target : `xl/${target}`)?.async('string') || '';
    const sDoc = new DOMParser().parseFromString(sheetXml, 'application/xml');

    // Frozen panes from <sheetView><pane state="frozen"> (OOXML §18.3.1.73 pane):
    // when state="frozen", xSplit/ySplit are plain column/row counts of the
    // left/top pane. Stored as optional IRSheet.frozenCols/frozenRows; absent
    // when the sheet has no frozen pane (renderer falls back to 1 row/0 cols).
    let frozenRows: number | undefined;
    let frozenCols: number | undefined;
    const sheetViewEls = sDoc.getElementsByTagNameNS(XLSX_NS, 'sheetView');
    for (let v = 0; v < sheetViewEls.length; v++) {
      const paneEls = (sheetViewEls[v] as Element).getElementsByTagNameNS(XLSX_NS, 'pane');
      if (paneEls.length === 0) continue;
      const pane = paneEls[0] as Element;
      if (xlsxGetAttr(pane, 'state') !== 'frozen') continue;
      const xs = parseInt(xlsxGetAttr(pane, 'xSplit') || '0', 10);
      const ys = parseInt(xlsxGetAttr(pane, 'ySplit') || '0', 10);
      frozenCols = isNaN(xs) ? 0 : Math.max(0, xs);
      frozenRows = isNaN(ys) ? 0 : Math.max(0, ys);
      break;
    }

    // columnWidths from <cols> (character-width units like XLSX width attrs).
    const columnWidths: number[] = [];
    const colsEl = sDoc.getElementsByTagNameNS(XLSX_NS, 'col');
    for (let c = 0; c < colsEl.length; c++) {
      const colEl = colsEl[c] as Element;
      const min = parseInt(xlsxGetAttr(colEl, 'min') || '0', 10);
      const max = parseInt(xlsxGetAttr(colEl, 'max') || '0', 10);
      const width = parseFloat(xlsxGetAttr(colEl, 'width') || '0');
      for (let cc = min; cc <= max; cc++) columnWidths[cc - 1] = width;
    }

    const mergedRanges: IRSheetMergedRange[] = [];
    const mergeEls = sDoc.getElementsByTagNameNS(XLSX_NS, 'mergeCell');
    for (let m = 0; m < mergeEls.length; m++) {
      const ref = xlsxGetAttr(mergeEls[m] as Element, 'ref') || '';
      const colon = ref.indexOf(':');
      const top = xlsxRefToRC(colon >= 0 ? ref.slice(0, colon) : ref);
      const bottom = xlsxRefToRC(colon >= 0 ? ref.slice(colon + 1) : ref);
      mergedRanges.push({
        row: top.row,
        col: top.col,
        rowspan: bottom.row - top.row + 1,
        colspan: bottom.col - top.col + 1,
      });
    }

    // Build a coverage map: (row,col) -> merged top-left index for spanned slots.
    const mergedTopLeftByCell = new Map<string, number>();
    for (let m = 0; m < mergedRanges.length; m++) {
      const rg = mergedRanges[m];
      for (let r = 0; r < rg.rowspan; r++) {
        for (let c = 0; c < rg.colspan; c++) {
          mergedTopLeftByCell.set(`${rg.row + r},${rg.col + c}`, m);
        }
      }
    }

    // Collect conditionalFormatting rules verbatim (stored, NOT evaluated).
    const conditionalFormattingRules: IRConditionalFormattingRule[] = [];
    const cfEls = sDoc.getElementsByTagNameNS(XLSX_NS, 'conditionalFormatting');
    for (let cf = 0; cf < cfEls.length; cf++) {
      const cfEl = cfEls[cf] as Element;
      const sqref = xlsxGetAttr(cfEl, 'sqref') || '';
      const rules = cfEl.getElementsByTagNameNS(XLSX_NS, 'cfRule');
      for (let rl = 0; rl < rules.length; rl++) {
        const rlEl = rules[rl] as Element;
        const type = xlsxGetAttr(rlEl, 'type') || '';
        const operator = xlsxGetAttr(rlEl, 'operator') || undefined;
        const dxfIdStr = xlsxGetAttr(rlEl, 'dxfId') || '';
        const formulaEls = rlEl.getElementsByTagNameNS(XLSX_NS, 'formula');
        const formula: string[] = [];
        for (let f = 0; f < formulaEls.length; f++) formula.push((formulaEls[f] as Element).textContent || '');
        conditionalFormattingRules.push({
          sqref,
          type,
          operator,
          formula: formula.length > 0 ? formula : undefined,
          dxfId: dxfIdStr !== '' ? parseInt(dxfIdStr, 10) : undefined,
        });
      }
    }

    const cells: (IRSpreadsheetCell | undefined)[][] = [];
    const gridRows: Element[] = [];
    const sheetData = sDoc.getElementsByTagNameNS(XLSX_NS, 'sheetData');
    if (sheetData.length > 0) {
      const rowEls = sheetData[0].getElementsByTagNameNS(XLSX_NS, 'row');
      for (let r = 0; r < rowEls.length; r++) gridRows.push(rowEls[r] as Element);
    }

    const rawCells = new Map<string, IRSpreadsheetCell>();
    for (let r = 0; r < gridRows.length; r++) {
      const rowEl = gridRows[r];
      const cellEls = rowEl.getElementsByTagNameNS(XLSX_NS, 'c');
      for (let c = 0; c < cellEls.length; c++) {
        const cellEl = cellEls[c] as Element;
        const ref = xlsxGetAttr(cellEl, 'r') || '';
        const { row, col } = xlsxRefToRC(ref);
        const styleIdx = parseInt(xlsxGetAttr(cellEl, 's') || '0', 10);
        const style = xfs[styleIdx];
        const t = xlsxGetAttr(cellEl, 't') || 'n';
        let type: IRSpreadsheetCellType = 'empty';
        let raw: string | number | boolean | null = null;
        let display = '';
        let formula: string | undefined;

        const formulaEl = cellEl.getElementsByTagNameNS(XLSX_NS, 'f');
        if (formulaEl.length > 0) {
          formula = formulaEl[0].textContent || '';
          type = 'formula';
        }

        const vEl = cellEl.getElementsByTagNameNS(XLSX_NS, 'v');
        const v = vEl.length > 0 ? vEl[0].textContent || '' : '';

        if (t === 's') {
          const idx = parseInt(v, 10);
          raw = sharedStrings[idx] ?? '';
          display = raw;
          type = 'string';
        } else if (t === 'str') {
          raw = v;
          display = v;
          type = 'formula';
        } else if (t === 'b') {
          raw = v === '1' || v === 'true';
          display = raw ? 'TRUE' : 'FALSE';
          type = 'boolean';
        } else if (t === 'e') {
          raw = v || '#VALUE!';
          display = raw;
          type = 'error';
        } else if (t === 'inlineStr') {
          const isEl = cellEl.getElementsByTagNameNS(XLSX_NS, 'is');
          let text = '';
          if (isEl.length > 0) {
            const ts = isEl[0].getElementsByTagNameNS(XLSX_NS, 't');
            for (let k = 0; k < ts.length; k++) text += ts[k].textContent || '';
          }
          raw = text;
          display = text;
          type = 'string';
        } else {
          // numeric
          const num = parseFloat(v);
          if (isNaN(num)) {
            if (v === '') {
              type = 'empty';
              raw = null;
              display = '';
            } else {
              raw = v;
              display = v;
              type = 'number';
            }
          } else {
            if (formula) {
              raw = num;
              display = v;
              type = 'formula';
            } else if (xlsxIsTimeOnly(style)) {
              raw = num;
              display = xlsxFormatSerialDate(num, true, epoch);
              type = 'time';
              if (epoch === '1904') raw = v;
            } else if (xlsxIsDateLike(style)) {
              raw = num;
              display = xlsxFormatSerialDate(num, false, epoch);
              type = 'date';
            } else if (xlsxIsPercent(style)) {
              raw = num;
              display = `${(num * 100).toLocaleString('en-US')}%`;
              type = 'number';
            } else {
              raw = num;
              display = v;
              type = 'number';
            }
          }
        }

        const fmt: IRSpreadsheetRunFormat | undefined = style &&
          (style.bold !== undefined || style.italic !== undefined || style.colorHex || style.fillHex)
          ? {
            bold: style.bold,
            italic: style.italic,
            colorHex: style.colorHex,
            fillHex: style.fillHex,
          }
          : undefined;

        rawCells.set(`${row},${col}`, {
          display,
          type,
          raw,
          dateEpoch: type === 'date' ? epoch : undefined,
          formula,
          fmt,
          colspan: 1,
          rowspan: 1,
        });
      }
    }

    // Assemble grid with merged slots -> undefined (only top-left carries the cell).
    let maxCol = -1;
    for (const key of rawCells.keys()) {
      const comma = key.indexOf(',');
      const col = parseInt(key.slice(comma + 1), 10);
      if (col > maxCol) maxCol = col;
    }
    for (const rg of mergedRanges) {
      if (rg.col + rg.colspan - 1 > maxCol) maxCol = rg.col + rg.colspan - 1;
    }

    const rowsCount = gridRows.length > 0
      ? parseInt(xlsxGetAttr(gridRows[gridRows.length - 1], 'r') || '0', 10)
      : (gridRows.length || 1);

    for (let r = 0; r < rowsCount; r++) {
      const rowArr: (IRSpreadsheetCell | undefined)[] = new Array(maxCol + 1).fill(undefined);
      for (let c = 0; c <= maxCol; c++) {
        const key = `${r},${c}`;
        const merged = mergedTopLeftByCell.get(key);
        const own = rawCells.get(key);
        if (merged !== undefined) {
          const rg = mergedRanges[merged];
          // Install the top-left cell (with spans) only at the anchor.
          if (r === rg.row && c === rg.col) {
            const base = rawCells.get(key);
            if (base) {
              rowArr[c] = {
                ...base,
                colspan: rg.colspan,
                rowspan: rg.rowspan,
              };
            }
          }
          // covered slots stay undefined
        } else if (own) {
          rowArr[c] = own;
        }
      }
      cells.push(rowArr);
    }

    sheets.push({
      kind: 'sheet',
      name,
      cells,
      columnWidths,
      mergedRanges,
      conditionalFormattingRules,
      ...(frozenRows !== undefined ? { frozenRows } : {}),
      ...(frozenCols !== undefined ? { frozenCols } : {}),
    });
    if (conditionalFormattingRules.length > 0) {
      // Diagnostic evidence: full raw list is surfaced via console for manual cross-verification.
      console.log('[xlsxToIR:conditionalFormatting]', name, JSON.stringify(conditionalFormattingRules));
    }
  }

  return { kind: 'spreadsheet', sheets };
}

// ============================================================
// IR → XLSX WRITER (Component: renderIRSpreadsheetToXlsx)
// ============================================================
// Inverse of xlsxToIR: reassembles an IRSpreadsheet (which for pdf-to-excel
// came from renderIRSpreadsheetToXlsx's input via pdfToIRSpreadsheet) back
// into a real .xlsx Blob using exceljs.

/** 0-based column index → Excel column letters (0→A, 25→Z, 26→AA). */
function xlsxColName(col: number): string {
  let n = col + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** IRSheetMergedRange (0-indexed spans) → Excel merge ref "A1:C3". */
function xlsxMergeRefFromRange(rg: IRSheetMergedRange): string {
  const topLeft = `${xlsxColName(rg.col)}${rg.row + 1}`;
  const bottomRight = `${xlsxColName(rg.col + rg.colspan - 1)}${rg.row + rg.rowspan}`;
  return `${topLeft}:${bottomRight}`;
}

/**
 * Value-assignment rule for inferred cells. `inferred:true` means the type was
 * GUESSED from display text, not ground truth — so we only write a native
 * Excel numeric when that guess is lossless (the display string reproduces the
 * numeric raw exactly). E.g. a synthetic cell `"999.99"`→999.99 is lossless and
 * becomes a real number (illustrative only — the real EPZ_SIERPIEN grid has no
 * such lossless decimal in the visible range); `"07.00"`→7 is LOSSY (leading zeros / "00" formatting dropped), so it
 * stays a string, preserving the exact user-visible text and matching the
 * original file (which stored "07.00" as a string). Dates/times carry only a
 * display string (no serial), so they stay strings too. Everything else writes
 * its display text verbatim.
 */
export function xlsxWriteValue(cell: IRSpreadsheetCell):
  { value: string | number | boolean; native: boolean } {
  if (cell.type === 'number' && typeof cell.raw === 'number' && isFinite(cell.raw)
    && cell.display === String(cell.raw)) {
    return { value: cell.raw, native: true };
  }
  return { value: cell.display, native: false };
}

/**
 * renderIRSpreadsheetToXlsx(ir) → Blob (MIME application/vnd.openxmlformats-officedocument.spreadsheetml.sheet).
 * Mirrors xlsxToIR so pdf-to-excel output can be written back to a real workbook:
 *   - mergedRanges → worksheet.mergeCells("A1:C3") via xlsxMergeRefFromRange
 *   - columnWidths (already in Excel char-width units) → worksheet.columns[i].width (1:1)
 *   - inferred cells → xlsxWriteValue (native number only when lossless)
 *   - fmt.bold/italic are honored (cell.font) even though pdf sources currently
 *     yield bold=false everywhere (see AGENTS FINDING) — kept for forward compat.
 *   - conditionalFormattingRules are NOT re-emitted (storage-only in IR).
 */
export async function renderIRSpreadsheetToXlsx(ir: IRSpreadsheet): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OptimaPDF';
  wb.created = new Date();
  wb.modified = new Date();

  for (const sheet of ir.sheets) {
    let ws = wb.getWorksheet(sheet.name);
    if (!ws) ws = wb.addWorksheet(sheet.name);

    const nCols = sheet.cells[0]?.length ?? 0;
    const rows = sheet.cells.length;

    // Column widths: already in Excel char-width units → set 1:1.
    for (let c = 0; c < nCols; c++) {
      const chars = sheet.columnWidths[c];
      if (chars !== undefined && chars > 0) ws.getColumn(c + 1).width = chars;
    }

    for (let r = 0; r < rows; r++) {
      const rowCells = sheet.cells[r];
      if (!rowCells) continue;
      for (let c = 0; c < rowCells.length; c++) {
        const cell = rowCells[c];
        if (!cell) continue;
        const ex = ws.getCell(r + 1, c + 1);
        const { value } = xlsxWriteValue(cell);
        ex.value = value;
        if (cell.fmt && (cell.fmt.bold !== undefined || cell.fmt.italic !== undefined
          || cell.fmt.colorHex || cell.fmt.fillHex)) {
          ex.font = {
            bold: cell.fmt.bold,
            italic: cell.fmt.italic,
            color: cell.fmt.colorHex ? { argb: 'FF' + cell.fmt.colorHex } : undefined,
          };
        }
      }
    }

    // Emit merged ranges. exceljs discards values written into covered (non-anchor)
    // cells, so a merged range must NEVER swallow valued cells whose anchor is blank:
    // a blank-anchor merge that covers a valued cell is necessarily a pdfIR false
    // merge (cs2 artifact — real cells are never anchored on nothing). Suppressing
    // those false merges preserves the covered data (e.g. Arkusz3 I3, the SUM result
    // "0", which GT keeps as a standalone cell). Blank-anchor merges that cover only
    // empty cells are still emitted (harmless structural spans, e.g. header band).
    for (const rg of sheet.mergedRanges) {
      const anchorBlank = !sheet.cells[rg.row]?.[rg.col]
        || sheet.cells[rg.row]![rg.col]!.display === '';
      let coversValued = false;
      if (anchorBlank) {
        for (let dr = 0; dr < rg.rowspan && !coversValued; dr++) {
          for (let dc = 0; dc < rg.colspan && !coversValued; dc++) {
            if (dr === 0 && dc === 0) continue;
            const covered = sheet.cells[rg.row + dr]?.[rg.col + dc];
            if (covered && covered.display !== '') { coversValued = true; break; }
          }
        }
      }
      if (anchorBlank && coversValued) continue; // false merge → don't swallow data
      ws.mergeCells(xlsxMergeRefFromRange(rg));
    }

    ws.getRow(1).commit();
  }

  const ab = await wb.xlsx.writeBuffer();
  return new Blob([ab], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ============================================================
// IR → PDF RENDERER (XLSX) — GEOMETRY & PAGINATION (pure, no PDF)
// Component 2, subcomponent 1 (approved design, steps 1-3). These
// functions are side-effect-free: geometry + pagination run without
// any PDFDocument/PDFPage, so they can be unit-tested on numbers alone.
// Text width measurement is injected (`measure`); the renderer later
// wraps pdf-lib embedded fonts, tests wrap a LiberationSans PDFFont.
// ============================================================

// XLSX <col width> is expressed in Excel character-width units (e.g. 8.43).
// SheetJS approximation: px ≈ chars*7+5, then px→pt at 96dpi (×0.75).
// Excel default (8.43 chars) → (8.43*7+5)*0.75 = 48.0075pt.
// NOTE: the 48.0075 figure is derived, never a handwritten magic number.
export function xlsxCharWidthToPt(chars: number): number {
  return (chars * 7 + 5) * 0.75;
}

/** Inverse of xlsxCharWidthToPt: pt → Excel character-width units (chars). */
export function ptToXlsxCharWidth(pt: number): number {
  return (pt / 0.75 - 5) / 7;
}

export const XLSX_DEFAULT_COL_CHARS = 8.43;
export const XLSX_DEFAULT_COL_PT = xlsxCharWidthToPt(XLSX_DEFAULT_COL_CHARS); // 48.0075

export interface SpreadsheetCellMeasure {
  (text: string, fontSize: number, bold: boolean, italic: boolean): number;
}

// Conservative monospace-ish fallback (approx 0.55em/char) so geometry is
// computable without fonts; callers embedding real fonts MUST inject a
// precise measure to keep pagination identical to the PDF output.
const spreadsheetAvgMeasure: SpreadsheetCellMeasure = (text, fontSize) => text.length * fontSize * 0.55;

// Per-column width in pt. Missing/0 entries in sheet.columnWidths fall back
// to the Excel default width (8.43 chars → XLSX_DEFAULT_COL_PT).
export function spreadsheetColWidthsPt(sheet: IRSheet): number[] {
  const nCols = sheet.cells[0]?.length ?? 0;
  const out: number[] = new Array(nCols);
  for (let c = 0; c < nCols; c++) {
    const chars = sheet.columnWidths[c];
    out[c] = chars !== undefined && chars > 0 ? xlsxCharWidthToPt(chars) : XLSX_DEFAULT_COL_PT;
  }
  return out;
}

// Number of wrapped lines a cell text takes at maxWidthPt. Mirrors the
// word-splitting of breakIntoLines (split on /(?<=\s)/ so trailing spaces
// stay glued to their word). Empty text = 1 line (min-height cell).
export function spreadsheetWrapLines(
  text: string,
  maxWidthPt: number,
  fontSize: number,
  measure: SpreadsheetCellMeasure = spreadsheetAvgMeasure,
): number {
  if (maxWidthPt <= 0 || text === '') return 1;
  let lines = 1;
  let w = 0;
  for (const word of text.split(/(?<=\s)/)) {
    if (!word) continue;
    const wordW = measure(word, fontSize, false, false);
    if (w > 0 && w + wordW > maxWidthPt) { lines++; w = 0; }
    w += wordW;
  }
  return lines;
}

export interface SpreadsheetRowHeightsOpts {
  fontSize?: number;   // default 10
  lineH?: number;      // default 11
  pad?: number;        // default 3
  measure?: SpreadsheetCellMeasure;
}

// Row heights in pt, mirroring renderTable()'s two-pass semantics:
//  - base: max(cellHeight) of non-rowspan cells in the row,
//  - rowspan: grow the LAST row of the range to fit the spanning cell.
// cellHeight = wrapLines(display, colspanWidth - 2*pad) * lineH + 2*pad.
export function spreadsheetRowHeightsPt(
  sheet: IRSheet,
  colWidthsPt: number[],
  opts: SpreadsheetRowHeightsOpts = {},
): number[] {
  const fontSize = opts.fontSize ?? 10;
  const lineH = opts.lineH ?? 11;
  const pad = opts.pad ?? 3;
  const measure = opts.measure ?? spreadsheetAvgMeasure;
  const minH = lineH + pad * 2;
  const nRows = sheet.cells.length;

  const cellHeight = (row: number, col: number, cell: IRSpreadsheetCell): number => {
    const cs = Math.max(cell.colspan || 1, 1);
    const inner = colWidthsPt.slice(col, col + cs).reduce((a, b) => a + b, 0) - pad * 2;
    if (inner <= 0) return minH;
    return Math.max(spreadsheetWrapLines(cell.display, inner, fontSize, measure) * lineH + pad * 2, minH);
  };

  const baseH: number[] = new Array(nRows).fill(minH);
  const rowspanNeeds: Array<{ r: number; spanEnd: number; h: number }> = [];

  for (let r = 0; r < nRows; r++) {
    const row = sheet.cells[r];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (!cell) continue;
      const rs = Math.max(cell.rowspan || 1, 1);
      const h = cellHeight(r, c, cell);
      if (rs <= 1) baseH[r] = Math.max(baseH[r], h);
      else rowspanNeeds.push({ r, spanEnd: Math.min(r + rs - 1, nRows - 1), h });
    }
  }
  for (const { r, spanEnd, h } of rowspanNeeds) {
    let occupied = 0;
    for (let rr = r; rr <= spanEnd; rr++) occupied += baseH[rr];
    if (h > occupied) baseH[spanEnd] += h - occupied;
  }
  return baseH;
}

export interface SpreadsheetColFragment {
  /** Body columns [start, end); header cols [0,frozenCols) are always prepended. */
  start: number;
  end: number;
}

// Horizontal pagination (greedy). Invariant: every fragment = frozen header
// cols [0,G) + a CONTIGUOUS run of body columns containing ≥1 column.
// Break rule: a body column opens a new fragment when it no longer fits the
// remaining band width (availableW − headerColsWidth). A single column wider
// than the whole band is never split — it becomes a fragment on its own
// (drawn clipped), mirroring renderTable's sure-fit guarantee.
export function spreadsheetColFragments(
  sheet: IRSheet,
  colWidthsPt: number[],
  availableW: number,
  frozenCols: number,
): SpreadsheetColFragment[] {
  const nCols = colWidthsPt.length;
  const G = frozenCols === undefined ? 0 : Math.min(Math.max(frozenCols, 0), nCols);
  if (nCols === 0) return [];
  const headerW = colWidthsPt.slice(0, G).reduce((a, b) => a + b, 0);
  const budget = availableW - headerW;

  const fragments: SpreadsheetColFragment[] = [];
  let runStart = G;
  let runWidth = 0;
  for (let c = G; c < nCols; c++) {
    const cw = colWidthsPt[c];
    if (runWidth > 0 && runWidth + cw > budget) {
      fragments.push({ start: runStart, end: c });
      runStart = c;
      runWidth = 0;
    }
    runWidth += cw;
  }
  fragments.push({ start: runStart, end: nCols });
  return fragments;
}

export interface SpreadsheetRowChunk {
  /** Body rows [start, end); header rows [0,H) are always prepended. */
  start: number;
  end: number;
}

// Vertical pagination (greedy), same invariant as columns: chunks are
// contiguous body-row runs, header rows [0,H) prepended verbatim per page.
// A single row taller than the available height is never split.
export function spreadsheetRowChunks(
  sheet: IRSheet,
  rowHeightsPt: number[],
  availableH: number,
  frozenRows: number,
): SpreadsheetRowChunk[] {
  const nRows = rowHeightsPt.length;
  const H = frozenRows === undefined ? 1 : Math.min(Math.max(frozenRows, 0), nRows);
  if (nRows === 0) return [];

  const chunks: SpreadsheetRowChunk[] = [];
  let runStart = H;
  let runH = 0;
  for (let r = H; r < nRows; r++) {
    const rh = rowHeightsPt[r];
    if (runH > 0 && runH + rh > availableH) {
      chunks.push({ start: runStart, end: r });
      runStart = r;
      runH = 0;
    }
    runH += rh;
  }
  chunks.push({ start: runStart, end: nRows });
  return chunks;
}

// ============================================================
// IR → PDF RENDERER (XLSX) — CELL DRAWING (Krok 4a)
// Pure helpers + one drawing primitive. Drawing function uses
// pdf-lib types; pure helpers are testable without PDF.
// ============================================================

// ONE source of truth for column X positions INSIDE a fragment.
// Returns, for every grid column c in [frag.start, frag.end), the
// horizontal offset x (pt) from the LEFT EDGE OF THE FRAGMENT (0 =
// fragment's left edge), and the column's width w. Callers only add
// the page MARGIN (and later any frozen-col offset) ONCE, at draw
// time. Because both the header loop and every body-data row consume
// THIS same list, c→x can never diverge between header and cells.
// Pure: no pdf-lib, no side effects. (See approved Component 2 design:
// "one place computing x per fragment, shared by header + data".)
export function spreadsheetFragmentColsX(
  colWidthsPt: number[],
  frag: SpreadsheetColFragment,
): Array<{ c: number; x: number; w: number }> {
  const out: Array<{ c: number; x: number; w: number }> = [];
  let x = 0;
  for (let c = frag.start; c < frag.end; c++) {
    const w = colWidthsPt[c] ?? 0;
    out.push({ c, x, w });
    x += w;
  }
  return out;
}

// Cell alignment: strings/blank → left; numeric types → right.
// Mirrors renderTable's alignment rule (line ~1232).
export function spreadsheetCellAlign(cell: IRSpreadsheetCell): 'left' | 'right' {
  if (cell.type === 'string' || cell.type === 'empty' || cell.display === '') return 'left';
  return 'right';
}

// Wrap text into lines (array of strings). Same word-splitting as
// spreadsheetWrapLines but returns the actual lines, not just the count.
// Uses trailing-space-preserving split /(?<=\s)/ so words keep their spaces.
export function spreadsheetWrapText(
  text: string,
  maxWidthPt: number,
  fontSize: number,
  measure: SpreadsheetCellMeasure,
): string[] {
  if (text === '' || maxWidthPt <= 0) return [text || ''];
  const words = text.split(/(?<=\s)/);
  const lines: string[] = [];
  let cur = '';
  let curW = 0;
  for (const w of words) {
    if (!w) continue;
    const ww = measure(w, fontSize, false, false);
    if (curW > 0 && curW + ww > maxWidthPt) { lines.push(cur); cur = w; curW = ww; }
    else { cur += w; curW += ww; }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 ? lines : [''];
}

// Clip a cell's grid rectangle to a visible band (fragment columns or
// chunk rows). Returns the visible sub-rectangle and whether anything
// is visible at all. Handles cells that straddle band boundaries or
// extend beyond the fragment edge.
export interface ClippedCellSpan {
  /** First visible grid column (>= bodyStart). */
  colStart: number;
  /** One past last visible grid column (<= bodyEnd). */
  colEnd: number;
  /** First visible grid row (>= bodyRowStart). */
  rowStart: number;
  /** One past last visible grid row (<= bodyRowEnd). */
  rowEnd: number;
  /** True if the cell has any visible area. */
  visible: boolean;
}

export function clipCellToBand(
  r: number, c: number,
  cs: number, rs: number,
  bodyColStart: number, bodyColEnd: number,
  bodyRowStart: number, bodyRowEnd: number,
): ClippedCellSpan {
  const colStart = Math.max(c, bodyColStart);
  const colEnd   = Math.min(c + cs, bodyColEnd);
  const rowStart = Math.max(r, bodyRowStart);
  const rowEnd   = Math.min(r + rs, bodyRowEnd);
  return { colStart, colEnd, rowStart, rowEnd, visible: colStart < colEnd && rowStart < rowEnd };
}

// ============================================================
// Drawing primitive — renders one cell onto a PDFPage.
// This is the only function in this section that touches pdf-lib.
// Gridlines use the same visual style as renderTable (rgb 0.6, 0.5pt).
// ============================================================

// Font name matching EmbeddedFonts keys (lines 953-958).
export type SpreadsheetFonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont };

function ssPickFont(fonts: SpreadsheetFonts, bold: boolean, italic: boolean): PDFFont {
  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.italic;
  return fonts.regular;
}

export interface DrawSpreadsheetCellOpts {
  fontSize?: number;
  lineH?: number;
  pad?: number;
  gridLineWidth?: number;
  gridColor?: ReturnType<typeof rgb>;
  clipText?: boolean;   // default true: truncate lines below bottom padding
}

export function drawSpreadsheetCell(
  page: PDFPage,
  cell: IRSpreadsheetCell,
  x: number, y: number,
  w: number, h: number,
  fonts: SpreadsheetFonts,
  opts: DrawSpreadsheetCellOpts = {},
): void {
  const fontSize = opts.fontSize ?? 10;
  const lineH    = opts.lineH    ?? 11;
  const pad      = opts.pad      ?? 3;
  const glw      = opts.gridLineWidth ?? 0.5;
  const glc      = opts.gridColor ?? rgb(0.6, 0.6, 0.6);
  const clipText = opts.clipText  ?? true;

  const dl = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: glw, color: glc });

  dl(x, y, x + w, y);           // top
  dl(x, y - h, x + w, y - h);   // bottom
  dl(x, y, x, y - h);           // left
  dl(x + w, y, x + w, y - h);   // right

  if (!cell.display) return;

  const align = spreadsheetCellAlign(cell);
  const bold  = cell.fmt?.bold   ?? false;
  const italic = cell.fmt?.italic ?? false;
  const font  = ssPickFont(fonts, bold, italic);
  const innerW = w - pad * 2;
  if (innerW <= 0) return;

  const measure: SpreadsheetCellMeasure = (t, fs, b, i) =>
    ssPickFont(fonts, b, i).widthOfTextAtSize(t, fs);
  const lines = spreadsheetWrapText(cell.display, innerW, fontSize, measure);

  let textY = y - pad - fontSize;
  const bottomLimit = y - h + pad;
  for (const line of lines) {
    if (clipText && textY < bottomLimit) break;
    const lw = font.widthOfTextAtSize(line, fontSize);
    const tx = align === 'right' ? x + w - pad - lw : x + pad;
    page.drawText(line, { x: tx, y: textY, size: fontSize, font, color: rgb(0, 0, 0) });
    textY -= lineH;
  }
}

// ============================================================
// IR → PDF RENDERER (XLSX) — FULL SHEET COMPOSER (Krok 4b)
// renderSpreadsheetIRToPdf(sheets) -> Blob. Composition:
//   - Horizontal pagination via spreadsheetColFragments; EVERY page
//     re-prepends the frozen header columns [0,G).
//   - Vertical pagination via spreadsheetRowChunks; EVERY page repeats
//     the frozen header rows [0,H) at the top.
//   - Mini sheet-title header (fontSize+6) drawn on the sheet's first
//     page only; body budget reserves the title height on every page so
//     the title can never overflow (approved "sure-to-fit" rule).
//   - spreadsheetFragmentColsX is the SINGLE source of truth for column
//     X within a fragment; the caller adds MARGIN (+ header-cols width
//     for the body run) exactly once, at draw time.
// ============================================================

export interface RenderSpreadsheetOpts {
  pageWidth?: number;   // default 595 (A4 width)
  pageHeight?: number;  // default 842 (A4 height)
  margin?: number;      // default 50
  titlePt?: number;     // default fontSize + 6
  fontSize?: number;    // default 10
  lineH?: number;       // default 11
  pad?: number;         // default 3
}

export async function renderSpreadsheetIRToPdf(
  spreadsheet: IRSpreadsheet,
  opts: RenderSpreadsheetOpts = {},
  loadFontBytes?: (fileName: string) => Promise<Uint8Array>,
): Promise<Blob> {
  const load = loadFontBytes ?? (async (name: string) => {
    const res = await fetch(`/pdfjs-dist/standard_fonts/${name}`);
    if (!res.ok) throw new Error(`Font fetch failed: ${name} (${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  });

  const PAGE_W = opts.pageWidth ?? 595;
  const PAGE_H = opts.pageHeight ?? 842;
  const MARGIN = opts.margin ?? 50;
  const FONT_SIZE = opts.fontSize ?? 10;
  const LINE_H = opts.lineH ?? 11;
  const PAD = opts.pad ?? 3;
  const TITLE_PT = opts.titlePt ?? (FONT_SIZE + 6);
  const availableW = PAGE_W - MARGIN * 2;

  const fontkit = (await import('@pdf-lib/fontkit')).default;
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fonts: SpreadsheetFonts = {
    regular: await pdfDoc.embedFont(await load('LiberationSans-Regular.ttf')),
    bold: await pdfDoc.embedFont(await load('LiberationSans-Bold.ttf')),
    italic: await pdfDoc.embedFont(await load('LiberationSans-Italic.ttf')),
    boldItalic: await pdfDoc.embedFont(await load('LiberationSans-BoldItalic.ttf')),
  };
  const measure: SpreadsheetCellMeasure = (t, fs, b, i) => ssPickFont(fonts, b, i).widthOfTextAtSize(t, fs);
  const drawOpts: DrawSpreadsheetCellOpts = { fontSize: FONT_SIZE, lineH: LINE_H, pad: PAD };
  const black = rgb(0, 0, 0);

  for (const sheet of spreadsheet.sheets) {
    const nRows = sheet.cells.length;
    const nCols = sheet.cells[0]?.length ?? 0;
    if (nRows === 0 || nCols === 0) continue;

    const colPt = spreadsheetColWidthsPt(sheet);
    const rowHt = spreadsheetRowHeightsPt(sheet, colPt, {
      fontSize: FONT_SIZE, lineH: LINE_H, pad: PAD, measure,
    });
    const H = sheet.frozenRows === undefined ? 1 : Math.min(Math.max(sheet.frozenRows, 0), nRows);
    const G = sheet.frozenCols === undefined ? 0 : Math.min(Math.max(sheet.frozenCols, 0), nCols);
    const headerW = colPt.slice(0, G).reduce((a, b) => a + b, 0);
    const headerBlockPt = rowHt.slice(0, H).reduce((a, b) => a + b, 0);
    const bodyBudget = PAGE_H - MARGIN * 2 - TITLE_PT - headerBlockPt;

    const fragments = spreadsheetColFragments(sheet, colPt, availableW, G);
    const chunks = spreadsheetRowChunks(sheet, rowHt, bodyBudget, H);

    // Frozen header columns: X offsets within the header block (left of body).
    const headerColsX = spreadsheetFragmentColsX(colPt, { start: 0, end: G });
    const headerXOf = new Map<number, number>();
    for (const e of headerColsX) headerXOf.set(e.c, MARGIN + e.x);

    let firstPageOfSheet = true;

    for (let fi = 0; fi < fragments.length; fi++) {
      const frag = fragments[fi];
      const bodyColsX = spreadsheetFragmentColsX(colPt, frag);
      const bodyXOf = new Map<number, number>();
      const bodyLeft = MARGIN + headerW;
      for (const e of bodyColsX) bodyXOf.set(e.c, bodyLeft + e.x);

      for (let ci = 0; ci < chunks.length; ci++) {
        const ch = chunks[ci];
        const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        let y = PAGE_H - MARGIN;

        if (firstPageOfSheet) {
          page.drawText(sheet.name, { x: MARGIN, y: PAGE_H - MARGIN - TITLE_PT, size: TITLE_PT, font: fonts.bold, color: black });
        }
        y -= TITLE_PT;

        const drawClipped = (
          row: number, c: number, colBandStart: number, colBandEnd: number,
          rowStart: number, rowEnd: number,
        ) => {
          const cell = sheet.cells[row]?.[c];
          if (!cell) return;
          const cs = Math.max(cell.colspan || 1, 1);
          const rs = Math.max(cell.rowspan || 1, 1);
          const clip = clipCellToBand(row, c, cs, rs, colBandStart, colBandEnd, rowStart, rowEnd);
          if (!clip.visible) return;
          const leftCol = clip.colStart;
          const leftX = leftCol < G ? (headerXOf.get(leftCol) ?? MARGIN) : (bodyXOf.get(leftCol) ?? bodyLeft);
          let w = 0;
          for (let cc = clip.colStart; cc < clip.colEnd; cc++) w += colPt[cc] ?? 0;
          let h = 0;
          for (let rr = clip.rowStart; rr < clip.rowEnd; rr++) h += rowHt[rr] ?? 0;
          drawSpreadsheetCell(page, cell, leftX, y, w, h, fonts, drawOpts);
        };

        // Frozen header rows [0,H) — full fragment horizontal extent.
        for (let r = 0; r < H; r++) {
          for (const e of headerColsX) drawClipped(r, e.c, 0, G, 0, H);
          for (const e of bodyColsX) drawClipped(r, e.c, frag.start, frag.end, 0, H);
          y -= rowHt[r] ?? 0;
        }
        // Body rows [ch.start, ch.end) — full fragment horizontal extent.
        for (let r = ch.start; r < ch.end; r++) {
          for (const e of headerColsX) drawClipped(r, e.c, 0, G, ch.start, ch.end);
          for (const e of bodyColsX) drawClipped(r, e.c, frag.start, frag.end, ch.start, ch.end);
          y -= rowHt[r] ?? 0;
        }
        firstPageOfSheet = false;
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
}

// ============================================================
// IR → ODT RENDERER
// ============================================================
// Mirrors renderIRToDocx (IR→OOXML) but emits an OpenDocument (.odt) package.
// Contract: renderIRToOdt(pages, images) -> Blob of MIME
// application/vnd.oasis.opendocument.text.
// Structure (validated incrementally — Components 1–5):
//   ZIP: mimetype STORE-first (ODF spec), content.xml, styles.xml, meta.xml,
//        META-INF/manifest.xml, optional Pictures/<img>.
//   Named text styles deduplicated by (font,size,bold,italic,color) -> T{n}.
//   <text:list> nesting reconstructed from flat IRListItemBlock levels with a
//        defensive clamp (never deeper than currentDepth+1).
//   <draw:frame>/<draw:image> per IRImageBlock + manifest entry per picture.
//   <table:table> per IRTableBlock (colspan/rowspan/column widths).

const ODT_MIME = 'application/vnd.oasis.opendocument.text';

function odtXmlEsc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Normalize an IR run color (may or may not carry '#') to ODF's '#RRGGBB'. */
function odtRenderColorHex(color: string): string {
  return color.startsWith('#') ? color : `#${color}`;
}

function odtRenderMimeForTarget(target: string): string {
  const t = target.toLowerCase();
  if (t.endsWith('.jpg') || t.endsWith('.jpeg')) return 'image/jpeg';
  if (t.endsWith('.png')) return 'image/png';
  if (t.endsWith('.gif')) return 'image/gif';
  if (t.endsWith('.bmp')) return 'image/bmp';
  return 'application/octet-stream';
}

/**
 * Basename of DocxImage.target. Targets in this codebase may be prefixed
 * ('Pictures/img.png' from ODT, or 'word/media/...' from DOCX) or bare
 * ('img.png'). We always take the last path segment and append a unique index
 * so same-named pictures from different source folders don't collide.
 */
function odtRenderUniqueFile(target: string, index: number): string {
  const slash = target.lastIndexOf('/');
  const base = slash >= 0 ? target.slice(slash + 1) : target;
  const dot = base.lastIndexOf('.');
  const name = dot >= 0 ? base.slice(0, dot) : base;
  const ext = dot >= 0 ? base.slice(dot) : '';
  return `${name}${index}${ext}`;
}

// ---- style dedup ----
interface OdtRunStyle { font: string; size: number; bold: boolean; italic: boolean; color: string; }

function odtRenderStyleKey(s: OdtRunStyle): string {
  return `${s.font}|${s.size}|${s.bold ? 'b' : ''}|${s.italic ? 'i' : ''}|${s.color}`;
}

function odtRenderScanStyles(): {
  styles: { name: string; props: OdtRunStyle }[];
  nameFor: (r: IRTextRun) => string;
} {
  const map = new Map<string, string>();
  const styles: { name: string; props: OdtRunStyle }[] = [];
  let n = 0;
  const nameFor = (r: IRTextRun): string => {
    const props: OdtRunStyle = {
      font: r.fontName || '',
      size: r.fontSize,
      bold: !!r.bold,
      italic: !!r.italic,
      color: odtRenderColorHex(r.color),
    };
    const key = odtRenderStyleKey(props);
    let name = map.get(key);
    if (!name) {
      n += 1;
      name = `T${n}`;
      map.set(key, name);
      styles.push({ name, props });
    }
    return name;
  };
  return { styles, nameFor };
}

function odtRenderAutoStylesXml(styles: { name: string; props: OdtRunStyle }[]): string {
  if (styles.length === 0) return '';
  const rows = styles
    .map((s) => {
      const fw = s.props.bold ? 'bold' : 'normal';
      return (
        `  <style:style style:name="${s.name}" style:family="text">` +
        `<style:text-properties` +
        (s.props.font ? ` style:font-name="${odtXmlEsc(s.props.font)}"` : '') +
        ` fo:font-size="${s.props.size}pt"` +
        ` fo:font-weight="${fw}"` +
        (s.props.italic ? ` fo:font-style="italic"` : '') +
        ` fo:color="${s.props.color}"/>` +
        `</style:style>`
      );
    })
    .join('\n');
  return '\n' + rows + '\n';
}

function odtRenderRunsXml(runs: IRTextRun[], nameFor: (r: IRTextRun) => string): string {
  return runs
    .map((r) => (r.text ? `<text:span text:style-name="${nameFor(r)}">${odtXmlEsc(r.text)}</text:span>` : ''))
    .join('');
}

// ---- list reconstruction (inverse of odfProcessList) ----
interface OdtListItemT { runs: IRTextRun[]; nested: OdtListT[]; }
interface OdtListT { children: OdtListItemT[]; }

function odtRenderReconstructList(items: IRListItemBlock[]): OdtListT {
  const stack: OdtListT[] = [];
  const root: OdtListT = { children: [] };
  stack[0] = root;
  for (const it of items) {
    const currentDepth = stack.length - 1;
    // Defensive clamp: never build deeper than currentDepth+1 (handles skips
    // e.g. level 0 -> 2 or an item starting at level N with no context).
    const depth = Math.min(it.level, currentDepth + 1);
    while (stack.length - 1 > depth) stack.pop();
    while (stack.length - 1 < depth) {
      const parentList = stack[stack.length - 1];
      const parentItem = parentList.children[parentList.children.length - 1];
      if (!parentItem) break; // cannot nest without a parent item
      const nested: OdtListT = { children: [] };
      parentItem.nested.push(nested);
      stack.push(nested);
    }
    stack[stack.length - 1].children.push({ runs: it.runs, nested: [] });
  }
  return root;
}

function odtRenderListXml(node: OdtListT, nameFor: (r: IRTextRun) => string): string {
  const items = node.children
    .map((it) => {
      const inner = odtRenderRunsXml(it.runs, nameFor);
      const p = inner ? `<text:p>${inner}</text:p>` : `<text:p/>`;
      const nested = it.nested.map((n) => odtRenderListXml(n, nameFor)).join('');
      return `<text:list-item>${p}${nested}</text:list-item>`;
    })
    .join('');
  return `<text:list>${items}</text:list>`;
}

function odtRenderTableXml(table: IRTableBlock, nameFor: (r: IRTextRun) => string): string {
  const cols = table.columnWidths
    .map((w) => `<table:table-column style:column-width="${Math.round(w)}pt"/>`)
    .join('');
  const rows = table.cells
    .map((row) =>
      `<table:table-row>` +
      row
        .map((cell) => {
          const inner = odtRenderRunsXml(cell.runs, nameFor);
          const p = inner ? `<text:p>${inner}</text:p>` : `<text:p/>`;
          const attrs: string[] = [];
          if (cell.colspan > 1) attrs.push(`table:number-columns-spanned="${cell.colspan}"`);
          if (cell.rowspan > 1) attrs.push(`table:number-rows-spanned="${cell.rowspan}"`);
          return `<table:table-cell${attrs.length ? ' ' + attrs.join(' ') : ''}>${p}</table:table-cell>`;
        })
        .join('') +
      `</table:table-row>`
    )
    .join('');
  return `<table:table>${cols}${rows}</table:table>`;
}

interface OdtPicture { path: string; data: Uint8Array; media: string; }

function odtRenderBodyXml(
  pages: IRPageIR[],
  images: Map<string, DocxImage>,
  nameFor: (r: IRTextRun) => string,
  pictures: OdtPicture[],
): string {
  const out: string[] = [];
  let imgIdx = 0;
  for (const page of pages) {
    let listBuffer: IRListItemBlock[] = [];
    const flushLists = (): void => {
      if (listBuffer.length) {
        out.push(odtRenderListXml(odtRenderReconstructList(listBuffer), nameFor));
        listBuffer = [];
      }
    };
    for (const block of page.blocks) {
      if (block.kind === 'list-item') {
        listBuffer.push(block as IRListItemBlock);
        continue;
      }
      flushLists();
      if (block.kind === 'paragraph') {
        const p = block as IRParagraphBlock;
        const inner = odtRenderRunsXml(p.runs, nameFor);
        out.push(inner ? `<text:p>${inner}</text:p>` : `<text:p/>`);
      } else if (block.kind === 'heading') {
        const h = block as IRHeadingBlock;
        const lvl = Math.min(Math.max(h.level, 1), 6);
        out.push(`<text:h text:outline-level="${lvl}">${odtRenderRunsXml(h.runs, nameFor)}</text:h>`);
      } else if (block.kind === 'table') {
        out.push(odtRenderTableXml(block as IRTableBlock, nameFor));
      } else if (block.kind === 'image') {
        const img = block as IRImageBlock;
        const imgData = images.get(img.imageId);
        if (!imgData) {
          console.warn(`[renderIRToOdt] image block references unknown imageId: ${img.imageId}`);
          continue; // guard: unknown id skipped rather than writing a broken frame
        }
        imgIdx += 1;
        const file = odtRenderUniqueFile(imgData.target, imgIdx);
        pictures.push({ path: `Pictures/${file}`, data: imgData.data, media: odtRenderMimeForTarget(imgData.target) });
        out.push(
          `<draw:frame draw:name="image${imgIdx}" text:anchor-type="as-char" ` +
            `svg:width="${img.naturalWidth}pt" svg:height="${img.naturalHeight}pt">` +
            `<draw:image xlink:href="Pictures/${odtXmlEsc(file)}" xlink:type="simple" ` +
            `xlink:show="embed" xlink:actuate="onLoad"/>` +
            `</draw:frame>`
        );
      }
    }
    flushLists();
  }
  return out.join('\n');
}

function odtRenderContentXml(body: string, styles: { name: string; props: OdtRunStyle }[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="${ODF_OFFICE}"
  xmlns:text="${ODF_TEXT}"
  xmlns:style="${ODF_STYLE}"
  xmlns:fo="${ODF_FO}"
  xmlns:draw="${ODF_DRAW}"
  xmlns:svg="${ODF_SVG}"
  xmlns:table="${ODF_TABLE}"
  xmlns:xlink="${XLINK}">
  <office:automatic-styles>${odtRenderAutoStylesXml(styles)}
  </office:automatic-styles>
  <office:body>
    <office:text>
${body}
    </office:text>
  </office:body>
</office:document-content>`;
}

function odtRenderManifestXml(pictures: OdtPicture[]): string {
  const rows = [
    `  <manifest:file-entry manifest:full-path="/" manifest:media-type="${ODT_MIME}"/>`,
    `  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>`,
    `  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>`,
    `  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>`,
    ...pictures.map((p) => `  <manifest:file-entry manifest:full-path="${p.path}" manifest:media-type="${p.media}"/>`),
  ].join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="${ODF_MANIFEST}" manifest:version="1.2">
${rows}
</manifest:manifest>`;
}

const ODT_STYLES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="${ODF_OFFICE}" xmlns:style="${ODF_STYLE}" xmlns:text="${ODF_TEXT}">
  <office:styles/>
</office:document-styles>`;

const ODT_META_XML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="${ODF_OFFICE}" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0">
  <office:meta>
    <meta:generator>OptimaPDF</meta:generator>
  </office:meta>
</office:document-meta>`;

export async function renderIRToOdt(
  pages: IRPageIR[],
  images: Map<string, DocxImage>,
): Promise<Blob> {
  // 1. Style dedup is LAZY: nameFor() is called once per run while body renders.
  //    Identical (font,size,bold,italic,color) runs share one generated T{n}
  //    style. `styles` is serialized into content.xml AFTER body rendering, so
  //    the list is fully populated by the time it is used.
  const { styles, nameFor } = odtRenderScanStyles();

  // 2. Render body; collect picture bytes for Pictures/ + manifest.
  const pictures: OdtPicture[] = [];
  const body = odtRenderBodyXml(pages, images, nameFor, pictures);

  // 3. Assemble package — mimetype MUST be the first, uncompressed ZIP entry.
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  zip.file('mimetype', ODT_MIME, { compression: 'STORE' });
  zip.file('content.xml', odtRenderContentXml(body, styles));
  zip.file('styles.xml', ODT_STYLES_XML);
  zip.file('meta.xml', ODT_META_XML);
  zip.file('META-INF/manifest.xml', odtRenderManifestXml(pictures));
  for (const pic of pictures) zip.file(pic.path, pic.data);

  const bytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  return new Blob([bytes as BlobPart], { type: ODT_MIME });
}
