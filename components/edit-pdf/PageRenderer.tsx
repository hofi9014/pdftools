'use client';
import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

interface Props {
  pageNum: number
  file: File
  onRenderComplete?: (width: number, height: number, canvas: HTMLCanvasElement) => void
  onError?: (error: string) => void
  scale?: number
  className?: string
}

export interface PageRendererHandle {
  getCanvas: () => HTMLCanvasElement | null
  getScale: () => number
  rerender: () => Promise<void>
}

const PageRenderer = forwardRef<PageRendererHandle, Props>(
  ({ pageNum, file, onRenderComplete, onError, scale = 1.5, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pdfDocRef = useRef<any>(null);
    const scaleRef = useRef(scale);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);
    const genRef = useRef(0);

    const cancelRender = useCallback(() => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }
    }, []);

    useEffect(() => { scaleRef.current = scale; }, [scale]);

    const renderPage = useCallback(async () => {
      const canvas = canvasRef.current;
      if (!canvas || !file) return;

      const myGen = ++genRef.current;
      cancelRender();

      try {
        const pdfjsLib = await import('pdfjs-dist');
        const { initPdfjs } = await import('@/lib/client-pdf');
        await initPdfjs();
        if (myGen !== genRef.current) return;

        const buf = await file.arrayBuffer();
        const doc = pdfDocRef.current?.fingerprint
          ? pdfDocRef.current
          : await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        pdfDocRef.current = doc;

        if (pageNum < 1 || pageNum > doc.numPages) return;
        if (myGen !== genRef.current) return;

        const page = await doc.getPage(pageNum);
        const s = scaleRef.current;
        const vp = page.getViewport({ scale: s, rotation: page.rotate });

        canvas.width = vp.width;
        canvas.height = vp.height;

        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (myGen !== genRef.current) return;

        const renderTask = page.render({ canvas, canvasContext: ctx, viewport: vp });
        renderTaskRef.current = renderTask;
        try {
          await renderTask.promise;
          renderTaskRef.current = null;
          if (myGen !== genRef.current) return;
          onRenderComplete?.(vp.width, vp.height, canvas);
        } catch (err: any) {
          if (err?.name === 'RenderingCancelledException') return;
          throw err;
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'RenderingCancelledException') return;
        onError?.(err instanceof Error ? err.message : String(err));
      }
    }, [pageNum, file, onRenderComplete, onError, cancelRender]);

    useEffect(() => { renderPage(); return cancelRender; }, [renderPage, cancelRender]);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      getScale: () => scaleRef.current,
      rerender: renderPage,
    }));

    return (
      <div ref={containerRef} className={className}>
        <canvas ref={canvasRef} className="block w-full h-auto" style={{ maxWidth: '100%' }} />
      </div>
    );
  }
);

PageRenderer.displayName = 'PageRenderer';
export default PageRenderer;
