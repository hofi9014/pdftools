import 'pdfjs-dist/build/pdf.worker.min.mjs';
import { rasterizePage, REDACT_RENDER_SCALE, type RedactRegion, type RasterCanvas, type RasterCanvasFactory, type RasterContext, type PdfjsLibLike } from './pdf-raster';

export type RedactWorkerRequest = {
  id: number;
  type: 'redact';
  buf: ArrayBuffer;
  regions: RedactRegion[];
};

export type RedactWorkerResponse =
  | { id: number; type: 'ok'; buf: ArrayBuffer }
  | { id: number; type: 'error'; message: string };

class WorkerCanvasFactory implements RasterCanvasFactory {
  readonly #enableHWA: boolean;

  constructor({ enableHWA = false }: { ownerDocument?: unknown; enableHWA?: boolean } = {}) {
    this.#enableHWA = enableHWA;
  }

  create(w: number, h: number): { canvas: RasterCanvas; context: RasterContext } {
    const canvas = new OffscreenCanvas(w, h);
    const context = canvas.getContext('2d', { willReadFrequently: !this.#enableHWA });
    if (!context) {
      throw new Error('OffscreenCanvas 2D context is not available');
    }
    return { canvas, context: context as unknown as RasterContext };
  }

  reset(ctx: unknown, w: number, h: number): void {
    const canvas = (ctx as RasterContext).canvas;
    canvas.width = w;
    canvas.height = h;
  }

  destroy(ctx: unknown): void {
    const canvas = (ctx as RasterContext).canvas;
    canvas.width = 0;
    canvas.height = 0;
  }
}

function workerDocumentOptions(): Record<string, unknown> {
  return {
    cMapUrl: '/pdfjs-dist/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs-dist/standard_fonts/',
    CanvasFactory: WorkerCanvasFactory,
  };
}

async function runRedact(buf: ArrayBuffer, regions: RedactRegion[]): Promise<ArrayBuffer> {
  const pdfjsLib = await import('pdfjs-dist');
  const canvasFactory = new WorkerCanvasFactory();
  let bytes: Uint8Array = new Uint8Array(buf);
  const pageIndexes = [...new Set(regions.map(r => r.page))].sort((a, b) => a - b);
  for (const pageIndex of pageIndexes) {
    const pageRegions = regions.filter(r => r.page === pageIndex);
    bytes = await rasterizePage(
      pdfjsLib as unknown as PdfjsLibLike,
      canvasFactory,
      bytes,
      pageIndex,
      REDACT_RENDER_SCALE,
      pageRegions,
      workerDocumentOptions(),
    );
  }
  return bytes.buffer as ArrayBuffer;
}

const worker = self as unknown as Worker;

worker.onmessage = async (e: MessageEvent<RedactWorkerRequest>) => {
  const { id, buf, regions } = e.data;
  try {
    const out = await runRedact(buf, regions);
    const response: RedactWorkerResponse = { id, type: 'ok', buf: out };
    worker.postMessage(response, { transfer: [out] });
  } catch (err) {
    const response: RedactWorkerResponse = {
      id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    worker.postMessage(response);
  }
};
