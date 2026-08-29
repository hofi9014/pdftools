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

    const PAD = 4;
    const LINE_H = 12;
    const cellTextWidth = (colIdx: number) =>
      Math.max(0, colWidths[colIdx] - PAD * 2);

    const rowHeights: number[] = [];
    for (const row of table.cells) {
      let maxH = LINE_H + PAD * 2;
      for (let c = 0; c < row.length && c < nCols; c++) {
        const cell = row[c];
        const cw = cellTextWidth(c);
        let textH = LINE_H;
        if (cw > 0 && cell.runs.length > 0) {
          const lines = breakIntoLines(cell.runs, fonts, cw);
          textH = lines.length * LINE_H;
        }
        maxH = Math.max(maxH, textH + PAD * 2);
      }
      rowHeights.push(maxH);
    }

    const totalH = rowHeights.reduce((a, b) => a + b, 0);
    ensurePage();

    let tableY = cursorY;
    for (let r = 0; r < table.cells.length; r++) {
      const rh = rowHeights[r];
      const row = table.cells[r];

      // Force a page break before this row when it does not fit below the
      // table cursor — but not on an already-empty page (that would risk an
      // infinite break loop for a row taller than the whole page).
      if (tableY - rh < MARGIN && tableY !== pageH - MARGIN) {
        breakPage();
        ensurePage();
        tableY = cursorY;
      }

      let cellX = MARGIN;

      for (let c = 0; c < row.length && c < nCols; c++) {
        const cw = colWidths[c];

        currentPage!.drawRectangle({
          x: cellX, y: tableY - rh, width: cw, height: rh,
          borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.5,
        });

        const cell = row[c];
        if (cell.runs.length > 0) {
          const cwInner = cellTextWidth(c);
          let textY = tableY - PAD - LINE_H;
          if (cwInner > 0) {
            const lines = breakIntoLines(cell.runs, fonts, cwInner);
            for (const line of lines) {
              let textX = cellX + PAD;
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

        cellX += cw;
      }
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
