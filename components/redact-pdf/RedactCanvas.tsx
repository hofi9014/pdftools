'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { initPdfjs } from '@/lib/client-pdf';
import type { RedactRegion } from '@/lib/pdf-raster';

interface RedactCanvasProps {
  file: File;
  pageIndex: number;
  pageRegions: RedactRegion[];
  onPageRegionsChange: (regions: RedactRegion[]) => void;
}

const MIN_SIZE_PX = 6;

export default function RedactCanvas({ file, pageIndex, pageRegions, onPageRegionsChange }: RedactCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const drawRef = useRef<{ start: { x: number; y: number }; last: { x: number; y: number } } | null>(null);
  const dragRef = useRef<{ index: number; sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pdfjsLib = await import('pdfjs-dist');
      await initPdfjs();
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      const page = await doc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      if (!cancelled) {
        setImgUrl(canvas.toDataURL('image/png'));
        setNatural({ w: canvas.width, h: canvas.height });
        setSelected(null);
      }
      await doc.cleanup();
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [file, pageIndex]);

  const clientToImg = useCallback((clientX: number, clientY: number) => {
    const r = containerRef.current?.getBoundingClientRect();
    const n = natural;
    if (!r || !n) return { x: 0, y: 0 };
    return {
      x: ((clientX - r.left) / r.width) * n.w,
      y: ((clientY - r.top) / r.height) * n.h,
    };
  }, [natural]);

  const handleOverlayPointerDown = (e: React.PointerEvent) => {
    if (!natural) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-region]')) return;
    const p = clientToImg(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    drawRef.current = { start: p, last: p };
    setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };

  const handleRegionPointerDown = (e: React.PointerEvent, index: number) => {
    e.stopPropagation();
    if (!natural) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(index);
    const r = pageRegions[index];
    dragRef.current = { index, sx: e.clientX, sy: e.clientY, ox: r.x, oy: r.y };
  };

  const handleOverlayPointerMove = (e: React.PointerEvent) => {
    const n = natural;
    if (!n) return;

    if (dragRef.current) {
      const d = dragRef.current;
      const r = containerRef.current?.getBoundingClientRect();
      if (!r) return;
      const dx = (e.clientX - d.sx) / r.width;
      const dy = (e.clientY - d.sy) / r.height;
      const next = pageRegions.map((rg, i) => {
        if (i !== d.index) return rg;
        const x = Math.min(Math.max(d.ox + dx, 0), 1 - rg.width);
        const y = Math.min(Math.max(d.oy + dy, 0), 1 - rg.height);
        return { ...rg, x, y };
      });
      onPageRegionsChange(next);
      return;
    }

    const dr = drawRef.current;
    if (dr) {
      const p = clientToImg(e.clientX, e.clientY);
      dr.last = p;
      setDraft({ x0: dr.start.x, y0: dr.start.y, x1: p.x, y1: p.y });
    }
  };

  const handleOverlayPointerUp = () => {
    const dr = drawRef.current;
    const n = natural;
    if (dr && n) {
      const x = Math.min(dr.start.x, dr.last.x);
      const y = Math.min(dr.start.y, dr.last.y);
      const w = Math.abs(dr.last.x - dr.start.x);
      const h = Math.abs(dr.last.y - dr.start.y);
      if (w >= MIN_SIZE_PX && h >= MIN_SIZE_PX) {
        const region: RedactRegion = {
          page: pageIndex,
          x: Math.max(0, Math.min(1 - w / n.w, x / n.w)),
          y: Math.max(0, Math.min(1 - h / n.h, y / n.h)),
          width: w / n.w,
          height: h / n.h,
        };
        onPageRegionsChange([...pageRegions, region]);
        setSelected(pageRegions.length);
      }
    }
    drawRef.current = null;
    dragRef.current = null;
    setDraft(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected != null) {
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          onPageRegionsChange(pageRegions.filter((_, i) => i !== selected));
          setSelected(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, pageRegions, onPageRegionsChange]);

  const pct = (v: number) => `${(v * 100).toFixed(4)}%`;

  return (
    <div data-testid="redact-canvas" ref={containerRef}
      className="relative inline-block max-w-full select-none"
      style={{ touchAction: 'none' }}>
      {imgUrl && (
        <img src={imgUrl} alt={`Strona ${pageIndex + 1}`} draggable={false}
          className="block w-auto max-w-full h-auto select-none pointer-events-none" />
      )}
      {natural && (
        <div className="absolute inset-0" style={{ touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={handleOverlayPointerDown}
          onPointerMove={handleOverlayPointerMove}
          onPointerUp={handleOverlayPointerUp}
          onPointerCancel={handleOverlayPointerUp}>
          {pageRegions.map((r, i) => (
            <div key={i} data-region data-region-index={i}
              onPointerDown={(e) => handleRegionPointerDown(e, i)}
              className="absolute cursor-move"
              style={{
                left: pct(r.x), top: pct(r.y),
                width: pct(r.width), height: pct(r.height),
                boxSizing: 'border-box',
                backgroundColor: 'rgba(220,38,38,0.25)',
                border: i === selected ? '2px solid #dc2626' : '1px dashed rgba(220,38,38,0.7)',
                zIndex: i === selected ? 30 : 20,
              }} />
          ))}
          {draft && (
            <div className="absolute pointer-events-none"
              style={{
                left: pct(Math.min(draft.x0, draft.x1) / natural.w),
                top: pct(Math.min(draft.y0, draft.y1) / natural.h),
                width: pct(Math.abs(draft.x1 - draft.x0) / natural.w),
                height: pct(Math.abs(draft.y1 - draft.y0) / natural.h),
                boxSizing: 'border-box',
                border: '2px dashed #2563eb',
                backgroundColor: 'rgba(37,99,235,0.15)',
                zIndex: 40,
              }} />
          )}
        </div>
      )}
    </div>
  );
}
