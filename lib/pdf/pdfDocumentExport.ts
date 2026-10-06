// PDF → Word (.docx) / OpenDocument (.odt) with a choice of engine:
//
//   'flow'  — paragraphs, lists and real tables rebuilt from the page (the original engine);
//             right for plain text documents, wrong for designed pages.
//   'fixed' — every page looks as it does in the PDF: its graphics become a picture behind the
//             text, the text is put back on top, editable, where it was (lib/pdf/fixedLayout.ts).
//   'auto'  — looks at the pages and picks one (detectPdfLayoutMode).
//
// The tool pages call these; pdfToWordIR / renderIRToOdt remain the flow engine's own entry
// points and are unchanged.

import type { DocxImage } from '../client-pdf-docx';

export type PdfLayoutMode = 'auto' | 'fixed' | 'flow';
export type ResolvedPdfLayout = 'fixed' | 'flow';

export interface PdfDocumentResult {
  blob: Blob;
  /** The engine that produced the document. */
  layout: ResolvedPdfLayout;
}

export const PDF_LAYOUT_MODES: readonly PdfLayoutMode[] = ['auto', 'fixed', 'flow'];

/** 'auto' resolved by looking at the document; a document that cannot be analysed goes to flow. */
export async function resolvePdfLayout(file: File, mode: PdfLayoutMode): Promise<ResolvedPdfLayout> {
  if (mode !== 'auto') return mode;
  try {
    const { detectPdfLayoutMode } = await import('./fixedLayoutPdf');
    return (await detectPdfLayoutMode(file)).mode;
  } catch (err) {
    console.error('layout detection failed, using the flow engine:', err);
    return 'flow';
  }
}

async function flowDocx(file: File): Promise<Blob> {
  const { pdfToWordIR } = await import('../client-pdf');
  return pdfToWordIR(file);
}

async function flowOdt(file: File): Promise<Blob> {
  const { extractFormattedTextFromPDF } = await import('../client-pdf');
  const { renderIRToOdt, writerImageToDocxImage } = await import('../client-pdf-docx');
  const { buildPdfImageMap } = await import('./extractPdfImages');
  const pages = await extractFormattedTextFromPDF(file);
  const imageMap = await buildPdfImageMap(file, []);
  const odtImages = new Map<string, DocxImage>();
  for (const [id, img] of imageMap.images) odtImages.set(id, writerImageToDocxImage(img));
  return renderIRToOdt(pages, odtImages);
}

async function convert(file: File, mode: PdfLayoutMode, format: 'docx' | 'odt'): Promise<PdfDocumentResult> {
  const layout = await resolvePdfLayout(file, mode);
  if (layout === 'fixed') {
    try {
      const { pdfToFixedPages } = await import('./fixedLayoutPdf');
      const { pages } = await pdfToFixedPages(file);
      const blob = format === 'docx'
        ? await (await import('./fixedLayoutDocx')).renderFixedPagesToDocx(pages)
        : await (await import('./fixedLayoutOdt')).renderFixedPagesToOdt(pages);
      return { blob, layout: 'fixed' };
    } catch (err) {
      // An explicit request for the fixed layout must not silently turn into something else.
      if (mode === 'fixed') throw err;
      console.error('fixed layout failed, using the flow engine:', err);
    }
  }
  return { blob: format === 'docx' ? await flowDocx(file) : await flowOdt(file), layout: 'flow' };
}

export function pdfToDocxDocument(file: File, mode: PdfLayoutMode = 'auto'): Promise<PdfDocumentResult> {
  return convert(file, mode, 'docx');
}

export function pdfToOdtDocument(file: File, mode: PdfLayoutMode = 'auto'): Promise<PdfDocumentResult> {
  return convert(file, mode, 'odt');
}
