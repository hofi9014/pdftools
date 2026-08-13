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
} from 'pdf-lib';

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

function canvasToPngBytes(canvas: RasterCanvas): Uint8Array {
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
  throw new Error('Canvas nie udostępnia toBuffer ani toDataURL');
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
  const png = canvasToPngBytes(canvas);
  await doc.cleanup();

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const libPage = pdfDoc.getPage(pageIndex);
  const { width, height } = libPage.getSize();
  const image = await pdfDoc.embedPng(png);
  const xObjectKey = libPage.node.newXObject('Image', image.ref);
  const operators: PDFOperator[] = [
    pushGraphicsState(),
    translate(0, 0),
    scaleOperator(width, height),
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
