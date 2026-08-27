// IR types shared between extraction (client-pdf.ts) and rendering (docx/pdf)
// Dependencies: docx, pdf-lib, @pdf-lib/fontkit

import { PDFDocument, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib';

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
  source: 'drawingml' | 'vml';
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
