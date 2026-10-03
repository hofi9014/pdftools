import { PDFDocument, rgb, degrees, type PDFFont } from 'pdf-lib';
import { initPdfjs, embedLiberationSans, visualPageSize, visualToRawPoint } from '@/lib/client-pdf';

interface Word {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

function extractWords(data: unknown): Word[] {
  const blocks = (data as Record<string, unknown>)?.blocks;
  if (!blocks || typeof blocks !== 'object') return [];
  return (Object.values(blocks) as Record<string, unknown>[]).flatMap((b: Record<string, unknown>) =>
    ((b.paragraphs || []) as Record<string, unknown>[]).flatMap((p: Record<string, unknown>) =>
      ((p.lines || []) as Record<string, unknown>[]).flatMap((l: Record<string, unknown>) =>
        (l.words as { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[] || [])
          .filter(w => w.text?.trim())
      )
    )
  );
}

function extractFullText(data: unknown): string {
  return (data as Record<string, unknown>)?.text as string ?? '';
}

// Returns how many OCR words could not be placed in the invisible text layer
// (unsupported scripts — with StandardFonts.WinAnsi even Polish/Latin-Extended
// words were silently dropped; LiberationSans covers Latin/Cyrillic/Greek, so
// only truly unsupported scripts like Arabic/CJK/Hangul remain). Unsupported
// words are detected via glyph coverage (not the old throw), then still counted
// and sampled so the loss is never fully silent.
export async function createOcrPage(
  newPdf: PDFDocument,
  origPdf: PDFDocument,
  pageIndex: number,
  words: Word[],
  font: PDFFont,
  canvasWidth: number,
  canvasHeight: number
): Promise<{ dropped: number; samples: string[] }> {
  const [copiedPage] = await newPdf.copyPages(origPdf, [pageIndex]);
  newPdf.addPage(copiedPage);
  const page = newPdf.getPage(newPdf.getPageCount() - 1);
  const charSet = new Set(font.getCharacterSet());
  // The canvas that was recognised is what a VIEWER sees: pdf.js renders the crop box and applies
  // the page's own /Rotate. Word boxes are therefore in that visual space, while drawText() works
  // in the raw, unrotated page space whose origin is the media box's — so a scan stored as a
  // portrait page with /Rotate 90 (routine scanner output), or a page whose box does not start
  // at (0,0), had its whole text layer in the wrong place. Same mapping as addPageNumbers().
  const box = page.getCropBox();
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  const { width, height } = visualPageSize(box.width, box.height, rotation);

  // FINDING (2026-09-17) — word.bbox is in pixel space of the canvas actually OCR'd
  // (canvasWidth × canvasHeight, i.e. the PDF page's point size × the render scale used
  // below), NOT a fixed 2000×2800 image. The previous hardcoded divisor only produced a
  // correct pixel→point scale for a hypothetical ~1000×1400pt page, which no standard page
  // size (Letter 612×792, A4 595×842, Legal 612×1008...) matches — on every real document
  // this placed and sized every OCR'd word using the wrong scale (~1.6-1.7x too small for
  // Letter/A4), compressing the whole invisible searchable-text layer into roughly the
  // bottom-left 60% of the page instead of aligning it with the visible scanned glyphs.
  // Deriving the scale from the actual canvas dimensions passed in from ocrPdfClient makes
  // this exact for any page size and any future render-scale change.
  const scaleX = width / canvasWidth;
  const scaleY = height / canvasHeight;

  let dropped = 0;
  const samples: string[] = [];
  const markDropped = (text: string) => { dropped++; if (samples.length < 10) samples.push(text); };

  for (const word of words) {
    if ([...word.text].some(ch => !charSet.has(ch.codePointAt(0)!))) {
      markDropped(word.text);
      continue;
    }
    try {
      const raw = visualToRawPoint(box.width, box.height, rotation, word.bbox.x0 * scaleX, height - word.bbox.y1 * scaleY);
      page.drawText(word.text, {
        x: box.x + raw.x,
        y: box.y + raw.y,
        size: Math.max(4, (word.bbox.y1 - word.bbox.y0) * scaleY * 0.8),
        font,
        color: rgb(0, 0, 0),
        opacity: 0,
        rotate: degrees(rotation),
      });
    } catch {
      markDropped(word.text);
    }
  }
  return { dropped, samples };
}

// Resolution, measured on scans of real documents (e2e/ocr-real-scan.mts), not assumed:
//  - 9-13 pt body text reads best, and fastest, at 144 DPI (96-100% of the words); 300 DPI is no
//    better there and sometimes a little worse;
//  - small print (a 4.5 pt schedule table) is unreadable at 144 DPI — 3-5% of the words, i.e.
//    garbage — and 75% readable at 300 DPI.
// The engine's own confidence separates the two cleanly (>= 83 for every readable page, about 30
// for the garbage), so every page is read at 144 DPI first and only a page below
// OCR_FINE_PASS_CONFIDENCE is read again at 300 DPI. That second canvas never exceeds
// OCR_MAX_PIXELS (memory on phones): oversized pages get a lower scale.
//
// The old contrast "preprocessing" (grayscale, x1.3 around mid-grey) is gone: Tesseract
// binarises on its own, and the stretch thinned light strokes — on one real page it cost 3% of
// the words ("mniej" read as "mnicj") and on faded scans it gained nothing.
export const OCR_BASE_SCALE = 2;
export const OCR_TARGET_DPI = 300;
export const OCR_MAX_PIXELS = 12_000_000;
export const OCR_FINE_PASS_CONFIDENCE = 80;
export function ocrNeedsFinePass(confidence: number): boolean {
  return !(confidence >= OCR_FINE_PASS_CONFIDENCE);
}
export function ocrRenderScale(pageWidthPt: number, pageHeightPt: number): number {
  const target = OCR_TARGET_DPI / 72;
  const pixels = pageWidthPt * target * pageHeightPt * target;
  if (!(pixels > OCR_MAX_PIXELS)) return target;
  return Math.max(1, target * Math.sqrt(OCR_MAX_PIXELS / pixels));
}

export type OcrErrorCode = 'language-unavailable' | 'engine-failed';
export class OcrError extends Error {
  code: OcrErrorCode;
  constructor(code: OcrErrorCode, message: string) {
    super(message);
    this.name = 'OcrError';
    this.code = code;
  }
}

export const OCR_LANG_PATH = '/tesseract/lang-data';

/** True when the language's data file is on this server (what Tesseract is about to fetch). */
export async function ocrLanguageAvailable(language: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(`${OCR_LANG_PATH}/${language}.traineddata.gz`, { method: 'HEAD' });
    // A missing file can come back as an HTML "not found" page — never mistake that for data.
    return res.ok && !(res.headers.get('content-type') ?? '').includes('text/html');
  } catch {
    return false;
  }
}

export async function ocrPdfClient(
  file: File,
  language = 'pol',
  onProgress?: (page: number, total: number) => void
): Promise<{ pdfData: Uint8Array; text: string; droppedWordCount: number; droppedWordSamples: string[] }> {
  const buf = await file.arrayBuffer().catch((e) => {
    console.error('[OCR] Error reading file:', e);
    throw new Error('Nie można odczytać pliku');
  });

  const bufForPdfjs = buf.slice(0);
  const bufForPdfLib = buf.slice(0);

  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bufForPdfjs) }).promise;

  const origPdf = await PDFDocument.load(bufForPdfLib, { ignoreEncryption: true });
  // FINDING (2026-09-23) — same class of bug already found and fixed for 16 functions in
  // lib/client-pdf.ts (Krok 20): ignoreEncryption only skips pdf-lib's own "encrypted, can't
  // proceed" throw — pdf-lib has no decryption logic anywhere, so every stream/string in an
  // owner-password-protected PDF (openable without a password — a real, common case, e.g. a
  // permission-restricted scan) stays raw ciphertext. newPdf.copyPages() a few lines below
  // copies the original page's still-encrypted /Contents stream into a document with no
  // /Encrypt dict, so a normal viewer renders that ciphertext as garbage/blank content — while
  // the OCR text layer drawn on top is perfectly positioned and searchable, the opposite of
  // what OCR is meant to preserve (visible original + added searchability).
  if (origPdf.isEncrypted) throw new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.');
  const newPdf = await PDFDocument.create();

  // tesseract.js swallows a failed language download (createWorker's own chain ends in
  // `.catch(() => {})` and only a failed CORE load rejects), so a language whose data is missing
  // left the returned promise pending forever — the page showed "loading" until it was closed.
  // Check first, and turn any later engine error into a rejection as well.
  if (!(await ocrLanguageAvailable(language))) {
    throw new OcrError('language-unavailable', `Dane języka OCR "${language}" są niedostępne.`);
  }
  const { createWorker } = await import('tesseract.js');
  let engineFailed: (reason: OcrError) => void = () => {};
  const engineError = new Promise<never>((_, reject) => { engineFailed = reject; });
  engineError.catch(() => {});
  const tessWorker = await Promise.race([
    createWorker(language, undefined, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/',
      langPath: OCR_LANG_PATH,
      errorHandler: (e: unknown) => engineFailed(new OcrError('engine-failed', String((e as Error)?.message ?? e))),
    }),
    engineError,
  ]);

  let fullText = '';
  const totalPages = origPdf.getPageCount();
  const font = await embedLiberationSans(newPdf);
  const dropStats = { count: 0, samples: new Set<string>() };

  try {
    for (let i = 0; i < totalPages; i++) {
      onProgress?.(i + 1, totalPages);
      try {
        const page = await doc.getPage(i + 1);
        const base = page.getViewport({ scale: 1 });

        const recognizeAt = async (scale: number) => {
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          // tesseract.js (v6+) returns ONLY `text` unless other outputs are asked for; without
          // `blocks` there are no words and no boxes, so the "searchable PDF" had no text layer.
          const { data } = await tessWorker.recognize(canvas, {}, { text: true, blocks: true });
          // Release the page bitmap now: at 300 DPI a canvas is tens of megabytes.
          canvas.width = 0;
          canvas.height = 0;
          return { data, canvasWidth, canvasHeight, confidence: Number((data as { confidence?: number }).confidence ?? 0) };
        };

        // First pass at the resolution that is fastest and reads normal body type best; a page
        // the engine is unsure about (small print, dense tables) is read again at 300 DPI and the
        // more confident reading wins.
        const fineScale = ocrRenderScale(base.width, base.height);
        // An oversized page (a poster) is capped already on the first pass.
        const baseScale = Math.min(OCR_BASE_SCALE, fineScale);
        let best = await recognizeAt(baseScale);
        if (ocrNeedsFinePass(best.confidence) && fineScale > baseScale * 1.2) {
          const fine = await recognizeAt(fineScale);
          if (fine.confidence > best.confidence) best = fine;
        }
        const { data, canvasWidth, canvasHeight } = best;
        const words = extractWords(data);
        const { dropped, samples } = await createOcrPage(newPdf, origPdf, i, words, font, canvasWidth, canvasHeight);
        if (dropped > 0) {
          dropStats.count += dropped;
          samples.forEach(s => dropStats.samples.add(s));
          console.warn(`[OCR] Page ${i + 1}/${totalPages} — skipped ${dropped} words from unsupported scripts (e.g. ${samples.slice(0, 3).join(', ')}...)`);
        }

        const pageText = extractFullText(data);
        if (pageText) {
          fullText += (fullText ? '\n\n' : '') + pageText;
        }

        console.log(`[OCR] Page ${i + 1}/${totalPages} — ${words.length} words`);
      } catch (e) {
        const err = e as Error;
        console.error('========== OCR ERROR ==========');
        console.error('Page:', i + 1, '/', totalPages);
        console.error('Name:', err.name);
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
        console.error('===============================');
        throw new Error(`Błąd OCR na stronie ${i + 1}: ${err.message}`);
      }
    }
  } finally {
    // A page-level error above throws out of the loop — without this finally, the pdf.js
    // document and (worse) the Tesseract worker (a Web Worker holding WASM memory) would
    // leak, since the code that used to clean them up right after the loop never ran.
    await doc.cleanup();
    await tessWorker.terminate();
  }

  if (dropStats.count > 0) {
    console.warn(`[OCR] Total: ${dropStats.count} words from unsupported scripts could not be added to the searchable text layer: ${[...dropStats.samples].slice(0, 5).join(', ')}...`);
  }

  const pdfData = await newPdf.save() as unknown as Uint8Array;
  return { pdfData, text: fullText, droppedWordCount: dropStats.count, droppedWordSamples: [...dropStats.samples] };
}
