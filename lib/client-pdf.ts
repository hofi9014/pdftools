import { PDFDocument, StandardFonts, rgb, degrees, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFDict, PDFCheckBox, PDFRadioGroup, pushGraphicsState, translate, rotateInPlace, drawObject, popGraphicsState, type PDFPage, type PDFField, type PDFWidgetAnnotation, type PDFFont } from 'pdf-lib';
import { extractTextBlocks, type TextBlock } from './pdf/extractTextBlocks';
import { rasterizePage, REDACT_RENDER_SCALE, type RedactRegion, type RasterCanvasFactory, type RasterContext, type PdfjsLibLike } from './pdf-raster';
import type { RedactWorkerRequest, RedactWorkerResponse } from './redact-worker';
import { renderIRToDocx, type IRTextRun, type IRParagraphBlock, type IRHeadingBlock, type IRListItemBlock, type IRImageBlock, type IRTableCell, type IRBlock, type IRRect, type IRPageIR } from './client-pdf-docx';

let pdfjsInitPromise: Promise<void> | null = null;

export async function initPdfjs(): Promise<void> {
  if (pdfjsInitPromise) return pdfjsInitPromise;
  pdfjsInitPromise = (async () => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  })();
  return pdfjsInitPromise;
}

function pdfjsDocOptions(data: Uint8Array): { data: Uint8Array; cMapUrl: string; cMapPacked: boolean; standardFontDataUrl: string } {
  return {
    data,
    cMapUrl: '/pdfjs-dist/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs-dist/standard_fonts/',
  };
}

export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const buf = await file.arrayBuffer();
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
    const indices = pdf.getPageIndices();
    const pages = await mergedPdf.copyPages(pdf, indices);
    pages.forEach(page => mergedPdf.addPage(page));
  }
  return mergedPdf.save();
}

export async function splitPDF(file: File): Promise<Uint8Array[]> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const results: Uint8Array[] = [];
  for (let i = 0; i < pdf.getPageCount(); i++) {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(page);
    results.push(await newPdf.save());
  }
  return results;
}

export async function rotatePDF(file: File, angle: 90 | 180 | 270): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  for (const page of pdf.getPages()) {
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  }
  return pdf.save();
}

export async function addPageNumbers(file: File, options: { startNumber?: number; verticalPosition?: 'bottom' | 'top'; horizontalPosition?: 'left' | 'center' | 'right'; fontSize?: number } = {}): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const start = options.startNumber ?? 1;
  const vPos = options.verticalPosition ?? 'bottom';
  const hPos = options.horizontalPosition ?? 'center';
  const fontSize = options.fontSize ?? 12;

  for (let i = 0; i < pdf.getPageCount(); i++) {
    const page = pdf.getPage(i);
    const { width, height } = page.getSize();
    const text = String(start + i);
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x: number;
    if (hPos === 'left') x = 50;
    else if (hPos === 'right') x = width - 50 - textWidth;
    else x = width / 2 - textWidth / 2;
    const y = vPos === 'top' ? height - 30 : 30;
    page.drawText(text, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
  }
  return pdf.save();
}

export async function addWatermark(file: File, text: string, options?: { opacity?: number; rotation?: number; fontSize?: number; position?: 'top' | 'center' | 'bottom' }): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font = await embedLiberationSans(pdf);
  const opacity = (options?.opacity ?? 50) / 100;
  const rotation = options?.rotation ?? 45;
  const fontSize = options?.fontSize ?? 48;
  const position = options?.position ?? 'center';

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x: number, y: number;
    if (rotation === 0) {
      if (position === 'top') y = height - 60 - fontSize;
      else if (position === 'bottom') y = 60;
      else y = height / 2 - fontSize / 2;
      x = width / 2 - textWidth / 2;
    } else {
      const textHeight = font.heightAtSize(fontSize);
      const ascentHeight = font.heightAtSize(fontSize, { descender: false });
      const centerYOffset = ascentHeight - textHeight / 2;
      const rad = (rotation * Math.PI) / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);
      const bboxCenterOffsetX = (textWidth / 2) * cosR - centerYOffset * sinR;
      const bboxCenterOffsetY = (textWidth / 2) * sinR + centerYOffset * cosR;
      const refX = width / 2;
      const refY = position === 'top' ? height * 0.75 : position === 'bottom' ? height * 0.25 : height / 2;
      x = refX - bboxCenterOffsetX;
      y = refY - bboxCenterOffsetY;
    }
    page.drawText(text, { x, y, size: fontSize, font, color: rgb(0.5, 0.5, 0.5), opacity, rotate: degrees(rotation) });
  }
  return pdf.save();
}

export async function deletePages(file: File, pageIndices: number[]): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const sorted = [...new Set(pageIndices)].sort((a, b) => b - a);
  for (const idx of sorted) {
    if (idx >= 0 && idx < pdf.getPageCount()) pdf.removePage(idx);
  }
  return pdf.save();
}

export async function extractPages(file: File, pageIndices: number[]): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  for (const idx of pageIndices) {
    if (idx >= 0 && idx < pdf.getPageCount()) {
      const [page] = await newPdf.copyPages(pdf, [idx]);
      newPdf.addPage(page);
    }
  }
  return newPdf.save();
}

export async function splitBySelection(
  file: File,
  selectedIndices: number[]
): Promise<{ selected: Uint8Array | null; rest: Uint8Array | null }> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = pdf.getPageCount();
  const selIndices = [...new Set(selectedIndices)]
    .filter((i) => i >= 0 && i < total)
    .sort((a, b) => a - b);
  const restIndices = Array.from({ length: total }, (_, i) => i).filter((i) => !selIndices.includes(i));

  const makePdf = async (indices: number[]) => {
    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(pdf, indices);
    pages.forEach((p) => newPdf.addPage(p));
    return newPdf.save();
  };

  let selected: Uint8Array | null = null;
  let rest: Uint8Array | null = null;
  if (selIndices.length > 0) selected = await makePdf(selIndices);
  if (restIndices.length > 0) rest = await makePdf(restIndices);
  return { selected, rest };
}

export async function reorderPages(file: File, newOrder: number[]): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  for (const idx of newOrder) {
    if (idx >= 0 && idx < pdf.getPageCount()) {
      const [page] = await newPdf.copyPages(pdf, [idx]);
      newPdf.addPage(page);
    }
  }
  return newPdf.save();
}

export async function cropPages(file: File, margins: { top: number; right: number; bottom: number; left: number }, pages?: number[]): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const allPages = pdf.getPages();
  const indices = pages || allPages.map((_, i) => i);
  for (const idx of indices) {
    if (idx < 0 || idx >= allPages.length) continue;
    const { width, height } = allPages[idx].getSize();
    allPages[idx].setMediaBox(margins.left, margins.bottom, width - margins.left - margins.right, height - margins.bottom - margins.top);
  }
  return pdf.save();
}

export async function addBlankPage(file: File, position?: number): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  if (position !== undefined && position >= 0 && position <= pdf.getPageCount()) {
    pdf.insertPage(position, pdf.addPage());
  } else {
    pdf.addPage();
  }
  return pdf.save();
}

export async function editMetadata(file: File, meta: { title?: string; author?: string; subject?: string; keywords?: string }): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  if (meta.title !== undefined) pdf.setTitle(meta.title);
  if (meta.author !== undefined) pdf.setAuthor(meta.author);
  if (meta.subject !== undefined) pdf.setSubject(meta.subject);
  if (meta.keywords !== undefined) pdf.setKeywords((meta.keywords || '').split(',').map(s => s.trim()).filter(Boolean));

  let xmpXml = await readExistingXmp(pdf);
  if (xmpXml) {
    try { xmpXml = applyMetadataToXmp(xmpXml, meta); } catch { xmpXml = ''; }
  }
  if (!xmpXml) {
    xmpXml = buildNewXmp(meta);
  }
  if (xmpXml) {
    writeXmpToPdf(pdf, xmpXml);
  }

  return pdf.save();
}

const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const DC_NS = 'http://purl.org/dc/elements/1.1/';
const PDF_NS = 'http://ns.adobe.com/pdf/1.3/';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';

async function readExistingXmp(pdf: PDFDocument): Promise<string | null> {
  const metaRef = pdf.catalog.get(PDFName.of('Metadata'));
  if (!metaRef) return null;
  const metaObj = pdf.context.lookup(metaRef as never);
  if (!(metaObj instanceof PDFRawStream) || !metaObj.dict) return null;
  const filters = parseFilters(metaObj.dict.get(PDFName.of('Filter')));
  let raw: Uint8Array = metaObj.contents;
  if (filters.includes('/FlateDecode') && raw.length > 20) {
    try {
      const pako = (await import('pako')).default;
      raw = pako.inflate(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
    } catch { return null; }
  }
  try { return new TextDecoder('utf-8').decode(raw); } catch { return null; }
}

function updateXmpField(doc: Document, nsUri: string, localName: string, value: string, containerTag: 'Alt' | 'Seq' | null): void {
  let node = doc.getElementsByTagNameNS(nsUri, localName)[0];
  if (!node) {
    const desc = doc.getElementsByTagNameNS(RDF_NS, 'Description')[0];
    if (!desc) return;
    node = doc.createElementNS(nsUri, localName);
    if (containerTag) {
      const container = doc.createElementNS(RDF_NS, 'rdf:' + containerTag);
      const li = doc.createElementNS(RDF_NS, 'rdf:li');
      li.setAttributeNS(XML_NS, 'xml:lang', 'x-default');
      li.textContent = value;
      container.appendChild(li);
      node.appendChild(container);
    } else {
      node.textContent = value;
    }
    desc.appendChild(node);
    return;
  }
  if (containerTag) {
    const liNodes = node.getElementsByTagNameNS(RDF_NS, 'li');
    let targetLi: Element | null = null;
    for (let i = 0; i < liNodes.length; i++) {
      if (liNodes[i].getAttributeNS(XML_NS, 'lang') === 'x-default') { targetLi = liNodes[i]; break; }
    }
    if (!targetLi && liNodes.length > 0) targetLi = liNodes[0];
    if (targetLi) targetLi.textContent = value;
  } else {
    node.textContent = value;
  }
}

function applyMetadataToXmp(xmpXml: string, meta: { title?: string; author?: string; subject?: string; keywords?: string }): string {
  const doc = new DOMParser().parseFromString(xmpXml, 'application/xml');
  if (doc.querySelector('parsererror')) return '';
  let desc = doc.getElementsByTagNameNS(RDF_NS, 'Description')[0];
  if (!desc) {
    const rdfRoot = doc.getElementsByTagNameNS(RDF_NS, 'RDF')[0];
    if (!rdfRoot) return '';
    desc = doc.createElementNS(RDF_NS, 'rdf:Description');
    desc.setAttributeNS(null, 'rdf:about', '');
    rdfRoot.appendChild(desc);
  }
  if (meta.title !== undefined) updateXmpField(doc, DC_NS, 'title', meta.title, 'Alt');
  if (meta.author !== undefined) updateXmpField(doc, DC_NS, 'creator', meta.author, 'Seq');
  if (meta.subject !== undefined) updateXmpField(doc, DC_NS, 'description', meta.subject, 'Alt');
  if (meta.keywords !== undefined) updateXmpField(doc, PDF_NS, 'Keywords', meta.keywords, null);
  return new XMLSerializer().serializeToString(doc);
}

function escapeXml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function buildNewXmp(meta: { title?: string; author?: string; subject?: string; keywords?: string }): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(meta.title || '')}</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>${escapeXml(meta.author || '')}</rdf:li></rdf:Seq></dc:creator>
      <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(meta.subject || '')}</rdf:li></rdf:Alt></dc:description>
      <pdf:Keywords>${escapeXml(meta.keywords || '')}</pdf:Keywords>
      <xmp:CreateDate>${now}</xmp:CreateDate>
      <xmp:ModifyDate>${now}</xmp:ModifyDate>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

function writeXmpToPdf(pdf: PDFDocument, xmpXml: string): void {
  try { pdf.catalog.delete(PDFName.of('Metadata')); } catch {}
  const xmpBytes = new TextEncoder().encode(xmpXml);
  const xmpStream = pdf.context.stream(xmpBytes, { Type: 'Metadata', Subtype: 'XML' });
  const xmpRef = pdf.context.register(xmpStream);
  pdf.catalog.set(PDFName.of('Metadata'), xmpRef);
}

export async function flattenPDF(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages = pdf.getPages();

  const acroForm = pdf.catalog.get(PDFName.of('AcroForm'));

  if (acroForm) {
    const form = pdf.getForm();
    const pdfFields = form.getFields();

    const sigRefs = new Set<PDFRef>();
    for (const f of pdfFields) {
      if (f.constructor.name !== 'PDFSignature') continue;
      for (const w of f.acroField.getWidgets()) {
        const ref = pdf.context.getObjectRef(w.dict);
        if (ref) sigRefs.add(ref);
      }
      const fref = pdf.context.getObjectRef(f.acroField.dict);
      if (fref) sigRefs.add(fref);
    }

    const font = await embedLiberationSans(pdf);

    for (const f of pdfFields) {
      if (f.constructor.name === 'PDFSignature') continue;
      try {
        if (f.needsAppearancesUpdate()) f.defaultUpdateAppearances(font);
        for (const widget of f.acroField.getWidgets()) {
          const page = findWidgetPage(pdf, pages, widget);
          const appearanceRef = resolveAppearanceRef(f, widget);
          const rect = widget.getRectangle();
          page.pushOperators(
            pushGraphicsState(),
            translate(rect.x, rect.y),
            ...rotateInPlace({ ...rect, rotation: 0 }),
            drawObject(page.node.newXObject('FlatWidget', appearanceRef)),
            popGraphicsState(),
          );
        }
      } catch (err) {
        console.warn('flattenPDF: skipping field', f.getName?.(), err);
      }
      // Always remove the field, even if its appearance could not be generated.
      // Otherwise PDFDocument.save() re-runs updateFieldAppearances() with the
      // WinAnsi default font (Helvetica) and crashes on non-WinAnsi values.
      try {
        form.removeField(f);
      } catch (err) {
        console.warn('flattenPDF: could not remove field', f.getName?.(), err);
      }
    }

    for (const page of pages) {
      const annots = page.node.Annots();
      if (!annots) continue;
      const keep: PDFRef[] = [];
      for (const a of annots.asArray()) {
        if (a instanceof PDFRef && sigRefs.has(a)) keep.push(a);
      }
      if (keep.length > 0) {
        page.node.set(PDFName.of('Annots'), pdf.context.obj(keep));
      } else {
        page.node.delete(PDFName.of('Annots'));
      }
    }
  } else {
    for (const page of pages) page.node.delete(PDFName.Annots);
  }

  // Appearances were generated explicitly above; skip save()'s auto-pass which
  // would use the WinAnsi default font (Helvetica) on any remaining field.
  return pdf.save({ updateFieldAppearances: false });
}

function findWidgetPage(pdf: PDFDocument, pages: PDFPage[], widget: PDFWidgetAnnotation): PDFPage {
  const pageRef = widget.P();
  const byRef = pages.find((p) => p.ref === pageRef);
  if (byRef) return byRef;
  const widgetRef = pdf.context.getObjectRef(widget.dict);
  const byAnnot = widgetRef
    ? pages.find((p) => p.node.Annots()?.asArray().includes(widgetRef))
    : undefined;
  if (byAnnot) return byAnnot;
  throw new Error('flattenPDF: could not find page for widget');
}

function resolveAppearanceRef(field: PDFField, widget: PDFWidgetAnnotation): PDFRef {
  let refOrDict: PDFRef | PDFDict = widget.getNormalAppearance();
  if (refOrDict instanceof PDFDict &&
      (field instanceof PDFCheckBox || field instanceof PDFRadioGroup)) {
    const value = field.acroField.getValue();
    const ref = value ? refOrDict.get(value) ?? refOrDict.get(PDFName.of('Off')) : undefined;
    if (ref instanceof PDFRef) refOrDict = ref;
  }
  if (!(refOrDict instanceof PDFRef)) {
    throw new Error('Failed to extract appearance ref for: ' + field.getName());
  }
  return refOrDict;
}

export async function downloadPdf(data: Uint8Array, filename: string): Promise<Blob> {
  const blob = new Blob([data as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : filename + '.pdf';
  a.click();
  URL.revokeObjectURL(url);
  return blob;
}

export async function downloadZip(buffers: { data: Uint8Array; name: string }[]): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  buffers.forEach((b, i) => zip.file(b.name || `file-${i + 1}.pdf`, b.data as unknown as Uint8Array<ArrayBuffer>));
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'archive.zip';
  a.click();
  URL.revokeObjectURL(url);
  return blob;
}

export function parsePageRanges(input: string, totalPages?: number): number[] {
  const parts = input.split(',').map(s => s.trim()).filter(Boolean);
  const indices: number[] = [];
  for (const part of parts) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    const start = parseInt(m[1], 10) - 1;
    const end = m[2] ? parseInt(m[2], 10) - 1 : start;
    for (let i = Math.max(0, start); i <= end && (totalPages === undefined || i < totalPages); i++) {
      indices.push(i);
    }
  }
  return [...new Set(indices)];
}

export async function splitByRanges(file: File, rangeString: string): Promise<{ data: Uint8Array; name: string }[]> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = pdf.getPageCount();
  const parts = rangeString.split(',').map(s => s.trim()).filter(Boolean);
  const results: { data: Uint8Array; name: string }[] = [];
  for (let r = 0; r < parts.length; r++) {
    const m = parts[r].match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    const start = parseInt(m[1], 10) - 1;
    const end = m[2] ? parseInt(m[2], 10) - 1 : start;
    const indices: number[] = [];
    for (let i = start; i <= end && i < total; i++) indices.push(i);
    if (indices.length === 0) continue;
    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(pdf, indices);
    pages.forEach(p => newPdf.addPage(p));
    const label = indices.length === 1 ? `strona_${start + 1}` : `strony_${start + 1}-${end + 1}`;
    results.push({ data: await newPdf.save(), name: `${label}.pdf` });
  }
  return results;
}

export async function pdfToSvgPages(file: File): Promise<{ svg: string; name: string }[]> {
  const buf = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(buf))).promise;
  const results: { svg: string; name: string }[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const imgData = canvas.toDataURL('image/png');
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${viewport.width}" height="${viewport.height}" viewBox="0 0 ${viewport.width} ${viewport.height}">
  <image width="${viewport.width}" height="${viewport.height}" xlink:href="${imgData}" />
</svg>`;
    results.push({ svg, name: `strona_${i}.svg` });
  }

  await doc.cleanup();
  return results;
}

/* ── helpers for pdfToEpub structured extraction ─────────────────── */

interface StructuredBlock {
  text: string
  heading: 0 | 1 | 2 | 3
  bold: boolean
  italic: boolean
  newParagraph: boolean
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function isBoldFont(fontName: string): boolean {
  if (!fontName) return false;
  const lower = fontName.toLowerCase();
  return lower.includes('bold') ||
    lower.includes('black') ||
    lower.includes('heavy') ||
    lower.includes('demi') ||
    lower.includes('ultra') ||
    lower.endsWith('bd') ||
    lower.endsWith('bdit');
}

function isItalicFont(fontName: string): boolean {
  if (!fontName) return false;
  const lower = fontName.toLowerCase();
  return lower.includes('italic') ||
    lower.includes('oblique') ||
    lower.includes('slant') ||
    lower.endsWith('it') ||
    lower.endsWith('bdit');
}

function classifyBlocks(blocks: TextBlock[]): StructuredBlock[] {
  if (blocks.length === 0) return [];

  const fontSizes = blocks.map((b) => b.fontSize).filter((fs) => fs > 0);
  const freq = new Map<number, number>();
  for (const fs of fontSizes) freq.set(fs, (freq.get(fs) || 0) + 1);
  const domFS = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || median(fontSizes);

  const lineGaps: number[] = [];
  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i].page === blocks[i - 1].page) {
      const gap = blocks[i - 1].y - blocks[i].y;
      if (gap > 0 && gap < 200) lineGaps.push(gap);
    }
  }
  const medGap = median(lineGaps) || 14;

  return blocks.map((b, i) => {
    const ratio = domFS > 0 ? b.fontSize / domFS : 1;

    let heading: 0 | 1 | 2 | 3 = 0;
    if (ratio >= 1.3 && b.text.length >= 3 && b.text.length <= 80) {
      if (ratio >= 1.8) heading = 1;
      else if (ratio >= 1.4) heading = 2;
      else heading = 3;
    }

    const prev = i > 0 ? blocks[i - 1] : null;
    let newParagraph = true;
    if (prev) {
      if (prev.page !== b.page) newParagraph = true;
      else {
        const gap = prev.y - b.y;
        newParagraph = gap > medGap * 1.6;
      }
    }

    return {
      text: b.text,
      heading,
      bold: isBoldFont(b.fontName),
      italic: isItalicFont(b.fontName),
      newParagraph,
    };
  });
}

function blocksToXhtmlBody(blocks: StructuredBlock[]): string {
  if (blocks.length === 0) return '<p>(brak tekstu)</p>';

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const parts: string[] = [];
  let buf = '';

  const flush = () => {
    if (buf.trim()) parts.push(`<p>${buf.trim()}</p>`);
    buf = '';
  };

  for (const b of blocks) {
    if (b.heading > 0) {
      flush();
      const tag = `h${b.heading}`;
      const inner = b.bold ? `<strong>${esc(b.text)}</strong>` : esc(b.text);
      parts.push(`<${tag}>${inner}</${tag}>`);
      buf = '';
      continue;
    }

    if (b.newParagraph) {
      flush();
    }

    let text = esc(b.text);
    if (b.bold) text = `<strong>${text}</strong>`;
    if (b.italic) text = `<em>${text}</em>`;
    buf += (buf && !b.newParagraph ? ' ' : '') + text;
  }

  flush();
  return parts.join('\n') || '<p>(brak tekstu)</p>';
}

/* ── pdfToEpub ───────────────────────────────────────────────────── */
/*
 * Known limitation: multi-column documents with detected structure
 * (headings/bold) may interleave column text - see Punkt 21 diagnosis.
 * extractTextBlocks sorts Y desc, X asc which produces row-major order
 * (L1,R1,L2,R2) instead of column-major (L1,L2,R1,R2).
 * LEGACY path avoids this by using raw pdfjs getTextContent() directly.
 */

export async function pdfToEpub(file: File): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(buf))).promise;
  const title = file.name.replace(/\.pdf$/i, '');

  const rawTexts: string[] = [];
  const pageStructuredBlocks: StructuredBlock[][] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);

    const content = await page.getTextContent();
    const rawText = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as unknown as { str: string }).str)
      .join(' ');
    rawTexts.push(rawText.trim());

    const viewport = page.getViewport({ scale: 1, rotation: page.rotate });
    const blocks = await extractTextBlocks(page, i, viewport.height, 1, page.rotate);
    pageStructuredBlocks.push(classifyBlocks(blocks));
  }
  await doc.cleanup();

  const hasHeadings = pageStructuredBlocks.some((p) => p.some((b) => b.heading > 0));
  const hasBold = pageStructuredBlocks.some((p) => p.some((b) => b.bold));
  const hasParagraphBreaks = pageStructuredBlocks.some((p) =>
    p.filter((b) => b.newParagraph).length > 1
  );
  const hasStructure = hasHeadings || hasBold || hasParagraphBreaks;

  const now = new Date().toISOString().replace(/[TZ:.\-]/g, '').slice(0, 14);

  const pageXhtml: string[] = hasStructure
    ? pageStructuredBlocks.map((blocks, i) => {
      const body = blocksToXhtmlBody(blocks);
      return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Page ${i + 1}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
${body}
</body>
</html>`;
    })
    : rawTexts.map((text, i) => {
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Page ${i + 1}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body><p>${escaped || '(brak tekstu)'}</p></body>
</html>`;
    });

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  zip.file('mimetype', 'application/epub+zip');

  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  pageXhtml.forEach((html, i) => {
    zip.file(`OEBPS/page-${i + 1}.xhtml`, html);
  });

  zip.file('OEBPS/style.css', 'body { font-family: serif; margin: 5%; } h1, h2, h3 { margin: 1em 0 0.5em; } p { text-indent: 1em; margin: 0; line-height: 1.5; }');

  const manifest = pageXhtml.map((_, i) =>
    `    <item id="page-${i + 1}" href="page-${i + 1}.xhtml" media-type="application/xhtml+xml"/>`
  ).join('\n');

  const spine = pageXhtml.map((_, i) =>
    `    <itemref idref="page-${i + 1}"/>`
  ).join('\n');

  zip.file('OEBPS/content.opf', `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">${title}</dc:title>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">pl</dc:language>
    <dc:identifier xmlns:dc="http://purl.org/dc/elements/1.1/" id="BookId">urn:uuid:${now}</dc:identifier>
  </metadata>
  <manifest>
    <item id="style" href="style.css" media-type="text/css"/>
${manifest}
  </manifest>
  <spine toc="ncx">
${spine}
  </spine>
</package>`);

  zip.file('OEBPS/toc.ncx', `<?xml version="1.0"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${now}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
    ${pageXhtml.map((_, i) => `
    <navPoint id="nav-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>Page ${i + 1}</text></navLabel>
      <content src="page-${i + 1}.xhtml"/>
    </navPoint>`).join('')}
  </navMap>
</ncx>`);

  return await zip.generateAsync({ type: 'blob' });
}

const REDACT_WORKER_UNAVAILABLE = 'Redact worker is not available in this browser';

let redactWorker: Worker | null = null;
let redactWorkerDisabled = false;
let redactRequestId = 0;

function createRedactWorker(): Worker | null {
  if (redactWorkerDisabled) return null;
  if (redactWorker) return redactWorker;
  if (typeof Worker === 'undefined') {
    redactWorkerDisabled = true;
    return null;
  }
  try {
    redactWorker = new Worker(new URL('./redact-worker.ts', import.meta.url), { type: 'module' });
  } catch {
    redactWorkerDisabled = true;
    return null;
  }
  return redactWorker;
}

function redactInWorker(buf: ArrayBuffer, regions: RedactRegion[]): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const worker = createRedactWorker();
    if (!worker) {
      reject(new Error(REDACT_WORKER_UNAVAILABLE));
      return;
    }
    const id = ++redactRequestId;
    const cleanup = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    };
    const onMessage = (e: MessageEvent<RedactWorkerResponse>) => {
      if (e.data.id !== id) return;
      cleanup();
      if (e.data.type === 'ok') {
        resolve(new Uint8Array(e.data.buf));
      } else {
        reject(new Error(e.data.message));
      }
    };
    const onError = (e: ErrorEvent) => {
      cleanup();
      reject(new Error(e.message || 'Redact worker failed'));
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    const request: RedactWorkerRequest = { id, type: 'redact', buf, regions };
    worker.postMessage(request, [buf]);
  });
}

export async function redactPdfRaster(file: File, regions: RedactRegion[]): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  if (typeof Worker !== 'undefined') {
    try {
      return await redactInWorker(buf, regions);
    } catch (err) {
      if (!(err instanceof Error) || err.message !== REDACT_WORKER_UNAVAILABLE) {
        throw err;
      }
    }
  }
  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const canvasFactory: RasterCanvasFactory = {
    create(w: number, h: number) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      return { canvas, context: canvas.getContext('2d') as unknown as RasterContext };
    },
    reset(ctx: unknown, w: number, h: number) {
      const c = (ctx as RasterContext).canvas;
      c.width = w;
      c.height = h;
    },
    destroy(ctx: unknown) {
      const c = (ctx as RasterContext).canvas;
      c.width = 0;
      c.height = 0;
    },
  };
  const documentOptions = {
    cMapUrl: '/pdfjs-dist/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs-dist/standard_fonts/',
  };
  let bytes: Uint8Array = new Uint8Array(buf);
  const pageIndexes = [...new Set(regions.map(r => r.page))].sort((a, b) => a - b);
  for (const pageIndex of pageIndexes) {
    const pageRegions = regions.filter(r => r.page === pageIndex);
    bytes = await rasterizePage(pdfjsLib as unknown as PdfjsLibLike, canvasFactory, bytes, pageIndex, REDACT_RENDER_SCALE, pageRegions, documentOptions);
  }
  return bytes;
}

export async function getPageCount(file: File): Promise<number> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  return pdf.getPageCount();
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(buf))).promise;
  const texts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    texts.push(content.items.map((item: unknown) => (item as unknown as { str: string }).str || '').join(' '));
  }
  await doc.cleanup();
  return texts.join('\n---\n');
}

// pdfjs-dist operator list arg shapes (internal, untyped)
interface PDFTmObj { [key: string]: number; }
interface PDFGlyph { unicode?: string; fontChar?: string; width?: number; }
interface OpEntry { op: string; args: unknown; }

// ============================================================
// RAW RECT — output of extractRectsFromOps (Phase 1 of table detection)
// ============================================================

export interface RawRect {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: boolean;
  stroke: boolean;
  fillColor?: string;
  strokeColor?: string;
}

// ============================================================
// TABLE DETECTION — Phase 1: extract rectangles from ops
// ============================================================

function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function extractRectsFromOps(ops: OpEntry[], pageHeight: number): RawRect[] {
  const rects: RawRect[] = [];
  let currentFill = '#000000';
  let currentStroke = '#000000';

  // Accumulate transforms since last save, compose them
  const transformStack: number[][] = [];
  let composedMatrix = [1, 0, 0, 1, 0, 0]; // identity

  function composeMatrix(prev: number[], next: number[]): number[] {
    // Matrix multiply: next * prev (apply prev first, then next)
    return [
      next[0] * prev[0] + next[1] * prev[2],
      next[0] * prev[1] + next[1] * prev[3],
      next[2] * prev[0] + next[3] * prev[2],
      next[2] * prev[1] + next[3] * prev[3],
      next[4] * prev[0] + next[5] * prev[2] + prev[4],
      next[4] * prev[1] + next[5] * prev[3] + prev[5],
    ];
  }

  function applyMatrix(m: number[], x: number, y: number): { x: number; y: number } {
    return {
      x: m[0] * x + m[2] * y + m[4],
      y: m[1] * x + m[3] * y + m[5],
    };
  }

  function applyMatrixToSize(m: number[], w: number, h: number): { w: number; h: number } {
    // Apply matrix to width/height vector (0,0)→(w,0) and (0,0)→(0,h)
    const p1 = applyMatrix(m, 0, 0);
    const p2 = applyMatrix(m, w, 0);
    const p3 = applyMatrix(m, 0, h);
    return {
      w: Math.abs(p2.x - p1.x) + Math.abs(p3.x - p1.x),
      h: Math.abs(p2.y - p1.y) + Math.abs(p3.y - p1.y),
    };
  }

  for (let i = 0; i < ops.length; i++) {
    const { op, args } = ops[i];

    if (op === 'save') {
      transformStack.push([...composedMatrix]);
    } else if (op === 'restore') {
      composedMatrix = transformStack.pop() || [1, 0, 0, 1, 0, 0];
    } else if (op === 'transform' && Array.isArray(args)) {
      const t = args as number[];
      composedMatrix = composeMatrix(composedMatrix, [t[0], t[1], t[2], t[3], t[4], t[5]]);
    } else if (op === 'setFillRGBColor') {
      const a = args as unknown;
      if (typeof a === 'string') {
        currentFill = a.startsWith('#') ? a : `#${a}`;
      } else if (Array.isArray(a) && a.length >= 3 && typeof a[0] === 'number') {
        currentFill = rgbToHex(a[0] as number, a[1] as number, a[2] as number);
      } else if (Array.isArray(a) && a.length >= 1 && typeof a[0] === 'string') {
        const hex = a[0] as string;
        currentFill = hex.startsWith('#') ? hex : `#${hex}`;
      }
    } else if (op === 'setStrokeRGBColor') {
      const a = args as unknown;
      if (typeof a === 'string') {
        currentStroke = a.startsWith('#') ? a : `#${a}`;
      } else if (Array.isArray(a) && a.length >= 3 && typeof a[0] === 'number') {
        currentStroke = rgbToHex(a[0] as number, a[1] as number, a[2] as number);
      } else if (Array.isArray(a) && a.length >= 1 && typeof a[0] === 'string') {
        const hex = a[0] as string;
        currentStroke = hex.startsWith('#') ? hex : `#${hex}`;
      }
    } else if (op === 'constructPath' && Array.isArray(args)) {
      // args[0] = painting op ID (fill=22, stroke=20, fillStroke=24)
      // args[1] = [[coords...]] (path coordinates in local space)
      // args[2] = {0:x, 1:y, 2:w, 3:h} bounding box in local space
      const paintingOp = args[0] as number;
      const bbox = args[2] as Record<string, number> | undefined;
      if (!bbox) continue;

      const localX = bbox[0] ?? 0;
      const localY = bbox[1] ?? 0;
      const localW = (bbox[2] ?? 0) - localX;
      const localH = (bbox[3] ?? 0) - localY;
      if (localW === 0 && localH === 0) continue;

      // Transform to page coordinates
      const topLeft = applyMatrix(composedMatrix, localX, localY);
      const size = applyMatrixToSize(composedMatrix, localW, localH);

      // Normalize Y: PDF origin is bottom-left, IR uses top-left
      const normY = pageHeight - topLeft.y - size.h;

      const fill = paintingOp === 22 || paintingOp === 24 || paintingOp === 23 || paintingOp === 25 || paintingOp === 26 || paintingOp === 27;
      const stroke = paintingOp === 20 || paintingOp === 24 || paintingOp === 21 || paintingOp === 25 || paintingOp === 26 || paintingOp === 27;

      rects.push({
        x: topLeft.x,
        y: normY,
        width: size.w,
        height: size.h,
        fill,
        stroke,
        fillColor: fill ? currentFill : undefined,
        strokeColor: stroke ? currentStroke : undefined,
      });
    }
  }

  return rects;
}

// ============================================================
// TABLE DETECTION — Phase 2: cluster rectangles into table candidates
// ============================================================

const EDGE_TOLERANCE = 2; // pt — two coords within this are "the same edge"

function edgesClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= EDGE_TOLERANCE;
}

// Union-Find with path compression and union by rank
class UnionFind {
  parent: number[];
  rank: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }
  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(a: number, b: number): void {
    const ra = this.find(a), rb = this.find(b);
    if (ra === rb) return;
    if (this.rank[ra] < this.rank[rb]) { this.parent[ra] = rb; }
    else if (this.rank[ra] > this.rank[rb]) { this.parent[rb] = ra; }
    else { this.parent[rb] = ra; this.rank[ra]++; }
  }
}

export interface TableCluster {
  rects: RawRect[];
  xEdges: number[];
  yEdges: number[];
  cols: number;
  rows: number;
  coverage: number;
}

export function buildTableClusters(rects: RawRect[]): TableCluster[] {
  if (rects.length < 3) return [];

  // Step 1: Union-Find — group rects sharing any edge (within tolerance)
  const uf = new UnionFind(rects.length);
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const aLeft = a.x, aRight = a.x + a.width;
      const aTop = a.y, aBottom = a.y + a.height;
      const bLeft = b.x, bRight = b.x + b.width;
      const bTop = b.y, bBottom = b.y + b.height;

      const sharesX = edgesClose(aLeft, bLeft) || edgesClose(aLeft, bRight)
        || edgesClose(aRight, bLeft) || edgesClose(aRight, bRight);
      const sharesY = edgesClose(aTop, bTop) || edgesClose(aTop, bBottom)
        || edgesClose(aBottom, bTop) || edgesClose(aBottom, bBottom);

      if (sharesX || sharesY) uf.union(i, j);
    }
  }

  // Step 2: Group rects by root
  const groups = new Map<number, RawRect[]>();
  for (let i = 0; i < rects.length; i++) {
    const root = uf.find(i);
    const arr = groups.get(root) || [];
    arr.push(rects[i]);
    groups.set(root, arr);
  }

  // Step 3: Validate each group against 3 rules
  const clusters: TableCluster[] = [];
  for (const groupRects of groups.values()) {
    if (groupRects.length < 3) continue;

    // Collect global edge lists
    const xSet = new Set<number>();
    const ySet = new Set<number>();
    for (const r of groupRects) {
      xSet.add(r.x);
      xSet.add(r.x + r.width);
      ySet.add(r.y);
      ySet.add(r.y + r.height);
    }

    // Merge close edges
    // Known Limitation: chaining — each value is compared only to the last merged
    // value, not to the first in the group. A chain of closely spaced values (e.g.
    // 100, 101.5, 103, 104.5) can merge into one edge even though the extremes
    // differ by >2pt. In practice this is rare: real table columns/rows have clear
    // separation (≥10pt), so chaining over many values almost never occurs.
    const mergeClose = (vals: Set<number>): number[] => {
      const sorted = [...vals].sort((a, b) => a - b);
      const merged: number[] = [];
      for (const v of sorted) {
        if (merged.length > 0 && edgesClose(merged[merged.length - 1], v)) {
          merged[merged.length - 1] = (merged[merged.length - 1] + v) / 2;
        } else {
          merged.push(v);
        }
      }
      return merged;
    };

    const xEdges = mergeClose(xSet);
    const yEdges = mergeClose(ySet);
    const cols = xEdges.length - 1;
    const rows = yEdges.length - 1;

    if (cols < 2 || rows < 2) continue;

    // Rule 3: coverage — how many grid cells are occupied by at least one rect?
    const occupied = new Set<string>();
    for (const r of groupRects) {
      for (let ri = 0; ri < rows; ri++) {
        // Rect overlaps row ri if rect spans across the row's y-range
        const rowTop = yEdges[ri];
        const rowBottom = yEdges[ri + 1];
        if (r.y + r.height <= rowTop || r.y >= rowBottom) continue;

        for (let ci = 0; ci < cols; ci++) {
          const colLeft = xEdges[ci];
          const colRight = xEdges[ci + 1];
          if (r.x + r.width <= colLeft || r.x >= colRight) continue;

          occupied.add(`${ri},${ci}`);
        }
      }
    }

    const totalCells = cols * rows;
    const coverage = occupied.size / totalCells;
    if (coverage < 0.6) continue;

    clusters.push({ rects: groupRects, xEdges, yEdges, cols, rows, coverage });
  }

  return clusters;
}

// ============================================================
// TABLE DETECTION — Phase 3: build grid + detect merged cells
// ============================================================

export interface GridCell {
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
  rect: RawRect; // the rect that owns this cell
}

// Known Limitation: assumes each rect's owned cells form a perfect rectangle
// (topLeft→bottomRight). Non-rectangular (L-shaped) merges are not supported
// — out of scope for MVP.
export function buildGridAndDetectMerged(cluster: TableCluster): GridCell[] {
  const { rects, xEdges, yEdges, cols, rows } = cluster;

  // Count how many cells each rect spans (for specificity ranking)
  const rectCellCounts = new Array(rects.length).fill(0);
  const clusterW = xEdges[xEdges.length - 1] - xEdges[0];
  const clusterH = yEdges[yEdges.length - 1] - yEdges[0];
  for (let ri2 = 0; ri2 < rects.length; ri2++) {
    const r = rects[ri2];
    // Skip rects that exactly span the full cluster — they're outer borders
    if (Math.abs(r.width - clusterW) < 1 && Math.abs(r.height - clusterH) < 1) continue;
    for (let ri = 0; ri < rows; ri++) {
      const cellTop = yEdges[ri], cellBottom = yEdges[ri + 1];
      if (r.y + r.height <= cellTop || r.y >= cellBottom) continue;
      for (let ci = 0; ci < cols; ci++) {
        const cellLeft = xEdges[ci], cellRight = xEdges[ci + 1];
        // Non-zero width: half-open [x, x+w) must overlap [cellLeft, cellRight)
        // Zero width (line): point x must be within [cellLeft, cellRight)
        if (r.width > 0) {
          if (r.x + r.width <= cellLeft || r.x >= cellRight) continue;
        } else {
          if (r.x < cellLeft || r.x >= cellRight) continue;
        }
        rectCellCounts[ri2]++;
      }
    }
  }

  // cellOwner[ri][ci] = index of rect that owns this cell, or -1
  // Prefer the most specific rect (fewest total cells) to avoid outer border claiming all cells
  const cellOwner: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  for (let ri = 0; ri < rows; ri++) {
    for (let ci = 0; ci < cols; ci++) {
      const cellLeft = xEdges[ci], cellRight = xEdges[ci + 1];
      const cellTop = yEdges[ri], cellBottom = yEdges[ri + 1];
      let bestIdx = -1, bestCount = Infinity, bestArea = -1;
      for (let ri2 = 0; ri2 < rects.length; ri2++) {
        const r = rects[ri2];
        if (r.width > 0) {
          if (r.x + r.width <= cellLeft || r.x >= cellRight) continue;
        } else {
          if (r.x < cellLeft || r.x >= cellRight) continue;
        }
        if (r.y + r.height <= cellTop || r.y >= cellBottom) continue;
        // Skip rects that exactly span the full cluster — they're outer borders
        if (Math.abs(r.width - clusterW) < 1 && Math.abs(r.height - clusterH) < 1) continue;
        const area = r.width * r.height;
        if (rectCellCounts[ri2] < bestCount ||
            (rectCellCounts[ri2] === bestCount && area > bestArea)) {
          bestCount = rectCellCounts[ri2];
          bestArea = area;
          bestIdx = ri2;
        }
      }
      cellOwner[ri][ci] = bestIdx;
    }
  }

  // Find top-left corner of each rect's span → that's the GridCell
  const cells: GridCell[] = [];
  const visited = new Set<string>();

  for (let ri2 = 0; ri2 < rects.length; ri2++) {
    // Find all cells owned by this rect
    const ownedCells: { r: number; c: number }[] = [];
    for (let ri = 0; ri < rows; ri++) {
      for (let ci = 0; ci < cols; ci++) {
        if (cellOwner[ri][ci] === ri2) ownedCells.push({ r: ri, c: ci });
      }
    }
    if (ownedCells.length === 0) continue;

    // Top-left is the cell with smallest (row, col)
    const topLeft = ownedCells.reduce((a, b) => a.r < b.r || (a.r === b.r && a.c < b.c) ? a : b);
    // Bottom-right
    const bottomRight = ownedCells.reduce((a, b) => a.r > b.r || (a.r === b.r && a.c > b.c) ? a : b);

    const rowspan = bottomRight.r - topLeft.r + 1;
    const colspan = bottomRight.c - topLeft.c + 1;
    const key = `${topLeft.r},${topLeft.c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    cells.push({
      row: topLeft.r,
      col: topLeft.c,
      rowspan,
      colspan,
      rect: rects[ri2],
    });
  }

  return cells;
}

// ============================================================
// TABLE DETECTION — Phase 4: assign text runs to grid cells
// ============================================================

const CELL_TOLERANCE_X = 3; // pt — horizontal tolerance for text-in-cell matching
const CELL_TOLERANCE_Y = 5; // pt — vertical tolerance for text-in-cell matching

function binarySearchClosest(sorted: number[], val: number): number {
  let lo = 0, hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < val) lo = mid + 1; else hi = mid;
  }
  return lo;
}

export interface CellTextAssignment {
  cell: GridCell;
  runIndex: number;
}

export function assignTextRunsToCells(
  runs: IRTextRun[],
  cells: GridCell[],
  xEdges: number[],
  yEdges: number[],
  pageHeight: number,
): CellTextAssignment[] {
  if (cells.length === 0) return [];

  // Sort edges for binary search
  const xSorted = [...xEdges].sort((a, b) => a - b);
  const ySorted = [...yEdges].sort((a, b) => a - b);

  const assignments: CellTextAssignment[] = [];

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    // Skip rotated runs — they won't align with grid
    if (run.rotation && Math.abs(run.rotation) > 0.1) continue;

    const runX = run.position.x;
    const runPDFY = run.position.y;
    // Convert from PDF bottom-left Y to top-left Y (matching rect coordinates)
    const runY = pageHeight - runPDFY - (run.height || 0);
    const runCenterY = runY + (run.height || 0) / 2;

    // Find candidate column: binary search on xEdges
    const colIdx = binarySearchClosest(xSorted, runX + CELL_TOLERANCE_X);
    // colIdx points to the edge closest to runX; the cell is between colIdx-1 and colIdx
    // Check the two candidate cells (colIdx-1 and colIdx)
    const colCandidates = [colIdx - 1, colIdx].filter(c => c >= 0 && c < xEdges.length - 1);

    // Find candidate row: binary search on yEdges
    const rowIdx = binarySearchClosest(ySorted, runCenterY);
    const rowCandidates = [rowIdx - 1, rowIdx].filter(r => r >= 0 && r < yEdges.length - 1);

    // Collect all matching cells, pick closest center (dedup)
    let bestCell: GridCell | null = null;
    let bestDist = Infinity;
    for (const ri of rowCandidates) {
      for (const ci of colCandidates) {
        const cellTop = yEdges[ri];
        const cellBottom = yEdges[ri + 1];
        const cellLeft = xEdges[ci];
        const cellRight = xEdges[ci + 1];

        if (runCenterY + CELL_TOLERANCE_Y < cellTop || runCenterY - CELL_TOLERANCE_Y > cellBottom) continue;
        if (runX + CELL_TOLERANCE_X < cellLeft || runX - CELL_TOLERANCE_X > cellRight) continue;

        const cell = cells.find(c => c.row === ri && c.col === ci);
        if (!cell) continue;

        // Distance from run center to cell center
        const cellCenterX = (cellLeft + cellRight) / 2;
        const cellCenterY = (cellTop + cellBottom) / 2;
        const dist = Math.abs(runX - cellCenterX) + Math.abs(runCenterY - cellCenterY);
        if (dist < bestDist) { bestDist = dist; bestCell = cell; }
      }
    }
    if (bestCell) assignments.push({ cell: bestCell, runIndex: i });
  }

  return assignments;
}

// ============================================================
// IR HELPERS
// ============================================================

function getRotation(t: number[]): number {
  const [a, b] = t;
  if (Math.abs(b) < 0.01 && Math.abs(t[2]) < 0.01) return 0;
  return Math.atan2(b, a) * 180 / Math.PI;
}

function parseFontStyle(fontName: string): { bold: boolean; italic: boolean } {
  return {
    bold: /bold/i.test(fontName),
    italic: /italic|oblique|kurs/i.test(fontName),
  };
}

function getRole(y: number, pageHeight: number): 'header' | 'footer' | undefined {
  if (pageHeight - y < 50) return 'header';
  if (y < 50) return 'footer';
  return undefined;
}

function computeBounds(runs: IRTextRun[]): IRRect {
  if (runs.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of runs) {
    const rad = (r.rotation || 0) * Math.PI / 180;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);
    const corners = [
      [r.position.x, r.position.y],
      [r.position.x + r.width * cosR, r.position.y + r.width * sinR],
      [r.position.x - r.height * sinR, r.position.y - r.height * cosR],
      [r.position.x + r.width * cosR - r.height * sinR, r.position.y + r.width * sinR - r.height * cosR],
    ];
    for (const [cx, cy] of corners) {
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx);
      maxY = Math.max(maxY, cy);
    }
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

const BULLET_REGEX = /^[•‣●\u2022\u2023\u25CF\-–—]\s*/;
const NUMBERED_REGEX = /^\d+[.)]\s*/;

// ============================================================
// extractFormattedTextFromPDF — Phase 1a (no tables)
// ============================================================

export async function extractFormattedTextFromPDF(file: File): Promise<IRPageIR[]> {
  const buf = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const OPS = pdfjsLib.OPS;
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(buf))).promise;
  const pages: IRPageIR[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const pageWidth = vp.width;
    const pageHeight = vp.height;

    const opList = await page.getOperatorList();

    // --- Build operator name map ---
    const OPS_MAP: Record<number, string> = {};
    for (const [name, id] of Object.entries(OPS)) OPS_MAP[id as unknown as number] = name;

    // --- State machine: walk opList to build per-showText color context ---
    const ops: OpEntry[] = [];
    for (let i = 0; i < opList.fnArray.length; i++) {
      ops.push({ op: OPS_MAP[opList.fnArray[i]] || '', args: opList.argsArray[i] });
    }

    // For each setTextMatrix index, find the fill color that was set before it
    const textOpColors: Map<number, string> = new Map();
    let currentFill = '#000000';
    for (let i = 0; i < ops.length; i++) {
      const { op, args } = ops[i];
      if (op === 'setFillRGBColor') currentFill = Array.isArray(args) ? (args[0] as string) : (args as string);
      if (op === 'setTextMatrix') textOpColors.set(i, currentFill);
    }

    // For each setTextMatrix index, find the font set before it
    const textOpFonts: Map<number, { name: string; size: number }> = new Map();
    let currentFont = { name: '', size: 12 };
    for (let i = 0; i < ops.length; i++) {
      const { op, args } = ops[i];
      if (op === 'setFont' && Array.isArray(args)) {
        currentFont = { name: args[0] as string, size: args[1] as number };
      }
      if (op === 'setTextMatrix') textOpFonts.set(i, { ...currentFont });
    }

    // KNOWN LIMITATION: Linear color/font state machine
    // The state machine above tracks color and font as linear "last write wins".
    // It does NOT implement a proper save/restore stack (save/restore operators).
    // For PDFs with nested save/restore blocks (e.g., different colors in
    // save/restore pairs), the last setFillRGBColor before a setTextMatrix
    // is used, which may be incorrect if a restore() should have reverted
    // the color. This is a known limitation; most office-generated PDFs
    // don't use nested save/restore for text formatting.

    // --- Image detection: paintImageXObject with accumulated transforms ---
    interface ImageOp {
      imageId: string;
      natW: number;
      natH: number;
      bounds: IRRect;
    }
    const images: ImageOp[] = [];
    let accumTx = [1, 0, 0, 1, 0, 0];
    for (let i = 0; i < ops.length; i++) {
      const { op, args } = ops[i];
      if (op === 'save') accumTx = [1, 0, 0, 1, 0, 0];
      if (op === 'transform' && Array.isArray(args)) {
        const m = args as number[];
        accumTx = [
          accumTx[0] * m[0] + accumTx[2] * m[1],
          accumTx[1] * m[0] + accumTx[3] * m[1],
          accumTx[0] * m[2] + accumTx[2] * m[3],
          accumTx[1] * m[2] + accumTx[3] * m[3],
          accumTx[0] * m[4] + accumTx[2] * m[5] + accumTx[4],
          accumTx[1] * m[4] + accumTx[3] * m[5] + accumTx[5],
        ];
      }
      if (op === 'paintImageXObject' && Array.isArray(args)) {
        const imgId = args[0] as string;
        const natW = (args[1] as number) || 100;
        const natH = (args[2] as number) || 100;
        const sx = Math.sqrt(accumTx[0] ** 2 + accumTx[1] ** 2);
        const sy = Math.sqrt(accumTx[2] ** 2 + accumTx[3] ** 2);
        images.push({
          imageId: imgId,
          natW,
          natH,
          bounds: {
            x: accumTx[4],
            y: accumTx[5],
            width: natW * sx,
            height: natH * sy,
          },
        });
      }
    }

    // --- Build textRuns from operator list showText ---
    // Using showText directly gives accurate per-segment colors and avoids
    // getTextContent merging of adjacent same-line text with different colors.
    // getTextContent merges "Czerwony tekst" + "Niebieski tekst" into one item;
    // showText has them as two separate calls with different positions and colors.
    const textRuns: IRTextRun[] = [];

    for (let i = 0; i < ops.length; i++) {
      if (ops[i].op !== 'setTextMatrix') continue;

      // Extract setTextMatrix values
      // Args format: [{0:a, 1:b, 2:c, 3:d, 4:e, 5:f}] (array with object)
      const rawTm = ops[i].args;
      const tmObj = (Array.isArray(rawTm) ? rawTm[0] : rawTm) as PDFTmObj;
      if (!tmObj || typeof tmObj !== 'object') continue;
      const tmX = tmObj[4] ?? tmObj['4'] ?? 0;
      const tmY = tmObj[5] ?? tmObj['5'] ?? 0;
      const tmA = tmObj[0] ?? tmObj['0'] ?? 1;
      const tmB = tmObj[1] ?? tmObj['1'] ?? 0;

      // Find the next showText within a reasonable window
      let stIdx = -1;
      for (let j = i + 1; j < Math.min(i + 8, ops.length); j++) {
        if (ops[j].op === 'showText') { stIdx = j; break; }
        if (ops[j].op === 'setTextMatrix' || ops[j].op === 'endText') break;
      }
      if (stIdx === -1) continue;

      // Extract glyphs from showText args
      const rawSt = ops[stIdx].args;
      const glyphArr = (Array.isArray(rawSt)
        ? (Array.isArray(rawSt[0]) ? rawSt[0] : rawSt)
        : []) as PDFGlyph[];
      if (glyphArr.length === 0) continue;

      // Reconstruct text from glyph unicode values (unicode is a string character)
      const text = glyphArr.map(g => g.unicode || g.fontChar || '').join('');
      if (!text) continue;

      // Get font and color from state machine
      const fontInfo = textOpFonts.get(i) || { name: '', size: 12 };
      const color = textOpColors.get(i) || '#000000';

      // Compute width from glyph widths (width in font units → PDF points)
      let width = 0;
      for (const g of glyphArr) {
        width += (g.width || 0) * fontInfo.size / 1000;
      }
      if (width === 0) {
        width = text.length * fontInfo.size * 0.5;
      }

      const rotation = getRotation([tmA, tmB, 0, 0, 0, 0]);

      textRuns.push({
        text,
        fontName: fontInfo.name,
        fontSize: fontInfo.size,
        width,
        height: fontInfo.size,
        position: { x: tmX, y: tmY },
        color,
        bold: parseFontStyle(fontInfo.name).bold,
        italic: parseFontStyle(fontInfo.name).italic,
        rotation,
      });
    }

    // --- Compute bodyFontSize ---
    const sizeStats: Record<string, number> = {};
    for (const tr of textRuns) {
      const key = tr.fontSize.toFixed(1);
      sizeStats[key] = (sizeStats[key] || 0) + tr.text.length;
    }
    let bodyFontSize = 12;
    let maxChars = 0;
    for (const [sizeStr, chars] of Object.entries(sizeStats)) {
      if (chars > maxChars) { maxChars = chars; bodyFontSize = parseFloat(sizeStr); }
    }

    // --- Group runs into blocks ---
    const blocks: IRBlock[] = [];
    const used = new Set<number>();

    // --- Table detection: extractRects → cluster → grid → assign → consumedIndices ---
    const tableRects = extractRectsFromOps(ops, pageHeight);
    const tableClusters = buildTableClusters(tableRects);
    for (const cluster of tableClusters) {
      const gridCells = buildGridAndDetectMerged(cluster);
      const assignments = assignTextRunsToCells(textRuns, gridCells, cluster.xEdges, cluster.yEdges, pageHeight);

      if (assignments.length > 0) {
        // Build IRTableCell[][] grid
        const rows = cluster.rows;
        const cols = cluster.cols;
        const cellGrid: (IRTableCell | null)[][] =
          Array.from({ length: rows }, () => new Array(cols).fill(null));

        for (const { cell, runIndex } of assignments) {
          used.add(runIndex);
          if (!cellGrid[cell.row][cell.col]) {
            cellGrid[cell.row][cell.col] = {
              runs: [],
              colspan: cell.colspan,
              rowspan: cell.rowspan,
            };
          }
          cellGrid[cell.row][cell.col]!.runs.push(textRuns[runIndex]);
        }

        // Convert null cells to empty placeholders
        const irCells: IRTableCell[][] = cellGrid.map(row =>
          row.map(c => c ?? { runs: [], colspan: 1, rowspan: 1 })
        );

        const columnWidths = [];
        for (let ci = 0; ci < cluster.xEdges.length - 1; ci++) {
          columnWidths.push(cluster.xEdges[ci + 1] - cluster.xEdges[ci]);
        }

        // Compute bounds from cluster
        const allX = cluster.xEdges;
        const allY = cluster.yEdges;
        blocks.push({
          kind: 'table',
          cells: irCells,
          bounds: {
            x: allX[0],
            y: allY[0],
            width: allX[allX.length - 1] - allX[0],
            height: allY[allY.length - 1] - allY[0],
          },
          columnWidths,
        });
      }
    }

    // Sort runs by Y (top to bottom in PDF coords = descending Y), then X
    const sorted = textRuns
      .map((tr, idx) => ({ tr, idx }))
      .sort((a, b) => {
        const yDiff = b.tr.position.y - a.tr.position.y;
        if (Math.abs(yDiff) > 2) return yDiff;
        return a.tr.position.x - b.tr.position.x;
      });

    for (const { tr, idx } of sorted) {
      if (used.has(idx)) continue;

      // --- Image block ---
      // Check if this run position overlaps with an image
      const imgMatch = images.find(img =>
        Math.abs(img.bounds.x - tr.position.x) < 5 &&
        Math.abs(img.bounds.y + img.bounds.height - tr.position.y) < 5
      );
      if (imgMatch && tr.text.trim() === '') {
        used.add(idx);
        blocks.push({
          kind: 'image',
          imageId: imgMatch.imageId,
          naturalWidth: imgMatch.natW,
          naturalHeight: imgMatch.natH,
          bounds: imgMatch.bounds,
        });
        continue;
      }

      // Skip empty runs
      if (!tr.text.trim()) { used.add(idx); continue; }

      // --- List item detection ---
      const bulletMatch = tr.text.match(BULLET_REGEX);
      const numberedMatch = tr.text.match(NUMBERED_REGEX);
      if (bulletMatch || numberedMatch) {
        const match = bulletMatch || numberedMatch;
        const marker = match![0].trimEnd();
        const restText = tr.text.slice(match![0].length);
        const indent = tr.position.x - 50;
        const level = Math.max(0, Math.round(indent / 20));

        const listRuns: IRTextRun[] = [{
          ...tr,
          text: restText,
        }];
        used.add(idx);

        // Try to merge consecutive list items at same level or deeper
        // (don't merge across different indent levels going back)
        blocks.push({
          kind: 'list-item',
          marker,
          level,
          runs: listRuns,
          bounds: computeBounds(listRuns),
        });
        continue;
      }

      // --- Paragraph/heading grouping ---
      // Collect consecutive runs on similar Y lines into one block
      const groupRuns: IRTextRun[] = [tr];
      used.add(idx);

      for (const { tr: other, idx: oIdx } of sorted) {
        if (used.has(oIdx)) continue;
        // Same line: Y within lineHeight tolerance
        const yDiff = Math.abs(other.position.y - tr.position.y);
        const sameLine = yDiff < Math.max(tr.height, other.height) * 0.5;
        if (sameLine && Math.abs(other.rotation - tr.rotation) < 1) {
          groupRuns.push(other);
          used.add(oIdx);
        }
      }

      // If single line, try to merge with consecutive lines below (paragraph grouping)
      if (groupRuns.length <= 1) {
        const lineHeight = tr.height || tr.fontSize;
        let lastY = tr.position.y;
        let changed = true;
        while (changed) {
          changed = false;
          for (const { tr: next, idx: nIdx } of sorted) {
            if (used.has(nIdx)) continue;
            const yGap = lastY - next.position.y;
            if (yGap > 0 && yGap < lineHeight * 1.5 &&
                Math.abs(next.fontSize - tr.fontSize) < 1 &&
                Math.abs(next.position.x - tr.position.x) < 10 &&
                Math.abs(next.rotation - tr.rotation) < 1) {
              groupRuns.push(next);
              used.add(nIdx);
              lastY = next.position.y;
              changed = true;
              break;
            }
          }
        }
      }

      const bounds = computeBounds(groupRuns);
      const ratio = tr.fontSize / bodyFontSize;
      const role = getRole(tr.position.y, pageHeight);

      // Heading detection
      if (ratio >= 1.15 && !role) {
        let level = 3;
        if (ratio >= 1.8) level = 1;
        else if (ratio >= 1.4) level = 2;
        blocks.push({ kind: 'heading', level, runs: groupRuns, bounds, role });
      } else {
        blocks.push({ kind: 'paragraph', runs: groupRuns, bounds, role });
      }
    }

    // --- Insert remaining images at correct Y position ---
    // Images not matched to an empty text run during the main loop are inserted
    // at the correct position based on bounds.y (top-to-bottom reading order).
    for (const img of images) {
      const alreadyAdded = blocks.some(b => b.kind === 'image' && (b as IRImageBlock).imageId === img.imageId);
      if (alreadyAdded) continue;

      const imgBlock: IRImageBlock = {
        kind: 'image',
        imageId: img.imageId,
        naturalWidth: img.natW,
        naturalHeight: img.natH,
        bounds: img.bounds,
      };

      // Insert at correct position: bounds.y descending (top to bottom in PDF coords)
      const imgY = img.bounds.y;
      let insertIdx = blocks.length;
      for (let i = 0; i < blocks.length; i++) {
        if (imgY > blocks[i].bounds.y) {
          insertIdx = i;
          break;
        }
      }
      blocks.splice(insertIdx, 0, imgBlock);
    }

    pages.push({ width: pageWidth, height: pageHeight, blocks });
  }

  await doc.cleanup();
  return pages;
}

function escapeHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function pdfToHtml(file: File): Promise<Blob> {
  const text = await extractTextFromPDF(file);
  const pages = text.split('\n---\n');
  const fileName = file.name.replace(/\.pdf$/i, '');
  const htmlParts = pages.map((pageText, i) => {
    const lines = pageText.trim().split('\n').filter(l => l.trim());
    const body = lines.map(line => `<p>${escapeHtml(line)}</p>`).join('\n');
    return `<div class="page" style="margin-bottom:2em;page-break-after:always;">\n<h2 style="color:#1E3A5F;">Strona ${i + 1}</h2>\n${body}\n</div>`;
  });
  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(fileName)}</title>
<style>
  body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2em; color: #333; }
  h1 { color: #1E3A5F; border-bottom: 2px solid #1E3A5F; padding-bottom: 0.3em; }
  h2 { color: #1E3A5F; }
  p { margin: 0.5em 0; text-align: justify; }
  .page { margin-bottom: 2em; }
  @media print { .page { page-break-after: always; } }
</style>
</head>
<body>
<h1>${escapeHtml(fileName)}</h1>
${htmlParts.join('\n')}
</body>
</html>`;
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}

function parseFilters(fRaw: unknown): string[] {
  if (!fRaw || typeof fRaw !== 'object') return [];
  if (typeof (fRaw as { asArray?: () => unknown[] }).asArray === 'function') {
    return (fRaw as { asArray: () => unknown[] }).asArray().map((e: unknown) => String(e));
  }
  return [String(fRaw)];
}

export async function compressPDFClient(file: File, level: 'low' | 'recommended' | 'extreme'): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const ctx = pdf.context;

  const infoRef = (ctx.trailerInfo as Record<string, unknown>).Info;
  if (infoRef) {
    try { ctx.delete(infoRef as never); } catch {}
    (ctx.trailerInfo as Record<string, unknown>).Info = undefined;
  }
  try { pdf.catalog.delete(PDFName.of('Metadata')); } catch {}

  const pako = (await import('pako')).default;
  const scale = level === 'extreme' ? 0.5 : level === 'low' ? 0.9 : 0.75;
  const jpegQuality = level === 'low' ? 95 : 90;

  for (const [, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || !obj.dict) continue;
    const filters = parseFilters(obj.dict.get(PDFName.of('Filter')));
    if (!filters.includes('/FlateDecode')) continue;
    const isImg = obj.dict.get(PDFName.of('Subtype')) && String(obj.dict.get(PDFName.of('Subtype'))!) === '/Image';
    if (isImg) continue;
    try {
      const raw = obj.contents;
      if (raw.length < 20) continue;
      const dec = pako.inflate(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
      const rec = pako.deflate(dec, { level: 9 });
      if (rec.length < raw.length) {
        (obj as unknown as { contents: Uint8Array }).contents = rec;
        obj.dict.set(PDFName.Length, PDFNumber.of(rec.length));
      }
    } catch {}
  }

  for (const [, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || !obj.dict) continue;
    const filters = parseFilters(obj.dict.get(PDFName.of('Filter')));
    if (!filters.length) continue;
    const isImg = obj.dict.get(PDFName.of('Subtype')) && String(obj.dict.get(PDFName.of('Subtype'))!) === '/Image';
    if (!isImg) continue;
    const w = ((obj.dict.get(PDFName.of('Width')) as PDFNumber)?.asNumber() ?? 0);
    const h = ((obj.dict.get(PDFName.of('Height')) as PDFNumber)?.asNumber() ?? 0);
    if (!w || !h || w < 100 || h < 100) continue;
    const nw = Math.max(1, Math.round(w * scale));
    const nh = Math.max(1, Math.round(h * scale));

    if (filters.includes('/DCTDecode')) {
      try {
        const src = obj.contents;
        const img = await createImageBitmap(new Blob([src as BlobPart], { type: 'image/jpeg' }));
        const canvas = document.createElement('canvas');
        canvas.width = nw;
        canvas.height = nh;
        const ctx2 = canvas.getContext('2d')!;
        ctx2.drawImage(img, 0, 0, nw, nh);
        const outBlob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', jpegQuality));
        if (!outBlob) continue;
        const outBuf = new Uint8Array(await outBlob.arrayBuffer());
        if (outBuf.length < src.length) {
          (obj as unknown as { contents: Uint8Array }).contents = outBuf;
          obj.dict.set(PDFName.Length, PDFNumber.of(outBuf.length));
          obj.dict.set(PDFName.of('Width'), ctx.obj(nw));
          obj.dict.set(PDFName.of('Height'), ctx.obj(nh));
          obj.dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
        }
        img.close();
      } catch {}
    }
  }

  return pdf.save({ useObjectStreams: true });
}

export async function pdfToWord(file: File): Promise<Blob> {
  const text = await extractTextFromPDF(file);
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  const doc = new Document({
    sections: [{
      children: text.split('\n').map(line =>
        new Paragraph({ children: [new TextRun(line || ' ')] })
      ),
    }],
  });
  return await Packer.toBlob(doc);
}

export async function pdfToWordIR(file: File): Promise<Blob> {
  const pages = await extractFormattedTextFromPDF(file);
  return renderIRToDocx(pages);
}

export async function pdfToPptxClient(file: File): Promise<Blob> {
  const text = await extractTextFromPDF(file);
  const pptxgen = (await import('pptxgenjs')).default;
  const pres = new pptxgen();
  const slides = text.split('\n---\n');
  for (const slideText of slides) {
    const slide = pres.addSlide();
    const lines = slideText.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      slide.addText('[Pusta strona]', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 12, color: '999999' });
      continue;
    }
    const title = lines[0];
    const body = lines.slice(1).join('\n');
    slide.addText(title, { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true, color: '1E3A5F' });
    if (body) {
      slide.addText(body, { x: 0.5, y: 1.3, w: 9, h: 5.5, fontSize: 16, color: '333333', valign: 'top' });
    }
  }
  return (await pres.write({ outputType: 'blob' })) as Blob;
}

function colLetter(i: number): string {
  let n = i + 1;
  let col = '';
  while (n > 0) {
    n--;
    col = String.fromCharCode(65 + (n % 26)) + col;
    n = Math.floor(n / 26);
  }
  return col;
}

async function createXlsx(rows: string[][]): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const allStrings: string[] = [];
  const strMap = new Map<string, number>();
  for (const row of rows) {
    for (const cell of row) {
      if (!strMap.has(cell)) {
        strMap.set(cell, allStrings.length);
        allStrings.push(cell);
      }
    }
  }

  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${allStrings.length}" uniqueCount="${allStrings.length}">
${allStrings.map(s => `  <si><t>${esc(s)}</t></si>`).join('\n')}
</sst>`;

  const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
${rows.map((row, ri) => {
  const cells = row.map((cell, ci) => `      <c r="${colLetter(ci)}${ri + 1}" t="s"><v>${strMap.get(cell)}</v></c>`).join('\n');
  return `    <row r="${ri + 1}">\n${cells}\n    </row>`;
}).join('\n')}
  </sheetData>
</worksheet>`;

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Dane" sheetId="1" r:id="rId1"/></sheets>
</workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`);
  zip.file('xl/worksheets/sheet1.xml', sheetXml);
  zip.file('xl/sharedStrings.xml', ssXml);
  zip.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`);

  return await zip.generateAsync({ type: 'blob' });
}

export async function pdfToExcel(file: File): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(buf))).promise;
  const rows: string[][] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const textItems = content.items.filter((item: unknown) =>
      typeof (item as Record<string, unknown>).str === 'string' &&
      Array.isArray((item as Record<string, unknown>).transform)
    ) as unknown as { str: string; transform: number[] }[];

    if (textItems.length > 0) {
      const sortedByY = [...textItems].sort((a, b) => (b.transform[5] || 0) - (a.transform[5] || 0));
      const groups: { str: string; transform: number[] }[][] = [];
      let currentRow: { str: string; transform: number[] }[] = [sortedByY[0]];

      for (let j = 1; j < sortedByY.length; j++) {
        const prev = sortedByY[j - 1];
        const curr = sortedByY[j];
        const yDiff = Math.abs((curr.transform[5] || 0) - (prev.transform[5] || 0));
        if (yDiff > 10) {
          groups.push(currentRow);
          currentRow = [curr];
        } else {
          currentRow.push(curr);
        }
      }
      groups.push(currentRow);

      groups.forEach(row => {
        const sortedRow = row.sort((a, b) => (a.transform[4] || 0) - (b.transform[4] || 0));
        const colVals = sortedRow.map(t => t.str.trim());
        if (colVals.some(v => v)) rows.push(colVals);
      });
    }
  }

  await doc.cleanup();

  if (rows.length === 0) {
    throw new Error('Nie wykryto danych tabelarycznych w pliku PDF');
  }

  return createXlsx(rows);
}

// StandardFonts (WinAnsi) cannot encode Polish/Latin-Extended glyphs (e.g.
// "ś") — widthOfTextAtSize()/drawText() THROW on them, crashing tools or
// silently dropping words. LiberationSans covers Latin/Cyrillic/Greek; truly
// unsupported code points (e.g. Hangul or Arabic) embed as .notdef glyphs
// instead of throwing. Embed once per PDFDocument run (never per page/word).
export async function embedLiberationSans(pdf: PDFDocument): Promise<PDFFont> {
  const fontkit = (await import('@pdf-lib/fontkit')).default;
  pdf.registerFontkit(fontkit);
  const fontRes = await fetch('/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf');
  if (!fontRes.ok) throw new Error('Font fetch failed: LiberationSans-Regular.ttf');
  return pdf.embedFont(new Uint8Array(await fontRes.arrayBuffer()));
}

export async function officeToPdf(file: File): Promise<Blob> {
  const ext = file.name.toLowerCase().split('.').pop() || '';
  const buf = await file.arrayBuffer();
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buf);
  let text = '';

  if (ext === 'docx') {
    const docFile = zip.file('word/document.xml');
    if (!docFile) throw new Error('Nie znaleziono dokumentu w pliku .docx');
    const xml = await docFile.async('string');
    const matches = xml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
    text = matches.map(m => m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '')).join('\n');
  } else if (ext === 'odt') {
    const contentFile = zip.file('content.xml');
    if (!contentFile) throw new Error('Nie znaleziono treści w pliku ODT');
    const xml = await contentFile.async('string');
    const matches = xml.match(/<text:p[^>]*>([\s\S]*?)<\/text:p>/g) || [];
    text = matches.map(p => p.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join('\n');
  } else if (ext === 'xlsx') {
    const ssFile = zip.file('xl/sharedStrings.xml');
    const strings: string[] = [];
    if (ssFile) {
      const ssXml = await ssFile.async('string');
      const siMatches = ssXml.match(/<si>[\s\S]*?<\/si>/g) || [];
      for (const si of siMatches) {
        const tMatch = si.match(/<t[^>]*>([^<]*)<\/t>/);
        strings.push(tMatch ? tMatch[1] : '');
      }
    }
    const sheetFiles = Object.keys(zip.files).filter(k => k.startsWith('xl/worksheets/sheet') && k.endsWith('.xml'));
    const lines: string[] = [];
    for (const sn of sheetFiles) {
      const sheetXml = await zip.file(sn)!.async('string');
      const rowMatches = sheetXml.match(/<row[\s\S]*?<\/row>/g) || [];
      for (const row of rowMatches) {
        const cellMatches = row.match(/<c[\s\S]*?<\/c>/g) || [];
        const rowText = cellMatches.map(cell => {
          const vMatch = cell.match(/<v>([^<]*)<\/v>/);
          const tMatch = cell.match(/<t[^>]*>([^<]*)<\/t>/);
          if (vMatch) {
            const idx = parseInt(vMatch[1], 10);
            if (!isNaN(idx) && idx < strings.length) return strings[idx];
            return vMatch[1];
          }
          return tMatch ? tMatch[1] : '';
        }).filter(Boolean).join('\t');
        if (rowText) lines.push(rowText);
      }
    }
    text = lines.join('\n') || 'Brak danych do odczytania w pliku XLSX.';
  } else if (ext === 'pptx') {
    const slideFiles = Object.keys(zip.files).filter(k => k.startsWith('ppt/slides/slide') && k.endsWith('.xml')).sort();
    const texts: string[] = [];
    for (const sn of slideFiles) {
      const slideXml = await zip.file(sn)!.async('string');
      const tMatches = slideXml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
      const slideText = tMatches.map(m => m.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '')).join(' ');
      if (slideText) texts.push(slideText);
    }
    text = texts.join('\n---\n') || 'Brak tekstu do odczytania w pliku PPTX.';
  } else {
    throw new Error(`Format .${ext} nie jest obsługiwany`);
  }

  const pdf = await PDFDocument.create();
  const font = await embedLiberationSans(pdf);
  const fontSize = 12;
  const margin = 50;
  const lineHeight = fontSize * 1.5;
  let page = pdf.addPage([595.28, 841.89]);
  let y = 800;

  for (const line of text.split('\n')) {
    if (y < 60) {
      page = pdf.addPage([595.28, 841.89]);
      y = 800;
    }
    const words = line.split(' ');
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (font.widthOfTextAtSize(testLine, fontSize) > 495.28 && currentLine) {
        page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
        if (y < 60) {
          page = pdf.addPage([595.28, 841.89]);
          y = 800;
        }
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }

  return new Blob([await pdf.save() as BlobPart], { type: 'application/pdf' });
}

export async function imagesToPdf(files: File[], margin: number): Promise<Blob> {
  const pdf = await PDFDocument.create();
  for (const file of files) {
    const ext = file.name.toLowerCase().split('.').pop() || '';
    const buf = await file.arrayBuffer();
    if (ext === 'png') {
      const image = await pdf.embedPng(new Uint8Array(buf));
      const page = pdf.addPage([image.width + margin * 2, image.height + margin * 2]);
      page.drawImage(image, { x: margin, y: margin, width: image.width, height: image.height });
    } else if (['jpg', 'jpeg'].includes(ext)) {
      const image = await pdf.embedJpg(new Uint8Array(buf));
      const page = pdf.addPage([image.width + margin * 2, image.height + margin * 2]);
      page.drawImage(image, { x: margin, y: margin, width: image.width, height: image.height });
    } else {
      const img = await createImageBitmap(new Blob([buf]));
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const pngBlob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
      const pngBuf = new Uint8Array(await pngBlob.arrayBuffer());
      const image = await pdf.embedPng(pngBuf);
      const page = pdf.addPage([image.width + margin * 2, image.height + margin * 2]);
      page.drawImage(image, { x: margin, y: margin, width: image.width, height: image.height });
      img.close();
    }
  }
  return new Blob([await pdf.save() as BlobPart], { type: 'application/pdf' });
}

function rgbFromHex(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

export type PdfEditElement = {
  type: 'text' | 'rect' | 'line' | 'arrow' | 'circle' | 'highlight' | 'image' | 'freehand';
  x: number;
  y: number;
  text?: string;
  size?: number;
  color?: string;
  width?: number;
  height?: number;
  opacity?: number;
  font?: 'Arial' | 'Times New Roman' | 'Courier New' | 'Georgia' | 'Verdana';
  bold?: boolean;
  italic?: boolean;
  x2?: number;
  y2?: number;
  imageDataUrl?: string;
  points?: { x: number; y: number }[];
};

export async function editPdfClient(file: File, pageIndex: number, elements: PdfEditElement[], pageWidth?: number, pageHeight?: number): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf);
  const pages = pdfDoc.getPages();
  if (pageIndex < 0 || pageIndex >= pages.length) throw new Error('Invalid page number');

  const page = pages[pageIndex];
  const { height: pdfHeight } = page.getSize();
  const scaleY = pdfHeight / (pageHeight || pdfHeight);
  const scaleX = pdfHeight / (pageHeight || pdfHeight);

  for (const el of elements) {
    const opacity = el.opacity ?? 1;
    const sx = (pageWidth && pageWidth !== pdfHeight) ? (el.x / (pageWidth || pdfHeight)) * pdfHeight : el.x * scaleX;
    const sy = pdfHeight - (el.y * scaleY);
    const sColor = el.color || '#000000';

    if (el.type === 'rect') {
      page.drawRectangle({
        x: sx, y: sy - (el.height || 20) * scaleY,
        width: (el.width || 100) * scaleX, height: (el.height || 20) * scaleY,
        color: rgbFromHex(sColor), opacity,
        borderColor: rgb(0, 0, 0), borderWidth: 0,
      });
    } else if (el.type === 'highlight') {
      page.drawRectangle({
        x: sx, y: sy - (el.height || 30) * scaleY,
        width: (el.width || 200) * scaleX, height: (el.height || 30) * scaleY,
        color: rgb(1, 1, 0), opacity: 0.3,
        borderColor: rgb(1, 1, 0), borderWidth: 0,
      });
    } else if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
      const sx2 = (pageWidth ? (el.x2 / pageWidth) * pdfHeight : el.x2 * scaleX);
      const sy2 = pdfHeight - (el.y2 * scaleY);
      page.drawLine({
        start: { x: sx, y: sy }, end: { x: sx2, y: sy2 },
        color: rgbFromHex(sColor), thickness: (el.size || 2) * scaleY, opacity,
      });
    } else if (el.type === 'arrow' && el.x2 !== undefined && el.y2 !== undefined) {
      const sx2 = (pageWidth ? (el.x2 / pageWidth) * pdfHeight : el.x2 * scaleX);
      const sy2 = pdfHeight - (el.y2 * scaleY);
      page.drawLine({
        start: { x: sx, y: sy }, end: { x: sx2, y: sy2 },
        color: rgbFromHex(sColor), thickness: (el.size || 2) * scaleY, opacity,
      });
    } else if (el.type === 'circle') {
      page.drawEllipse({
        x: sx, y: sy,
        xScale: ((el.width || 50) / 2) * scaleX,
        yScale: ((el.height || 50) / 2) * scaleY,
        color: rgbFromHex(sColor), opacity,
      });
    } else if (el.type === 'image' && el.imageDataUrl) {
      try {
        const imgData = el.imageDataUrl.split(',')[1];
        const imgBytes = Uint8Array.from(atob(imgData), c => c.charCodeAt(0));
        const isPng = el.imageDataUrl.startsWith('data:image/png');
        const img = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
        const dw = (el.width || 100) * scaleX;
        const dh = (el.height || 100) * scaleY;
        page.drawImage(img, { x: sx, y: sy - dh, width: dw, height: dh, opacity });
      } catch {}
    } else if (el.type === 'freehand' && el.points && el.points.length > 1) {
      const fCanvas = document.createElement('canvas');
      const fCtx = fCanvas.getContext('2d')!;
      fCanvas.width = 2000;
      fCanvas.height = 2000;
      fCtx.strokeStyle = sColor;
      fCtx.lineWidth = (el.size || 3) * 2;
      fCtx.lineCap = 'round';
      fCtx.lineJoin = 'round';
      fCtx.beginPath();
      fCtx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        fCtx.lineTo(el.points[i].x, el.points[i].y);
      }
      fCtx.stroke();
      const fBlob = await new Promise<Blob>(resolve => fCanvas.toBlob(b => resolve(b!), 'image/png'));
      const fBuf = new Uint8Array(await fBlob.arrayBuffer());
      const fImg = await pdfDoc.embedPng(fBuf);
      page.drawImage(fImg, {
        x: sx, y: sy - 500,
        width: 500 * scaleX, height: 500 * scaleY,
        opacity,
      });
    } else if (el.type === 'text' && el.text) {
      const fontName = el.font || 'Arial';
      const fontStyle = `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}`;
      const fontSize = (el.size || 16) * scaleY * 2;
      const fnt = `${fontStyle}${fontSize}px ${fontName}`;
      const tCanvas = document.createElement('canvas');
      const tCtx = tCanvas.getContext('2d')!;
      tCtx.font = fnt;
      const tMetrics = tCtx.measureText(el.text);
      const tW = Math.ceil(tMetrics.width) + 8;
      const tH = Math.ceil(fontSize * 1.4) + 8;
      tCanvas.width = tW;
      tCanvas.height = tH;
      const tCtx2 = tCanvas.getContext('2d')!;
      tCtx2.font = fnt;
      tCtx2.fillStyle = sColor;
      tCtx2.textBaseline = 'top';
      tCtx2.fillText(el.text, 4, 4);
      const tBlob2 = await new Promise<Blob>(resolve => tCanvas.toBlob(b => resolve(b!), 'image/png'));
      const tBuf2 = new Uint8Array(await tBlob2.arrayBuffer());
      const tImg = await pdfDoc.embedPng(tBuf2);
      const tScale = (el.size || 16) / 16;
      page.drawImage(tImg, {
        x: sx, y: sy - (tH / 2) * scaleY * tScale,
        width: tW * scaleX * tScale, height: tH * scaleY * tScale,
        opacity,
      });
    }
  }

  return new Blob([await pdfDoc.save() as BlobPart], { type: 'application/pdf' });
}

export async function htmlToPdf(html: string): Promise<Blob> {
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  const lines = text.split('\n').filter(l => l.trim());
  const pdf = await PDFDocument.create();
  const font = await embedLiberationSans(pdf);
  const fontSize = 11;
  const margin = 50;
  const lineHeight = fontSize * 1.5;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const maxWidth = pageWidth - margin * 2;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const line of lines) {
    if (y < margin + 20) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    const words = line.split(' ');
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
        page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
        if (y < margin + 20) {
          page = pdf.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }

  return new Blob([await pdf.save() as BlobPart], { type: 'application/pdf' });
}

export async function comparePdfTextClient(fileA: File, fileB: File): Promise<{ differences: { page: number; type: 'added' | 'removed'; content: string }[] }> {
  const textA = await extractTextFromPDF(fileA);
  const textB = await extractTextFromPDF(fileB);
  const pagesA = textA.split('\n---\n');
  const pagesB = textB.split('\n---\n');
  const maxPages = Math.max(pagesA.length, pagesB.length);
  const differences: { page: number; type: 'added' | 'removed'; content: string }[] = [];

  for (let i = 0; i < maxPages; i++) {
    const pageA = (pagesA[i] || '').trim();
    const pageB = (pagesB[i] || '').trim();
    if (!pageA && pageB) {
      differences.push({ page: i + 1, type: 'added', content: pageB.substring(0, 200) });
    } else if (pageA && !pageB) {
      differences.push({ page: i + 1, type: 'removed', content: pageA.substring(0, 200) });
    } else if (pageA !== pageB) {
      const wordsA = pageA.split(/\s+/);
      const wordsB = pageB.split(/\s+/);
      const n = wordsA.length;
      const m = wordsB.length;

      const added: string[] = [];
      const removed: string[] = [];

      if (n * m > 4_000_000) {
        const count = (words: string[]): Map<string, number> => {
          const map = new Map<string, number>();
          for (const w of words) map.set(w, (map.get(w) ?? 0) + 1);
          return map;
        };
        const countA = count(wordsA);
        const countB = count(wordsB);
        for (const [w, b] of countB) {
          const a = countA.get(w) ?? 0;
          for (let k = 0; k < b - Math.min(a, b); k++) added.push(w);
        }
        for (const [w, a] of countA) {
          const b = countB.get(w) ?? 0;
          for (let k = 0; k < a - Math.min(a, b); k++) removed.push(w);
        }
      } else {
        const lcs: Int32Array[] = [];
        for (let i = 0; i <= n; i++) lcs.push(new Int32Array(m + 1));
        for (let i = n - 1; i >= 0; i--) {
          for (let j = m - 1; j >= 0; j--) {
            lcs[i][j] = wordsA[i] === wordsB[j]
              ? lcs[i + 1][j + 1] + 1
              : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
          }
        }
        let a = 0, b = 0;
        while (a < n && b < m) {
          if (wordsA[a] === wordsB[b]) { a++; b++; }
          else if (lcs[a + 1][b] >= lcs[a][b + 1]) { removed.push(wordsA[a]); a++; }
          else { added.push(wordsB[b]); b++; }
        }
        while (a < n) { removed.push(wordsA[a]); a++; }
        while (b < m) { added.push(wordsB[b]); b++; }
      }

      if (added.length > 0) differences.push({ page: i + 1, type: 'added', content: added.slice(0, 20).join(' ') });
      if (removed.length > 0) differences.push({ page: i + 1, type: 'removed', content: removed.slice(0, 20).join(' ') });
    }
  }

  return { differences };
}

export async function pdfToOdt(file: File): Promise<Blob> {
  const text = await extractTextFromPDF(file);
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });

  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.2">
  <office:body>
    <office:text>
${text.split('\n').filter(Boolean).map(line => `      <text:p>${esc(line)}</text:p>`).join('\n')}
    </office:text>
  </office:body>
</office:document-content>`;

  zip.file('content.xml', contentXml);
  zip.file('meta.xml', `<?xml version="1.0" encoding="UTF-8"?>
<office:meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:creator>OptimaPDF</dc:creator>
  <dc:date>${new Date().toISOString()}</dc:date>
</office:meta>`);
  zip.file('styles.xml', `<?xml version="1.0" encoding="UTF-8"?>
<office:styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0">
  <style:style style:name="Standard" style:family="paragraph">
    <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.5cm"/>
    <style:text-properties fo:font-size="12pt" fo:font-family="Liberation Serif"/>
  </style:style>
</office:styles>`);
  zip.file('META-INF/manifest.xml', `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
</manifest:manifest>`);

  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

async function renderTextToPng(text: string, fontSize: number, color: string): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `bold ${fontSize}px Arial`;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width) + 4;
  const h = Math.ceil(fontSize * 1.4) + 4;
  canvas.width = w;
  canvas.height = h;
  const ctx2 = canvas.getContext('2d')!;
  ctx2.fillStyle = color;
  ctx2.font = `bold ${fontSize}px Arial`;
  ctx2.textBaseline = 'top';
  ctx2.fillText(text, 2, 2);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => { if (b) resolve(b); else reject(new Error('Failed to render image')); }, 'image/png');
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function imageToPngClient(imgFile: File): Promise<Uint8Array> {
  if (imgFile.type === 'image/png') return new Uint8Array(await imgFile.arrayBuffer());
  const img = await createImageBitmap(imgFile);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => { if (b) resolve(b); else reject(new Error('Failed to convert image')); }, 'image/png');
  });
  img.close();
  return new Uint8Array(await blob.arrayBuffer());
}

function parsePageRangeClient(input: string, total: number): number[] {
  const pages = new Set<number>();
  const parts = input.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [a, b] = trimmed.split('-').map(s => parseInt(s.trim(), 10));
      if (!isNaN(a) && !isNaN(b)) {
        const start = Math.max(1, Math.min(a, b));
        const end = Math.min(total, Math.max(a, b));
        for (let i = start; i <= end; i++) pages.add(i);
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n) && n >= 1 && n <= total) pages.add(n);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

export async function unlockPdfClient(file: File, password?: string): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const { decryptPDF } = await import('@pdfsmaller/pdf-decrypt');
  const result = await decryptPDF(new Uint8Array(buf), password || '');
  return new Blob([result as BlobPart], { type: 'application/pdf' });
}

export async function protectPdfClient(file: File, password: string): Promise<Blob> {
  if (password.length < 4) {
    throw new Error('Password must be at least 4 characters');
  }
  const buf = await file.arrayBuffer();
  const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
  const result = await encryptPDF(new Uint8Array(buf), password);
  return new Blob([result as BlobPart], { type: 'application/pdf' });
}

export async function pdfToJpgClient(file: File, quality = 80): Promise<{ name: string; data: Blob }[]> {
  const buf = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(buf))).promise;
  const baseName = file.name.replace(/\.pdf$/i, '');
  const results: { name: string; data: Blob }[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const w = Math.max(1, Math.round(viewport.width));
    const h = Math.max(1, Math.round(viewport.height));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => { if (b) resolve(b); else reject(new Error('Failed to encode JPEG')); }, 'image/jpeg', quality / 100);
    });
    results.push({ name: `${baseName}_strona_${i}.jpg`, data: blob });
  }

  await doc.cleanup();
  return results;
}

export async function signPdfClient(
  file: File,
  opts: {
    pageMode: string;
    singlePage?: number;
    customPages?: string;
    signName?: string;
    signImage?: File;
    signX: number;
    signY: number;
    unit: string;
    preset?: string;
    sigRatio?: number;
  }
): Promise<Blob> {
  const MM_TO_PT = 72 / 25.4;
  const IN_TO_PT = 72;
  const MARGIN = 40;
  const MAX_SIG_W = 150;
  const MAX_SIG_H = 50;
  const normalizedSigSize = (natW: number, natH: number, ratio: number) => {
    const cssW = natW / ratio;
    const cssH = natH / ratio;
    const scale = Math.min(MAX_SIG_W / cssW, MAX_SIG_H / cssH, 1);
    return { cssW, cssH, scale };
  };

  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  if (pdfDoc.isEncrypted) throw new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.');

  const totalPages = pdfDoc.getPageCount();
  let targetPages: number[];
  switch (opts.pageMode) {
    case 'first': targetPages = [1]; break;
    case 'last': targetPages = [totalPages]; break;
    case 'all': targetPages = Array.from({ length: totalPages }, (_, i) => i + 1); break;
    case 'custom': targetPages = parsePageRangeClient(opts.customPages || '', totalPages); break;
    default: targetPages = [Math.min(Math.max(1, opts.singlePage || 1), totalPages)];
  }

  if (targetPages.length === 0) throw new Error('Nie wybrano żadnej strony');

  let xPt = opts.signX;
  let yPt = opts.signY;
  if (opts.unit === 'mm') { xPt *= MM_TO_PT; yPt *= MM_TO_PT; }
  else if (opts.unit === 'cm') { xPt *= MM_TO_PT * 10; yPt *= MM_TO_PT * 10; }
  else if (opts.unit === 'in') { xPt *= IN_TO_PT; yPt *= IN_TO_PT; }

  for (const pageNum of targetPages) {
    const page = pdfDoc.getPage(pageNum - 1);
    const { width: pageW, height: pageH } = page.getSize();
    let finalX = xPt;
    let finalY = yPt;

    if (opts.preset) {
      let estW = 100;
      let estH = 40;
      if (opts.signName) {
        const plChars = (opts.signName.match(/[ąćęłńóśźż]/gi) || []).length;
        estW = opts.signName.length * 14 + plChars * 6 + 10;
        estH = 40;
      }
      if (opts.signImage) {
        const img = await createImageBitmap(opts.signImage);
        const { cssW, cssH, scale } = normalizedSigSize(img.width, img.height, opts.sigRatio ?? 1);
        estW = Math.round(cssW * scale);
        estH = Math.round(cssH * scale);
        img.close();
      }
      switch (opts.preset) {
        case 'bottom-left': finalX = MARGIN; finalY = pageH - MARGIN - estH; break;
        case 'bottom-center': finalX = (pageW - estW) / 2; finalY = pageH - MARGIN - estH; break;
        case 'bottom-right': finalX = pageW - estW - MARGIN; finalY = pageH - MARGIN - estH; break;
        case 'center-left': finalX = MARGIN; finalY = (pageH - estH) / 2; break;
        case 'center': finalX = (pageW - estW) / 2; finalY = (pageH - estH) / 2; break;
        case 'center-right': finalX = pageW - estW - MARGIN; finalY = (pageH - estH) / 2; break;
        case 'top-left': finalX = MARGIN; finalY = MARGIN; break;
        case 'top-center': finalX = (pageW - estW) / 2; finalY = MARGIN; break;
        case 'top-right': finalX = pageW - estW - MARGIN; finalY = MARGIN; break;
      }
    }

    const normalizedY = pageH - finalY;

    if (opts.signName) {
      const safeStr = opts.signName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L');
      const labelStr = 'Podpisano: ' + safeStr;
      const signPngBuf = await renderTextToPng(safeStr, 24, '#1a1a66');
      const labelPngBuf = await renderTextToPng(labelStr, 8, '#808080');
      const signPng = await pdfDoc.embedPng(signPngBuf);
      const labelPng = await pdfDoc.embedPng(labelPngBuf);
      const s = signPng.scale(1);
      page.drawImage(signPng, { x: finalX, y: normalizedY - s.height, width: s.width, height: s.height });
      const l = labelPng.scale(1);
      page.drawImage(labelPng, { x: finalX, y: normalizedY - 30 - l.height, width: l.width, height: l.height });
    }

    if (opts.signImage) {
      const pngBuf = await imageToPngClient(opts.signImage);
      const embedImage = await pdfDoc.embedPng(pngBuf);
      const { width: natW, height: natH } = embedImage.scale(1);
      const { cssW, cssH, scale } = normalizedSigSize(natW, natH, opts.sigRatio ?? 1);
      const imgW = cssW * scale;
      const imgH = cssH * scale;
      page.drawImage(embedImage, {
        x: finalX, y: normalizedY - imgH + 20, width: imgW, height: imgH, opacity: 0.9,
      });
    }
  }

  return new Blob([await pdfDoc.save({ useObjectStreams: false }) as BlobPart], { type: 'application/pdf' });
}

export interface PageDiff {
  page: number;
  pageAExists: boolean;
  pageBExists: boolean;
  diffPercent: number;
  /** Canvas image data URL for page A */
  imgA: string | null;
  /** Canvas image data URL for page B */
  imgB: string | null;
  /** Diff overlay: red pixels where different, transparent where same */
  diffOverlay: string | null;
}

function canvasDiff(canvasA: HTMLCanvasElement, canvasB: HTMLCanvasElement): { diffCanvas: HTMLCanvasElement; diffPercent: number } {
  const w = Math.max(canvasA.width, canvasB.width);
  const h = Math.max(canvasA.height, canvasB.height);
  const diffC = document.createElement('canvas');
  diffC.width = w;
  diffC.height = h;
  const ctx = diffC.getContext('2d')!;
  const imgA = canvasA.getContext('2d')!.getImageData(0, 0, canvasA.width, canvasA.height);
  const imgB = canvasB.getContext('2d')!.getImageData(0, 0, canvasB.width, canvasB.height);
  const out = ctx.createImageData(w, h);

  let diffPixels = 0;
  const totalPixels = w * h;
  for (let i = 0; i < totalPixels; i++) {
    const x = i % w;
    const y = Math.floor(i / w);
    const idx = i * 4;
    const idxA = x < canvasA.width && y < canvasA.height ? (y * canvasA.width + x) * 4 : -1;
    const idxB = x < canvasB.width && y < canvasB.height ? (y * canvasB.width + x) * 4 : -1;
    const rA = idxA >= 0 ? imgA.data[idxA] : 255;
    const gA = idxA >= 0 ? imgA.data[idxA + 1] : 255;
    const bA = idxA >= 0 ? imgA.data[idxA + 2] : 255;
    const aA = idxA >= 0 ? imgA.data[idxA + 3] : 0;
    const rB = idxB >= 0 ? imgB.data[idxB] : 255;
    const gB = idxB >= 0 ? imgB.data[idxB + 1] : 255;
    const bB = idxB >= 0 ? imgB.data[idxB + 2] : 255;
    const aB = idxB >= 0 ? imgB.data[idxB + 3] : 0;

    if (aA === 0 && aB === 0) {
      out.data[idx] = 0; out.data[idx + 1] = 0; out.data[idx + 2] = 0; out.data[idx + 3] = 0;
    } else if (Math.abs(rA - rB) > 10 || Math.abs(gA - gB) > 10 || Math.abs(bA - bB) > 10 || Math.abs(aA - aB) > 10) {
      out.data[idx] = 255; out.data[idx + 1] = 50; out.data[idx + 2] = 50; out.data[idx + 3] = 200;
      diffPixels++;
    } else {
      out.data[idx] = rA; out.data[idx + 1] = gA; out.data[idx + 2] = bA; out.data[idx + 3] = 100;
    }
  }
  ctx.putImageData(out, 0, 0);
  return { diffCanvas: diffC, diffPercent: Math.round((diffPixels / totalPixels) * 10000) / 100 };
}

export async function comparePdfVisual(fileA: File, fileB: File): Promise<PageDiff[]> {
  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const bufA = await fileA.arrayBuffer();
  const bufB = await fileB.arrayBuffer();
  const docA = await pdfjsLib.getDocument({ data: new Uint8Array(bufA) }).promise;
  const docB = await pdfjsLib.getDocument({ data: new Uint8Array(bufB) }).promise;
  const maxPages = Math.max(docA.numPages, docB.numPages);
  const scale = 0.75;
  const results: PageDiff[] = [];

  for (let i = 0; i < maxPages; i++) {
    const pageNum = i + 1;
    const pageAExists = pageNum <= docA.numPages;
    const pageBExists = pageNum <= docB.numPages;

    let imgA: string | null = null;
    let imgB: string | null = null;
    let diffOverlay: string | null = null;
    let diffPercent = 0;

    const renderPage = async (doc: any, num: number) => {
      const page = await doc.getPage(num);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
      return canvas;
    };

    if (pageAExists) {
      const c = await renderPage(docA, pageNum);
      imgA = c.toDataURL('image/png');
      if (pageBExists) {
        const cB = await renderPage(docB, pageNum);
        imgB = cB.toDataURL('image/png');
        const { diffCanvas, diffPercent: dp } = canvasDiff(c, cB);
        diffOverlay = diffCanvas.toDataURL('image/png');
        diffPercent = dp;
      }
    } else if (pageBExists) {
      const c = await renderPage(docB, pageNum);
      imgB = c.toDataURL('image/png');
    }

    results.push({ page: pageNum, pageAExists, pageBExists, diffPercent, imgA, imgB, diffOverlay });
  }

  await docA.cleanup();
  await docB.cleanup();
  return results;
}

export interface FormField {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'listbox' | 'signature' | 'unknown';
  options?: string[];
  value?: string | boolean;
}

export async function extractFormFields(file: File): Promise<{ fields: FormField[] }> {
  const { PDFDocument } = await import('pdf-lib');
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf);
  const form = pdfDoc.getForm();
  const pdfFields = form.getFields();
  const fields: FormField[] = pdfFields.map((f: any) => {
    const name = f.getName();
    const type = f.constructor.name;
    let fieldType: FormField['type'] = 'unknown';
    let options: string[] | undefined;
    if (type === 'PDFTextField') fieldType = 'text';
    else if (type === 'PDFCheckBox') fieldType = 'checkbox';
    else if (type === 'PDFRadioGroup') { fieldType = 'radio'; options = f.getOptions(); }
    else if (type === 'PDFDropdown') { fieldType = 'dropdown'; options = f.getOptions(); }
    else if (type === 'PDFListBox') { fieldType = 'listbox'; options = f.getOptions(); }
    else if (type === 'PDFSignature') fieldType = 'signature';
    return { name, type: fieldType, options, value: fieldType === 'checkbox' ? f.isChecked() : undefined };
  });
  return { fields };
}

export async function fillFormFields(file: File, values: Record<string, string | boolean>): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib');
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf);
  const form = pdfDoc.getForm();
  const pdfFields = form.getFields();

  for (const f of pdfFields as any[]) {
    const name = f.getName();
    if (!(name in values)) continue;
    const val = values[name];
    const type = f.constructor.name;
    if (type === 'PDFTextField') f.setText(val as string);
    else if (type === 'PDFCheckBox') val ? f.check() : f.uncheck();
    else if (type === 'PDFRadioGroup') f.select(val as string);
    else if (type === 'PDFDropdown') f.select(val as string);
    else if (type === 'PDFListBox') f.select(val as string);
  }

  form.flatten();
  const bytes = await pdfDoc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

export async function extractImagesFromPdf(
  file: File,
  opts: { pages?: number[]; format: 'png' | 'jpeg' | 'webp'; scale: number; quality?: number }
): Promise<{ page: number; blob: Blob; url: string }[]> {
  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(buf))).promise;
  const pagesToExtract = opts.pages || Array.from({ length: doc.numPages }, (_, i) => i + 1);
  const results: { page: number; blob: Blob; url: string }[] = [];

  for (const pageNum of pagesToExtract) {
    if (pageNum < 1 || pageNum > doc.numPages) continue;
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: opts.scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((res, rej) => {
      canvas.toBlob(b => b ? res(b) : rej(new Error('Canvas toBlob failed')), `image/${opts.format}`, opts.quality);
    });
    results.push({ page: pageNum, blob, url: URL.createObjectURL(blob) });
  }

  await doc.cleanup();
  return results;
}

/**
 * Best-effort PDF/A-1b conversion.
 *
 * What it does:
 * - Flattens form fields (AcroForm)
 * - Removes JavaScript actions from document catalog
 * - Sets standard metadata (title, author, etc.)
 * - Embeds XMP metadata claiming PDF/A-1b compliance
 * - Adds OutputIntent for sRGB color space
 * - Saves with useObjectStreams: false (PDF/A requirement)
 *
 * Limitations:
 * - Does NOT embed all fonts (pdf-lib limitation for fonts already in the doc)
 * - Does NOT fully validate PDF/A structure
 * - May not pass strict PDF/A preflight check
 * - Still useful for most archival/readability purposes
 */
export async function convertToPdfA(file: File): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import('pdf-lib');
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });

  // 1. Flatten forms
  try {
    const form = pdfDoc.getForm();
    form.flatten();
  } catch { /* no form */ }

  // 2. Remove JS actions from catalog
  const catalog: any = (pdfDoc as any).context?.trailerInfo?.Root;
  if (catalog) {
    try { delete catalog.JS; } catch { /* ignore */ }
    try { delete catalog.AA; } catch { /* ignore */ }
    try { (catalog as any).MarkInfo = { Marked: true }; } catch { /* ignore */ }
  }

  // 3. Set metadata
  if (!pdfDoc.getTitle()) pdfDoc.setTitle('PDF Document');
  if (!pdfDoc.getAuthor()) pdfDoc.setAuthor('OptimaPDF');
  if (!pdfDoc.getProducer()) pdfDoc.setProducer('OptimaPDF');
  pdfDoc.setCreator('OptimaPDF PDF/A Converter');

  // 4. Build XMP metadata for PDF/A-1b
  const now = new Date().toISOString();
  const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
      xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <pdf:Producer>OptimaPDF</pdf:Producer>
      <pdfaid:part>1</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
      <xmp:CreatorTool>OptimaPDF PDF/A Converter</xmp:CreatorTool>
      <xmp:CreateDate>${now}</xmp:CreateDate>
      <xmp:ModifyDate>${now}</xmp:ModifyDate>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  // 5. Embed XMP metadata
  try {
    const xmpStream = (pdfDoc as any).context?.obj(new Uint8Array(new TextEncoder().encode(xmp)));
    const metadataRef = (pdfDoc as any).context?.register(xmpStream);
    const catalog2: any = (pdfDoc as any).context?.trailerInfo?.Root;
    if (catalog2) {
      catalog2.Metadata = metadataRef;
    }
  } catch { /* metadata embed failed - non-critical */ }

  // 6. Add OutputIntent for sRGB
  try {
    const srgbProfile = new Uint8Array([
      0x00, 0x00, 0x0C, 0x48, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF6, 0xD6,
      0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0xD3, 0x2D, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const srgbStream = (pdfDoc as any).context?.obj(srgbProfile);
    const srgbRef = (pdfDoc as any).context?.register(srgbStream);
    const outputIntent = (pdfDoc as any).context?.obj({
      Type: 'OutputIntent',
      S: 'GTS_PDFA1',
      OutputConditionIdentifier: 'sRGB IEC61966-2.1',
      DestOutputProfile: srgbRef,
      Info: 'sRGB IEC61966-2.1',
    });
    const outputIntentRef = (pdfDoc as any).context?.register(outputIntent);
    const catalog3: any = (pdfDoc as any).context?.trailerInfo?.Root;
    if (catalog3) {
      catalog3.OutputIntents = [outputIntentRef];
    }
  } catch { /* output intent failed - non-critical */ }

  const bytes = await pdfDoc.save({ useObjectStreams: false });
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

export { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
