import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { initPdfjs } from '@/lib/client-pdf';

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

function preprocessCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const contrast = 1.3;
    const adjusted = 128 + (gray - 128) * contrast;
    const clamped = Math.max(0, Math.min(255, adjusted));
    data[i] = clamped;
    data[i + 1] = clamped;
    data[i + 2] = clamped;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

async function createOcrPage(
  newPdf: PDFDocument,
  origPdf: PDFDocument,
  pageIndex: number,
  words: Word[]
) {
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

export async function ocrPdfClient(
  file: File,
  language = 'pol',
  onProgress?: (page: number, total: number) => void
): Promise<{ pdfData: Uint8Array; text: string }> {
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
  const newPdf = await PDFDocument.create();

  const { createWorker } = await import('tesseract.js');
  const tessWorker = await createWorker(language, undefined, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/',
    langPath: '/tesseract/lang-data',
  });

  let fullText = '';
  const totalPages = origPdf.getPageCount();

  for (let i = 0; i < totalPages; i++) {
    onProgress?.(i + 1, totalPages);
    try {
      const page = await doc.getPage(i + 1);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      preprocessCanvas(canvas);

      const { data } = await tessWorker.recognize(canvas.toDataURL('image/png'));
      const words = extractWords(data);
      await createOcrPage(newPdf, origPdf, i, words);

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

  await doc.cleanup();
  await tessWorker.terminate();

  const pdfData = await newPdf.save() as unknown as Uint8Array;
  return { pdfData, text: fullText };
}
