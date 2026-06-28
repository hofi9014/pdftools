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
      // skip invalid words
    }
  }
}

// tesseract.js types are incomplete, use any for compatibility
let tesseractModule: any = null;
let worker: any = null;

async function getWorker() {
  if (!tesseractModule) {
    tesseractModule = await import('tesseract.js');
  }
  if (!worker) {
    worker = await tesseractModule.createWorker('pol');
  }
  return worker;
}

export async function ocrPdfClient(file: File, language = 'pol'): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();

  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;

  const origPdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  // Set up tesseract.js worker
  const { createWorker } = await import('tesseract.js');
  const tessWorker = await createWorker(language);

  for (let i = 0; i < origPdf.getPageCount(); i++) {
    try {
      const page = await doc.getPage(i + 1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const imageData = canvas.toDataURL('image/png');
      const { data } = await tessWorker.recognize(imageData);
      const words = extractWords(data);
      await createOcrPage(newPdf, origPdf, i, words);
    } catch (e) {
      console.error('OCR page', i + 1, 'error:', (e as Error)?.message || e);
    }
  }

  await doc.cleanup();
  await tessWorker.terminate();

  return newPdf.save() as unknown as Uint8Array;
}
