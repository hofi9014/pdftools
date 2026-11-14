// The PDF engine (lib/client-pdf.ts: pdf-lib, fontkit, pdf.js glue, the converters) for tool pages
// and their components, loaded when it is first needed instead of with the page.
//
// Measured 2026-11-12 on a production build: every tool page shipped ~620-790 kB more JavaScript
// in its initial HTML than a plain page (1.28-1.43 MB vs 0.63 MB), because the page imported the
// engine statically — all of it was downloaded and parsed before the page became interactive,
// although nothing runs until a file is chosen. And because the header links to all 40 tools,
// Next prefetched that engine on every page of the site, home page included.
//
// Every function here has the same name and signature as in lib/client-pdf.ts (all of them were
// already async), so a page only changes its import path. useIdlePreload (hooks/useIdlePreload.ts)
// with preloadPdfEngine fetches the engine once the page is idle: by the time a file is chosen it
// is usually there, and the service worker keeps it for offline use exactly as before, when it
// came with the page. Code under lib/ keeps importing lib/client-pdf directly.

import type * as ClientPdf from './client-pdf';

export type { PageDiff, FormField, PdfEditElement } from './client-pdf';
export { UNRELATED_DOCUMENTS_THRESHOLD } from './pdf/compareThreshold';

type Engine = typeof ClientPdf;

let engine: Promise<Engine> | undefined;

/** The engine module, fetched once. A failed fetch (offline, deploy in between) is retried next time. */
export function loadPdfEngine(): Promise<Engine> {
  if (!engine) {
    engine = import('./client-pdf').catch((err: unknown) => {
      engine = undefined;
      throw err;
    });
  }
  return engine;
}

/**
 * For useIdlePreload: the engine module only. pdf.js itself (~420 kB) stays loaded on first use
 * (initPdfjs), as it was before — preloading it would add bytes the page never fetched up front.
 */
export function preloadPdfEngine(): Promise<unknown> {
  return loadPdfEngine();
}

type Lazy<F> = F extends (...args: infer A) => Promise<infer R> ? (...args: A) => Promise<R> : never;

function lazy<K extends keyof Engine>(name: K): Lazy<Engine[K]> {
  const call = async (...args: unknown[]) => {
    const fn = (await loadPdfEngine())[name] as unknown as (...a: unknown[]) => unknown;
    return fn(...args);
  };
  return call as unknown as Lazy<Engine[K]>;
}

export const addBlankPage = lazy('addBlankPage');
export const addPageNumbers = lazy('addPageNumbers');
export const addWatermark = lazy('addWatermark');
export const comparePdfSimilarity = lazy('comparePdfSimilarity');
export const comparePdfTextClient = lazy('comparePdfTextClient');
export const comparePdfVisual = lazy('comparePdfVisual');
export const compressPDFClient = lazy('compressPDFClient');
export const convertToPdfA = lazy('convertToPdfA');
export const cropPages = lazy('cropPages');
export const deletePages = lazy('deletePages');
export const downloadPdf = lazy('downloadPdf');
export const downloadZip = lazy('downloadZip');
export const editMetadata = lazy('editMetadata');
export const editPdfClient = lazy('editPdfClient');
export const extractFormFields = lazy('extractFormFields');
export const extractImagesFromPdf = lazy('extractImagesFromPdf');
export const extractPages = lazy('extractPages');
export const extractTextFromPDF = lazy('extractTextFromPDF');
export const fillFormFields = lazy('fillFormFields');
export const flattenPDF = lazy('flattenPDF');
export const getPageCount = lazy('getPageCount');
export const imagesToPdf = lazy('imagesToPdf');
export const initPdfjs = lazy('initPdfjs');
export const mergePDFs = lazy('mergePDFs');
export const officeToPdf = lazy('officeToPdf');
export const pdfToEpub = lazy('pdfToEpub');
export const pdfToHtml = lazy('pdfToHtml');
export const pdfToIRDeck = lazy('pdfToIRDeck');
export const pdfToIRSpreadsheet = lazy('pdfToIRSpreadsheet');
export const pdfToOdt = lazy('pdfToOdt');
export const pdfToSvgPages = lazy('pdfToSvgPages');
export const pdfToWord = lazy('pdfToWord');
export const protectPdfClient = lazy('protectPdfClient');
export const redactPdfRaster = lazy('redactPdfRaster');
export const reorderPages = lazy('reorderPages');
export const rotatePDF = lazy('rotatePDF');
export const signPdfClient = lazy('signPdfClient');
export const splitByRanges = lazy('splitByRanges');
export const splitBySelection = lazy('splitBySelection');
export const splitPDF = lazy('splitPDF');
export const unlockPdfClient = lazy('unlockPdfClient');
