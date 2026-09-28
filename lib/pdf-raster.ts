import {
  PDFDocument,
  PDFName,
  PDFContentStream,
  PDFDict,
  PDFRef,
  PDFArray,
  PDFOperator,
  pushGraphicsState,
  popGraphicsState,
  translate,
  drawObject,
  scale as scaleOperator,
  rotateDegrees,
  type PDFPage,
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

// FINDING (2026-09-28) — rasterizePage(s) used to mutate a redacted page's EXISTING /Resources
// dict in place (pruneResources: delete every entry except the new image XObject), then run a
// document-wide reachability sweep (deleteUnreachableRefs) to garbage-collect any now-orphaned
// font/XObject the redacted page(s) used to reference — on the theory that a still-reachable ref
// (because some OTHER, non-redacted page still points to it) would survive the sweep. On a real
// user file (12 pages sharing one Font dict's worth of indirect font refs across every page,
// exactly the common "one shared font set for the whole document" producer pattern) the redacted
// output came back with EVERY page's /Resources missing its fonts — including pages that were
// never touched, still carrying their ORIGINAL vector text — so opening it showed correct text
// geometry rendered in pdf.js's/Acrobat's fallback font (garbled: missing Polish glyphs, wrong
// metrics) instead of the real one, and Acrobat itself reported a page-content error. The exact
// mechanism wasn't pinned down (a synthetic repro with the same shared-font-refs shape did NOT
// reproduce it through this same code path), but the design itself is fragile by construction:
// deleting a resource ref globally makes correctness depend on a hand-rolled reachability walker
// correctly re-discovering every remaining reference, across however the source PDF happens to
// structure its page tree — one blind spot (or one edge case in a producer's structure) corrupts
// every page in the document, not just the redacted ones.
//
// Fixed by never touching /Resources at all: a redacted page gets pointed at a BRAND-NEW, private
// dict containing only its own new image, instead of a mutated one — this is safe by construction,
// since the operation then never mutates or deletes any resource object another page might share.
//
// The OLD /Contents stream is a different matter: unlike /Resources, /Contents is NOT one of
// PDF's inheritable page attributes (PDFPageLeaf.InheritableEntries lists only Resources,
// MediaBox, CropBox, Rotate), so it can't be silently shared via the same ancestor-inheritance
// mechanism — but redaction exists specifically to make sensitive text UNRECOVERABLE, so simply
// leaving the old (still-legible) content stream as an "unreferenced" object in the file would
// defeat the tool's entire purpose: the text is still sitting right there in the saved bytes for
// anyone who inflates every stream in the PDF rather than only the ones a normal viewer reaches.
// contentRefUsage (built once per document from every page's CURRENT /Contents, before any page
// is rewritten) counts how many pages reference each content ref; the old ref is deleted only
// when this page is its sole user — the same narrow, cheap-to-verify safety check, scoped to the
// one field that actually needs it, instead of the previous broad, document-wide, easy-to-get-
// wrong reachability sweep over every kind of resource.
function contentRefsOf(pageNode: PDFPage['node']): PDFRef[] {
  const val = pageNode.get(PDFName.of('Contents'));
  if (val instanceof PDFRef) return [val];
  if (val instanceof PDFArray) {
    const out: PDFRef[] = [];
    for (const el of val.asArray()) if (el instanceof PDFRef) out.push(el);
    return out;
  }
  return [];
}

function countContentRefUsage(pdfDoc: PDFDocument): Map<string, number> {
  const counts = new Map<string, number>();
  for (const page of pdfDoc.getPages()) {
    for (const ref of contentRefsOf(page.node)) {
      const key = ref.toString();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Replaces a page's content with a flattened raster image: embeds the PNG, points the page at a
 * brand-new, private /Resources dict containing only that image (never the page's existing one —
 * see the docblock above), deletes the page's OLD /Contents stream(s) when this page is their only
 * user (see docblock), and replaces /Contents with a stream that draws the new image.
 */
async function replacePageWithRasterImage(
  pdfDoc: PDFDocument,
  libPage: PDFPage,
  png: Uint8Array,
  contentRefUsage: Map<string, number>,
): Promise<void> {
  const { x: x0, y: y0, width: rawWidth, height: rawHeight } = libPage.getMediaBox();
  const pageRotationDeg = libPage.getRotation().angle;
  const { width: visW, height: visH } = visualPageSize(rawWidth, rawHeight, pageRotationDeg);
  const { x: rawX, y: rawY } = visualToRawPoint(rawWidth, rawHeight, pageRotationDeg, 0, 0);
  const image = await pdfDoc.embedPng(png);
  const resources = pdfDoc.context.obj({
    XObject: { Im0: image.ref },
    ProcSet: ['PDF', 'ImageB', 'ImageC', 'ImageI'],
  });
  const oldContentRefs = contentRefsOf(libPage.node);
  libPage.node.set(PDFName.of('Resources'), resources);
  const operators: PDFOperator[] = [
    pushGraphicsState(),
    translate(x0 + rawX, y0 + rawY),
    rotateDegrees(pageRotationDeg),
    scaleOperator(visW, visH),
    drawObject(PDFName.of('Im0')),
    popGraphicsState(),
  ];
  const contentDict = pdfDoc.context.obj({});
  const contentStream = PDFContentStream.of(contentDict, operators);
  const contentStreamRef = pdfDoc.context.register(contentStream);
  libPage.node.set(PDFName.of('Contents'), contentStreamRef);
  for (const ref of oldContentRefs) {
    if (contentRefUsage.get(ref.toString()) === 1) pdfDoc.context.delete(ref);
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
  await replacePageWithRasterImage(pdfDoc, libPage, png, countContentRefUsage(pdfDoc));
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
  // Built once, from every page's CURRENT /Contents, before any page in this batch is rewritten —
  // so a content ref shared between two pages BOTH being redacted in this same call is still
  // correctly counted as shared (and thus kept) rather than looking like an orphan the moment the
  // first of the two pages is processed.
  const contentRefUsage = countContentRefUsage(pdfDoc);

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
    await replacePageWithRasterImage(pdfDoc, libPage, png, contentRefUsage);
  }

  await doc.cleanup();

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
