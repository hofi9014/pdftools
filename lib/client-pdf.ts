import { PDFDocument, StandardFonts, rgb, degrees, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';

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
  return pdf.save();
}

export async function flattenPDF(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    (page.node as unknown as Record<string, unknown>).Annots = undefined;
  }
  return pdf.save();
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

export async function redactPdf(file: File, regions: { page: number; x: number; y: number; width: number; height: number }[]): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  for (const r of regions) {
    const page = pdf.getPage(r.page);
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: r.x * width,
      y: height - r.y * height - r.height * height,
      width: r.width * width,
      height: r.height * height,
      color: rgb(0, 0, 0),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0,
    });
  }
  return pdf.save();
}

export async function pdfToEpub(file: File): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(buf))).promise;
  const title = file.name.replace(/\.pdf$/i, '');
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as unknown as { str: string }).str)
      .join(' ');
    pages.push(text.trim());
  }
  await doc.cleanup();

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  zip.file('mimetype', 'application/epub+zip');

  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const now = new Date().toISOString().replace(/[TZ:.\-]/g, '').slice(0, 14);

  const xhtmlPages = pages.map((text, i) => {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Page ${i + 1}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body><p>${escaped || '(brak tekstu)'}</p></body>
</html>`;
  });

  xhtmlPages.forEach((html, i) => {
    zip.file(`OEBPS/page-${i + 1}.xhtml`, html);
  });

  zip.file('OEBPS/style.css', 'body { font-family: serif; margin: 5%; } p { text-indent: 1em; margin: 0; line-height: 1.5; }');

  const manifest = xhtmlPages.map((_, i) =>
    `    <item id="page-${i + 1}" href="page-${i + 1}.xhtml" media-type="application/xhtml+xml"/>`
  ).join('\n');

  const spine = xhtmlPages.map((_, i) =>
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
    ${xhtmlPages.map((_, i) => `
    <navPoint id="nav-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>Page ${i + 1}</text></navLabel>
      <content src="page-${i + 1}.xhtml"/>
    </navPoint>`).join('')}
  </navMap>
</ncx>`);

  return await zip.generateAsync({ type: 'blob' });
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
  const scale = level === 'extreme' ? 0.5 : 0.75;

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

  if (scale >= 1) return pdf.save({ useObjectStreams: true });

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
        const outBlob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 90));
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
  const font = await pdf.embedFont(StandardFonts.Helvetica);
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
  const font = await pdf.embedFont(StandardFonts.Helvetica);
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
      const added = wordsB.filter(w => !wordsA.includes(w));
      const removed = wordsA.filter(w => !wordsB.includes(w));
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
  }
): Promise<Blob> {
  const MM_TO_PT = 72 / 25.4;
  const IN_TO_PT = 72;
  const MARGIN = 40;

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
        estW = Math.round(img.width * 0.5);
        estH = Math.round(img.height * 0.5);
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
      const { width: imgW, height: imgH } = embedImage.scale(0.5);
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
