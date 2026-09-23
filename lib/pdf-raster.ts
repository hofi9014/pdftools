import {
  PDFDocument,
  PDFName,
  PDFContentStream,
  PDFRef,
  PDFDict,
  PDFArray,
  PDFObject,
  PDFRawStream,
  PDFOperator,
  pushGraphicsState,
  popGraphicsState,
  translate,
  drawObject,
  scale as scaleOperator,
  rotateDegrees,
} from 'pdf-lib';

// FINDING (2026-09-23) — both rasterizePage/rasterizePages placed the redacted-page PNG using
// the RAW (unrotated) MediaBox size from page.getSize() and a plain translate(0,0)+scale, with
// no compensating rotation — ignoring the page's own /Rotate entry entirely (the same bug class
// already found and fixed for addPageNumbers/addWatermark in client-pdf.ts, Krok 17, and for
// cropPages' MediaBox-origin handling, Krok 9). But pdf.js's page.getViewport({scale}) — used to
// render the source PNG a few lines above this — defaults its own `rotation` parameter to
// `this.rotate` (confirmed in pdfjs-dist source), so the rendered PNG already has the page's
// rotation baked in: for /Rotate 90 or 270 its pixel dimensions are SWAPPED relative to the raw
// MediaBox, and its content is already oriented the way a viewer displays it. Scaling that
// already-rotated bitmap into the raw (unrotated) MediaBox rectangle distorted the aspect ratio
// for 90/270, and leaving /Rotate untouched then made a normal viewer rotate the (already
// rotated) image a SECOND time on top of that — for redacting any rotated scanned page (common:
// scanners routinely store a landscape page as a portrait MediaBox + /Rotate 90/270), the
// redacted output came back squished and/or sideways/upside-down instead of matching the
// original layout.
//
// Fixed with the same visualPageSize()/visualToRawPoint() pattern already verified for
// addPageNumbers/addWatermark (duplicated here rather than imported from client-pdf.ts, which
// pulls in a large browser-only module graph that lib/redact-worker.ts's Web Worker bundle must
// not depend on): visualPageSize() gives the PNG's actual (rotation-aware) pixel-aspect
// dimensions; visualToRawPoint() maps the desired visual bottom-left corner (0,0) back to raw
// content-space coordinates; the image is drawn there at that visual size with a compensating
// `rotateDegrees(pageRotationDeg)`, which cancels the viewer's own clockwise /Rotate the same way
// it already does for watermark/page-number text. getMediaBox() (not getSize()) is used so a
// MediaBox that doesn't start at (0,0) is handled too (same class of fix as cropPages, Krok 9).
function visualPageSize(rawWidth: number, rawHeight: number, rotationDeg: number): { width: number; height: number } {
  const rot = ((rotationDeg % 360) + 360) % 360;
  return rot === 90 || rot === 270 ? { width: rawHeight, height: rawWidth } : { width: rawWidth, height: rawHeight };
}

function visualToRawPoint(rawWidth: number, rawHeight: number, rotationDeg: number, vx: number, vy: number): { x: number; y: number } {
  const rot = ((rotationDeg % 360) + 360) % 360;
  if (rot === 90) return { x: rawWidth - vy, y: vx };
  if (rot === 180) return { x: rawWidth - vx, y: rawHeight - vy };
  if (rot === 270) return { x: vy, y: rawHeight - vx };
  return { x: vx, y: vy };
}

export interface RedactRegion {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RasterCanvas {
  width: number;
  height: number;
  toBuffer?(format: 'image/png'): Uint8Array;
  toDataURL?(format: 'image/png'): string;
  convertToBlob?(options?: unknown): Promise<Blob>;
}

export interface RasterContext {
  canvas: RasterCanvas;
  fillStyle: string;
  fillRect(x: number, y: number, w: number, h: number): void;
}

export interface RasterCanvasFactory {
  create(w: number, h: number): { canvas: RasterCanvas; context: RasterContext };
  reset?(ctx: unknown, w: number, h: number): void;
  destroy?(ctx: unknown): void;
}

interface PdfjsViewport {
  width: number;
  height: number;
}

interface PdfjsPage {
  getViewport(opts: { scale: number }): PdfjsViewport;
  render(params: {
    canvasContext: unknown;
    viewport: PdfjsViewport;
    canvasFactory?: RasterCanvasFactory;
  }): { promise: Promise<void> };
}

interface PdfjsDoc {
  numPages: number;
  getPage(n: number): Promise<PdfjsPage>;
  cleanup(): Promise<unknown>;
}

export interface PdfjsLibLike {
  getDocument(src: Record<string, unknown>): { promise: Promise<PdfjsDoc> };
}

export const REDACT_RENDER_SCALE = 2;

async function canvasToPngBytes(canvas: RasterCanvas): Promise<Uint8Array> {
  if (typeof canvas.toBuffer === 'function') {
    const buf = canvas.toBuffer('image/png');
    return new Uint8Array(buf);
  }
  if (typeof canvas.toDataURL === 'function') {
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1] || '';
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  if (typeof canvas.convertToBlob === 'function') {
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Uint8Array(await blob.arrayBuffer());
  }
  throw new Error('Canvas nie udostępnia toBuffer, toDataURL ani convertToBlob');
}

function collectContentsRefs(pdfDoc: PDFDocument, obj: PDFObject | undefined): PDFRef[] {
  const refs: PDFRef[] = [];
  if (!obj) return refs;
  if (obj instanceof PDFRef) {
    refs.push(obj);
    return refs;
  }
  if (obj instanceof PDFArray) {
    for (const el of obj.asArray()) {
      if (el instanceof PDFRef) refs.push(el);
    }
  }
  return refs;
}

function pruneResources(resDict: PDFDict | undefined, keepCategory: string, keepKey: string): PDFRef[] {
  const removedRefs: PDFRef[] = [];
  if (!resDict) return removedRefs;
  for (const [catName, catVal] of resDict.entries()) {
    if (!(catVal instanceof PDFDict)) continue;
    const category = catVal;
    for (const [key, val] of category.entries()) {
      const isKeep = catName.toString() === keepCategory && key.toString() === keepKey;
      if (isKeep) continue;
      if (val instanceof PDFRef) removedRefs.push(val);
      category.delete(key);
    }
    if (catName.toString() !== keepCategory && category.entries().length === 0) {
      resDict.delete(catName);
    }
  }
  return removedRefs;
}

function reachableRefs(pdfDoc: PDFDocument): Set<string> {
  const refs = new Set<string>();
  const seen = new Set<PDFObject>();
  const context = pdfDoc.context;
  const walk = (obj: PDFObject | undefined): void => {
    if (!obj || typeof obj !== 'object') return;
    if (seen.has(obj)) return;
    seen.add(obj);
    if (obj instanceof PDFRef) {
      refs.add(obj.toString());
      const target = context.lookup(obj);
      if (target) walk(target);
      return;
    }
    if (obj instanceof PDFArray) {
      for (const el of obj.asArray()) walk(el);
      return;
    }
    if (obj instanceof PDFDict) {
      for (const [, v] of obj.entries()) walk(v);
      return;
    }
    if (obj instanceof PDFRawStream) walk(obj.dict);
  };
  walk(pdfDoc.catalog);
  const trailerInfo = pdfDoc.context.trailerInfo as Record<string, PDFObject | undefined> | undefined;
  walk(trailerInfo?.Info);
  return refs;
}

function deleteUnreachableRefs(pdfDoc: PDFDocument, candidateRefs: PDFRef[]): void {
  if (!candidateRefs.length) return;
  const reachable = reachableRefs(pdfDoc);
  for (const ref of candidateRefs) {
    if (!reachable.has(ref.toString())) pdfDoc.context.delete(ref);
  }
}

export async function rasterizePage(
  pdfjsLib: PdfjsLibLike,
  canvasFactory: RasterCanvasFactory,
  pdfBytes: Uint8Array,
  pageIndex: number,
  scale: number,
  regions: RedactRegion[],
  documentOptions: Record<string, unknown> = {},
): Promise<Uint8Array> {
  const renderData = new Uint8Array(pdfBytes);
  const loadingTask = pdfjsLib.getDocument({ data: renderData, canvasFactory, ...documentOptions });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  const vw = Math.max(1, Math.round(viewport.width));
  const vh = Math.max(1, Math.round(viewport.height));
  const { canvas, context } = canvasFactory.create(vw, vh);
  await page.render({ canvasContext: context, viewport, canvasFactory }).promise;
  context.fillStyle = '#000000';
  for (const r of regions) {
    context.fillRect(r.x * vw, r.y * vh, r.width * vw, r.height * vh);
  }
  const png = await canvasToPngBytes(canvas);
  await doc.cleanup();

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const libPage = pdfDoc.getPage(pageIndex);
  const { x: x0, y: y0, width: rawWidth, height: rawHeight } = libPage.getMediaBox();
  const pageRotationDeg = libPage.getRotation().angle;
  const { width: visW, height: visH } = visualPageSize(rawWidth, rawHeight, pageRotationDeg);
  const { x: rawX, y: rawY } = visualToRawPoint(rawWidth, rawHeight, pageRotationDeg, 0, 0);
  const image = await pdfDoc.embedPng(png);
  const xObjectKey = libPage.node.newXObject('Image', image.ref);
  const operators: PDFOperator[] = [
    pushGraphicsState(),
    translate(x0 + rawX, y0 + rawY),
    rotateDegrees(pageRotationDeg),
    scaleOperator(visW, visH),
    drawObject(xObjectKey),
    popGraphicsState(),
  ];
  const oldContents = libPage.node.get(PDFName.of('Contents'));
  const contentDict = pdfDoc.context.obj({});
  const contentStream = PDFContentStream.of(contentDict, operators);
  const contentStreamRef = pdfDoc.context.register(contentStream);
  libPage.node.set(PDFName.of('Contents'), contentStreamRef);
  const removedRefs: PDFRef[] = collectContentsRefs(pdfDoc, oldContents);
  removedRefs.push(...pruneResources(libPage.node.Resources(), '/XObject', xObjectKey.toString()));
  deleteUnreachableRefs(pdfDoc, removedRefs);
  return new Uint8Array(await pdfDoc.save({ useObjectStreams: false }));
}

/**
 * Same redaction as rasterizePage, but for every page that needs it in one pass: one pdf.js
 * load, one pdf-lib load, one save — instead of a caller looping rasterizePage() per page,
 * which reloads/reparses/resaves the (growing) PDF once per redacted page. A document with
 * redactions on N pages previously did N full parse+save cycles; this does one.
 */
export async function rasterizePages(
  pdfjsLib: PdfjsLibLike,
  canvasFactory: RasterCanvasFactory,
  pdfBytes: Uint8Array,
  regions: RedactRegion[],
  scale: number,
  documentOptions: Record<string, unknown> = {},
): Promise<Uint8Array> {
  const renderData = new Uint8Array(pdfBytes);
  const loadingTask = pdfjsLib.getDocument({ data: renderData, canvasFactory, ...documentOptions });
  const doc = await loadingTask.promise;
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  const pageIndexes = [...new Set(regions.map((r) => r.page))].sort((a, b) => a - b);
  const allRemovedRefs: PDFRef[] = [];

  for (const pageIndex of pageIndexes) {
    const pageRegions = regions.filter((r) => r.page === pageIndex);
    const page = await doc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale });
    const vw = Math.max(1, Math.round(viewport.width));
    const vh = Math.max(1, Math.round(viewport.height));
    const { canvas, context } = canvasFactory.create(vw, vh);
    await page.render({ canvasContext: context, viewport, canvasFactory }).promise;
    context.fillStyle = '#000000';
    for (const r of pageRegions) {
      context.fillRect(r.x * vw, r.y * vh, r.width * vw, r.height * vh);
    }
    const png = await canvasToPngBytes(canvas);

    const libPage = pdfDoc.getPage(pageIndex);
    const { x: x0, y: y0, width: rawWidth, height: rawHeight } = libPage.getMediaBox();
    const pageRotationDeg = libPage.getRotation().angle;
    const { width: visW, height: visH } = visualPageSize(rawWidth, rawHeight, pageRotationDeg);
    const { x: rawX, y: rawY } = visualToRawPoint(rawWidth, rawHeight, pageRotationDeg, 0, 0);
    const image = await pdfDoc.embedPng(png);
    const xObjectKey = libPage.node.newXObject('Image', image.ref);
    const operators: PDFOperator[] = [
      pushGraphicsState(),
      translate(x0 + rawX, y0 + rawY),
      rotateDegrees(pageRotationDeg),
      scaleOperator(visW, visH),
      drawObject(xObjectKey),
      popGraphicsState(),
    ];
    const oldContents = libPage.node.get(PDFName.of('Contents'));
    const contentDict = pdfDoc.context.obj({});
    const contentStream = PDFContentStream.of(contentDict, operators);
    const contentStreamRef = pdfDoc.context.register(contentStream);
    libPage.node.set(PDFName.of('Contents'), contentStreamRef);
    allRemovedRefs.push(...collectContentsRefs(pdfDoc, oldContents));
    allRemovedRefs.push(...pruneResources(libPage.node.Resources(), '/XObject', xObjectKey.toString()));
  }

  await doc.cleanup();
  deleteUnreachableRefs(pdfDoc, allRemovedRefs);

  // Rasterizing a page replaces its /Contents with a flat image, destroying any marked-content
  // (text runs, MCIDs) that a /StructTreeRoot's structure elements point into. The catalog
  // itself is untouched, so a source PDF that had real structure would otherwise carry a
  // MarkInfo/Marked=true claim forward while pointing into content that no longer exists on
  // the redacted page(s) — the same "claims tagged, isn't" problem fixed in convertToPdfA
  // (lib/client-pdf.ts). Correctly pruning just the affected structure elements would require
  // full structure-tree surgery (out of scope here); the honest, safe choice is to drop the
  // claim entirely rather than ship a tree that no longer matches the content.
  if (pageIndexes.length > 0 && pdfDoc.catalog.lookupMaybe(PDFName.of('StructTreeRoot'), PDFDict)) {
    pdfDoc.catalog.delete(PDFName.of('StructTreeRoot'));
    pdfDoc.catalog.delete(PDFName.of('MarkInfo'));
  }

  return new Uint8Array(await pdfDoc.save({ useObjectStreams: false }));
}
