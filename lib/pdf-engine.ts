import { PDFDocument, StandardFonts, rgb, degrees, PDFName, PDFRawStream, PDFNumber, PDFRef } from 'pdf-lib';
import { readFileSync, existsSync } from 'fs';

async function initPdfjs() {
  if ((globalThis as Record<string, unknown>).pdfjsWorker) return;
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
}

function getFontsPath(): string {
  return process.cwd() + '/node_modules/pdfjs-dist/standard_fonts/';
}

export function readFileAsBytes(path: string): Buffer {
  return readFileSync(path);
}

export async function mergePDFs(fileBuffers: Buffer[]): Promise<Buffer> {
  const mergedPdf = await PDFDocument.create();
  for (const buf of fileBuffers) {
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
    const indices = pdf.getPageIndices();
    const pages = await mergedPdf.copyPages(pdf, indices);
    pages.forEach(page => mergedPdf.addPage(page));
  }
  return Buffer.from(await mergedPdf.save());
}

export async function splitPDF(fileBuffer: Buffer): Promise<Buffer[]> {
  const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const results: Buffer[] = [];
  for (let i = 0; i < pdf.getPageCount(); i++) {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(page);
    results.push(Buffer.from(await newPdf.save()));
  }
  return results;
}

export async function rotatePDF(fileBuffer: Buffer, angle: 90 | 180 | 270): Promise<Buffer> {
  const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  for (const page of pdf.getPages()) {
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  }
  return Buffer.from(await pdf.save());
}

export interface PageNumberOptions {
  startNumber?: number;
  verticalPosition?: 'bottom' | 'top';
  horizontalPosition?: 'left' | 'center' | 'right';
  fontSize?: number;
}

export async function addPageNumbers(fileBuffer: Buffer, options: PageNumberOptions = {}): Promise<Buffer> {
  const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const start = options.startNumber ?? 1;
  const vPos = options.verticalPosition ?? 'bottom';
  const hPos = options.horizontalPosition ?? 'center';
  const fontSize = options.fontSize ?? 12;

  for (let i = 0; i < pdf.getPageCount(); i++) {
    const page = pdf.getPage(i);
    const { width, height } = page.getSize();
    const text = String(start + i);

    let x: number;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    if (hPos === 'left') x = 50;
    else if (hPos === 'right') x = width - 50 - textWidth;
    else x = width / 2 - textWidth / 2;

    const y = vPos === 'top' ? height - 30 : 30;
    page.drawText(text, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
  }
  return Buffer.from(await pdf.save());
}

export async function addWatermark(fileBuffer: Buffer, text: string, options?: {
  opacity?: number;
  rotation?: number;
  fontSize?: number;
  position?: 'top' | 'center' | 'bottom';
}): Promise<Buffer> {
  const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
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
      x = width / 4;
      if (position === 'top') y = height * 0.75;
      else if (position === 'bottom') y = height * 0.25;
      else y = height / 2;
    }

    page.drawText(text, {
      x, y, size: fontSize, font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(rotation),
    });
  }
  return Buffer.from(await pdf.save());
}

export async function protectPDF(fileBuffer: Buffer, password: string): Promise<Buffer> {
  const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
  const result = await encryptPDF(new Uint8Array(fileBuffer), password);
  return Buffer.from(result);
}

export async function unlockPDF(fileBuffer: Buffer, password: string): Promise<Buffer> {
  const { decryptPDF } = await import('@pdfsmaller/pdf-decrypt');
  const result = await decryptPDF(new Uint8Array(fileBuffer), password);
  return Buffer.from(result);
}

export async function imageToPdf(fileBuffer: Buffer, fileName: string, margin = 0): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const ext = fileName.toLowerCase().split('.').pop() || '';

  let image;
  if (ext === 'png') image = await pdf.embedPng(fileBuffer);
  else image = await pdf.embedJpg(fileBuffer);

  const pageWidth = image.width + margin * 2;
  const pageHeight = image.height + margin * 2;
  const page = pdf.addPage([pageWidth, pageHeight]);
  page.drawImage(image, { x: margin, y: margin, width: image.width, height: image.height });
  return Buffer.from(await pdf.save());
}

export async function pdfToJpg(fileBuffer: Buffer, scale = 1.5): Promise<Buffer[]> {
  return convertPdfToImagePages(fileBuffer, scale, 92);
}

export type CompressLevel = 'low' | 'recommended' | 'extreme';

function parseFilters(fRaw: unknown): string[] {
  if (!fRaw || typeof fRaw !== 'object') return [];
  if (typeof (fRaw as any).asArray === 'function') {
    return (fRaw as any).asArray().map((e: unknown) => String(e));
  }
  return [String(fRaw)];
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Undo PNG row-by-row filtering (Predictor=15) → raw pixels
function unfilterPng(data: Uint8Array, width: number, height: number, channels: number): Buffer {
  const stride = width * channels;
  const result = Buffer.alloc(height * stride);
  let srcOff = 0;
  let dstOff = 0;
  for (let y = 0; y < height; y++) {
    const filterType = data[srcOff++];
    const row = data.subarray(srcOff, srcOff + stride);
    srcOff += stride;
    const prevOff = dstOff - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? result[dstOff + x - channels] : 0;
      const b = y > 0 ? result[prevOff + x] : 0;
      const c = (y > 0 && x >= channels) ? result[prevOff + x - channels] : 0;
      let raw: number;
      switch (filterType) {
        case 0: raw = row[x]; break;
        case 1: raw = (row[x] + a) & 0xFF; break;
        case 2: raw = (row[x] + b) & 0xFF; break;
        case 3: raw = (row[x] + Math.floor((a + b) / 2)) & 0xFF; break;
        case 4: raw = (row[x] + paeth(a, b, c)) & 0xFF; break;
        default: raw = row[x];
      }
      result[dstOff + x] = raw;
    }
    dstOff += stride;
  }
  return result;
}

function extractPngIdat(png: Buffer): Buffer | null {
  const chunks: Buffer[] = [];
  let offset = 8; // skip PNG signature
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    if (offset + 12 + length > png.length) break;
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') {
      chunks.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += 12 + length;
  }
  return chunks.length ? Buffer.concat(chunks) : null;
}

export async function compressPDF(fileBuffer: Buffer, level?: CompressLevel): Promise<Buffer> {
  const levelKey = level || 'recommended';

  const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const ctx = pdf.context;

  // === Strip metadata (all levels) ===
  const infoRef = (ctx.trailerInfo as Record<string, unknown>).Info;
  if (infoRef) {
    try { ctx.delete(infoRef as never); } catch {}
    (ctx.trailerInfo as Record<string, unknown>).Info = undefined;
  }
  try { pdf.catalog.delete(PDFName.of('Metadata')); } catch {}

  const pako = (await import('pako')).default;

  // Scale factors: low=10%, recommended=10%, extreme=15%
  // Plik: 103 strony, 0 JPEG, 2 FlateDecode obrazy (337KB), 711 strumieni (1302KB)
  const scale = levelKey === 'extreme' ? 0.5 : 0.75;

  // === Step 1: Recompress all non-image FlateDecode streams at pako level 9 ===
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
    } catch (e) {
      console.error('Step1 recompress skip:', (e as Error)?.message || e);
    }
  }

  // === Step 2: Process all images (JPEG + FlateDecode) ===
  if (scale >= 1) return Buffer.from(await pdf.save({ useObjectStreams: true }));

  const sharpMod = (await import('sharp')).default;

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

    // === JPEG: resize + re-encode at quality 90 ===
    if (filters.includes('/DCTDecode')) {
      try {
        const src = obj.contents;
        const out = await sharpMod(Buffer.from(src.buffer, src.byteOffset, src.byteLength))
          .resize({ width: nw, height: nh, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toBuffer();
        if (out.length < src.length) {
          (obj as unknown as { contents: Uint8Array }).contents = new Uint8Array(out);
          obj.dict.set(PDFName.Length, PDFNumber.of(out.length));
          obj.dict.set(PDFName.of('Width'), ctx.obj(nw));
          obj.dict.set(PDFName.of('Height'), ctx.obj(nh));
          obj.dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
        }
      } catch (e) {
        console.error('JPEG img skip:', (e as Error)?.message || e);
      }
      continue;
    }

    // === FlateDecode: resize pixels → PNG → extract IDAT (lossless, PNG-efficient) ===
    if (filters.includes('/FlateDecode')) {
      try {
        const raw = obj.contents;
        if (raw.length < 50) continue;
        const dec = pako.inflate(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
        const cs = obj.dict.get(PDFName.of('ColorSpace'));
        const csStr = cs ? String(cs) : '';
        const bpc = ((obj.dict.get(PDFName.of('BitsPerComponent')) as PDFNumber)?.asNumber() ?? 8);
        if (bpc !== 8) continue;
        const csUpper = csStr.toUpperCase();
        let channels = 3;
        if (csUpper.includes('GRAY')) channels = 1;
        else if (csUpper.includes('CMYK')) channels = 4;

        // Check if original data uses PNG predictor (Predictor=15)
        const dp = obj.dict.get(PDFName.of('DecodeParms'));
        let predictor = 1;
        if (dp) {
          if (dp instanceof PDFRef) {
            const dpObj = (ctx as any).lookup(dp);
            if (dpObj && typeof (dpObj as any).get === 'function') {
              const predVal = (dpObj as any).get(PDFName.of('Predictor'));
              if (predVal !== undefined && predVal !== null) predictor = Number(predVal);
            }
          }
        }

        // Decode to raw pixels (undo PNG filtering if Predictor=15)
        const expectedSize = w * h * channels;
        let rawPixels: Buffer;
        if (predictor === 15) {
          rawPixels = unfilterPng(new Uint8Array(dec.buffer, dec.byteOffset, dec.byteLength), w, h, channels);
        } else {
          rawPixels = Buffer.from(dec);
        }
        if (rawPixels.length !== expectedSize) continue;

        // Resize → get raw pixels back → deflate with pako
        const resized = await sharpMod(rawPixels, { raw: { width: w, height: h, channels: channels as 1 | 2 | 3 | 4 } })
          .resize({ width: nw, height: nh, fit: 'fill', withoutEnlargement: true })
          .raw()
          .toBuffer();

        const rec = pako.deflate(new Uint8Array(resized.buffer, resized.byteOffset, resized.byteLength), { level: 9 });
        if (rec.length >= raw.length) continue;

        (obj as unknown as { contents: Uint8Array }).contents = rec;
        obj.dict.set(PDFName.Length, PDFNumber.of(rec.length));
        obj.dict.set(PDFName.of('Width'), ctx.obj(nw));
        obj.dict.set(PDFName.of('Height'), ctx.obj(nh));
        // Remove old DecodeParms – storing raw (unfiltered) deflated pixels
        try { obj.dict.delete(PDFName.of('DecodeParms')); } catch {}
      } catch (e) {
        console.error('FlateDecode img skip:', (e as Error)?.message || e);
      }
      continue;
    }
  }

  return Buffer.from(await pdf.save({ useObjectStreams: true }));
}

export async function convertPdfToImagePages(fileBuffer: Buffer, scale = 2, quality = 85): Promise<Buffer[]> {
  await initPdfjs();
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const sharpMod = await import('sharp');
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(fileBuffer),
    standardFontDataUrl: getFontsPath(),
  }).promise;
  const { createCanvas } = await import('@napi-rs/canvas');
  const results: Buffer[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const w = Math.max(1, Math.round(viewport.width));
    const h = Math.max(1, Math.round(viewport.height));
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    await (page.render as unknown as (params: { canvasContext: unknown; viewport: unknown }) => { promise: Promise<void> })({ canvasContext: ctx, viewport }).promise;
    const pngBuf = canvas.toBuffer('image/png') as unknown as Buffer;
    const jpegBuf = await sharpMod.default(pngBuf).jpeg({ quality }).toBuffer();
    results.push(jpegBuf);
  }
  return results;
}

async function createOcrPage(newPdf: PDFDocument, origPdf: PDFDocument, imageBuffer: Buffer, pageIndex: number, words: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[]) {
  const [copiedPage] = await newPdf.copyPages(origPdf, [pageIndex]);
  newPdf.addPage(copiedPage);
  const page = newPdf.getPage(newPdf.getPageCount() - 1);
  const font = await newPdf.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  const scaleX = width / 2000;
  const scaleY = height / 2800;

  for (const word of words) {
    try {
      page.drawText(word.text, {
        x: word.bbox.x0 * scaleX,
        y: height - word.bbox.y1 * scaleY,
        size: Math.max(4, (word.bbox.y1 - word.bbox.y0) * scaleY * 0.8),
        font,
        color: rgb(0, 0, 0),
        opacity: 0,
      });
    } catch {
    }
  }
}

export async function ocrPDF(fileBuffer: Buffer, language = 'eng'): Promise<Buffer> {
  await initPdfjs();
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const origPdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  const pdfjsDoc = await pdfjsLib.getDocument({
    data: new Uint8Array(fileBuffer),
    standardFontDataUrl: getFontsPath(),
  }).promise;

  const langFile = process.cwd() + '/' + language + '.traineddata';
  if (!existsSync(langFile)) {
    console.log('OCR: traineddata not found locally — will download from CDN (may be slow)');
  }

  const { createCanvas } = await import('@napi-rs/canvas');
  const { recognize } = await import('tesseract.js');

  const workerPath = process.cwd() + '/node_modules/tesseract.js/src/worker-script/node/index.js';

  for (let i = 0; i < origPdf.getPageCount(); i++) {
    try {
      const page = await pdfjsDoc.getPage(i + 1);
      const viewport = page.getViewport({ scale: 1.5 });
      const w = Math.max(1, Math.round(viewport.width));
      const h = Math.max(1, Math.round(viewport.height));
      const canvas = createCanvas(w, h);
      const ctx = canvas.getContext('2d');
      await (page.render as unknown as (params: { canvasContext: unknown; viewport: unknown }) => { promise: Promise<void> })({ canvasContext: ctx, viewport }).promise;
      const pngBuf = canvas.toBuffer('image/png') as unknown as Buffer;

      const { data } = await recognize(pngBuf, language, { workerPath });
      const blocks = data.blocks as unknown as Record<string, unknown>;
      const words = (blocks ? (Object.values(blocks) as Record<string, unknown>[]).flatMap((b: Record<string, unknown>) =>
        ((b.paragraphs || []) as unknown as Record<string, unknown>[]).flatMap((p: Record<string, unknown>) =>
          ((p.lines || []) as unknown as Record<string, unknown>[]).flatMap((l: Record<string, unknown>) => l.words as { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[] || [])
        )
      ) : []);
      await createOcrPage(newPdf, origPdf, pngBuf, i, words);
    } catch (e) {
      console.error('OCR: page', i + 1, 'error:', (e as Error)?.message || e);
    }
  }

  return Buffer.from(await newPdf.save());
}

export async function deletePages(fileBuffer: Buffer, pageIndices: number[]): Promise<Buffer> {
  const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const sorted = [...new Set(pageIndices)].sort((a, b) => b - a);
  for (const idx of sorted) {
    if (idx >= 0 && idx < pdf.getPageCount()) {
      pdf.removePage(idx);
    }
  }
  return Buffer.from(await pdf.save());
}

export async function extractPages(fileBuffer: Buffer, pageIndices: number[]): Promise<Buffer> {
  const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  for (const idx of pageIndices) {
    if (idx >= 0 && idx < pdf.getPageCount()) {
      const [page] = await newPdf.copyPages(pdf, [idx]);
      newPdf.addPage(page);
    }
  }
  return Buffer.from(await newPdf.save());
}

export async function reorderPages(fileBuffer: Buffer, newOrder: number[]): Promise<Buffer> {
  const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  for (const idx of newOrder) {
    if (idx >= 0 && idx < pdf.getPageCount()) {
      const [page] = await newPdf.copyPages(pdf, [idx]);
      newPdf.addPage(page);
    }
  }
  return Buffer.from(await newPdf.save());
}

export async function cropPages(fileBuffer: Buffer, margins: { top: number; right: number; bottom: number; left: number }): Promise<Buffer> {
  const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    page.setMediaBox(margins.left, margins.bottom, width - margins.left - margins.right, height - margins.bottom - margins.top);
  }
  return Buffer.from(await pdf.save());
}

export async function addBlankPage(fileBuffer: Buffer, position?: number): Promise<Buffer> {
  const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  if (position !== undefined && position >= 0 && position <= pdf.getPageCount()) {
    pdf.insertPage(position, pdf.addPage());
  } else {
    pdf.addPage();
  }
  return Buffer.from(await pdf.save());
}

export interface MetadataOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
}

export async function editMetadata(fileBuffer: Buffer, meta: MetadataOptions): Promise<Buffer> {
  const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  if (meta.title !== undefined) pdf.setTitle(meta.title);
  if (meta.author !== undefined) pdf.setAuthor(meta.author);
  if (meta.subject !== undefined) pdf.setSubject(meta.subject);
  if (meta.keywords !== undefined) pdf.setKeywords((meta.keywords || '').split(',').map(s => s.trim()).filter(Boolean));

  // Add XMP metadata stream for wider compatibility (Windows Explorer, etc.)
  const xml = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
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

  const xmpBytes = new TextEncoder().encode(xml);
  const xmpStream = pdf.context.stream(xmpBytes, { Type: 'Metadata', Subtype: 'XML' });
  const xmpRef = pdf.context.register(xmpStream);
  pdf.catalog.set(PDFName.of('Metadata'), xmpRef);

  return Buffer.from(await pdf.save());
}

function escapeXml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function pdfToPptx(fileBuffer: Buffer): Promise<Buffer> {
  const text = await extractText(fileBuffer);
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

  const blob = await pres.write({ outputType: 'nodebuffer' });
  if (blob instanceof Buffer) return blob;
  if (blob instanceof Uint8Array) return Buffer.from(blob);
  if (blob instanceof ArrayBuffer) return Buffer.from(new Uint8Array(blob));
  throw new Error('Nieoczekiwany typ wyniku z pptxgenjs');
}

export async function imageToPdfExtended(fileBuffer: Buffer, fileName: string, margin = 0): Promise<Buffer> {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const jpegExts = ['jpg', 'jpeg'];
  const pngExts = ['png'];
  const convertExts = ['tiff', 'tif', 'bmp', 'gif', 'webp'];

  if (jpegExts.includes(ext) || pngExts.includes(ext)) {
    return imageToPdf(fileBuffer, fileName, margin);
  }

  if (convertExts.includes(ext)) {
    const sharpMod = (await import('sharp')).default;
    const pngBuffer = await sharpMod(fileBuffer).png().toBuffer();
    return imageToPdf(pngBuffer, 'image.png', margin);
  }

  throw new Error(`Format .${ext} nie jest obsługiwany`);
}

async function extractXlsxTextForPdf(buffer: Buffer): Promise<string> {
  const JSZip = (await import('jszip'));
  const zip = await JSZip.loadAsync(buffer);
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
  for (const sheetName of sheetFiles) {
    const sheetXml = await zip.file(sheetName)!.async('string');
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
  return lines.join('\n') || 'Brak danych do odczytania.';
}

export async function excelToPdf(fileBuffer: Buffer): Promise<Buffer> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const text = await extractXlsxTextForPdf(fileBuffer);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Courier);
  const fontSize = 9;
  const margin = 40;
  const lineHeight = fontSize * 1.4;

  let page = pdf.addPage([595.28, 841.89]);
  let y = 800;

  const lines = text.split('\n');
  for (const line of lines) {
    if (y < 50) {
      page = pdf.addPage([595.28, 841.89]);
      y = 800;
    }
    const cols = line.split('\t');
    let x = margin;
    for (const col of cols) {
      page.drawText(col, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
      x += 120;
      if (x > 550) break;
    }
    y -= lineHeight;
  }

  return Buffer.from(await pdf.save());
}

export async function comparePdfText(fileBufferA: Buffer, fileBufferB: Buffer): Promise<{ differences: { page: number; type: 'added' | 'removed' | 'changed'; content: string }[] }> {
  const textA = await extractText(fileBufferA);
  const textB = await extractText(fileBufferB);

  const pagesA = textA.split('\n---\n');
  const pagesB = textB.split('\n---\n');
  const maxPages = Math.max(pagesA.length, pagesB.length);
  const differences: { page: number; type: 'added' | 'removed' | 'changed'; content: string }[] = [];

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
      const added = wordsB.filter(w => !wordsA.includes(w));
      const removed = wordsA.filter(w => !wordsB.includes(w));
      if (added.length > 0) {
        differences.push({ page: i + 1, type: 'added', content: added.slice(0, 20).join(' ') });
      }
      if (removed.length > 0) {
        differences.push({ page: i + 1, type: 'removed', content: removed.slice(0, 20).join(' ') });
      }
    }
  }

  return { differences };
}

export async function extractText(fileBuffer: Buffer): Promise<string> {
  await initPdfjs();
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(fileBuffer),
    standardFontDataUrl: getFontsPath(),
  }).promise;
  const texts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    texts.push(content.items.map((item: unknown) => (item as { str: string }).str || '').join(' '));
  }
  return texts.join('\n---\n');
}
