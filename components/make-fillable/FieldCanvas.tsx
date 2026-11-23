'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { initPdfjs } from '@/lib/client-pdf-lazy';
import type { FieldKind } from '@/lib/pdf/makeFillable';

// One page of the PDF with the form fields drawn on it (plan 2.2). Built like the redaction
// canvas (components/redact-pdf/RedactCanvas.tsx): the page is drawn by pdf.js at its displayed
// orientation, fields are kept as fractions of that picture (the engine turns them back into
// the page's own coordinates). Drawing a box adds a field; a field is moved by dragging and
// selected by clicking.

export interface DraftField {
  id: number;
  kind: FieldKind;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  options: string;
  required: boolean;
}

const MIN_SIZE_PX = 6;
export const KIND_COLOR: Record<FieldKind, string> = {
  text: '#2563eb', multiline: '#7c3aed', checkbox: '#059669', dropdown: '#d97706', signature: '#be123c',
};

interface Props {
  file: File;
  pageIndex: number;
  fields: DraftField[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onAdd: (box: { x: number; y: number; width: number; height: number }) => void;
  onMove: (id: number, x: number, y: number) => void;
  pageLabel: string;
}

export default function FieldCanvas({ file, pageIndex, fields, selectedId, onSelect, onAdd, onMove, pageLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const drawRef = useRef<{ start: { x: number; y: number }; last: { x: number; y: number } } | null>(null);
  const dragRef = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; w: number; h: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pdfjsLib = await import('pdfjs-dist');
      await initPdfjs();
      const task = pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      const doc = await task.promise;
      const page = await doc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
      if (!cancelled) {
        setImgUrl(canvas.toDataURL('image/png'));
        setNatural({ w: canvas.width, h: canvas.height });
      }
      await task.destroy();
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [file, pageIndex]);

  const clientToImg = useCallback((clientX: number, clientY: number) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r || !natural) return { x: 0, y: 0 };
    return { x: ((clientX - r.left) / r.width) * natural.w, y: ((clientY - r.top) / r.height) * natural.h };
  }, [natural]);

  const onOverlayDown = (e: React.PointerEvent) => {
    if (!natural || (e.target as HTMLElement).closest('[data-field]')) return;
    const p = clientToImg(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    drawRef.current = { start: p, last: p };
    setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    onSelect(null);
  };

  const onFieldDown = (e: React.PointerEvent, f: DraftField) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(f.id);
    dragRef.current = { id: f.id, sx: e.clientX, sy: e.clientY, ox: f.x, oy: f.y, w: f.width, h: f.height };
  };

  const onMoveEvt = (e: React.PointerEvent) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r || !natural) return;
    const d = dragRef.current;
    if (d) {
      const x = Math.min(Math.max(d.ox + (e.clientX - d.sx) / r.width, 0), 1 - d.w);
      const y = Math.min(Math.max(d.oy + (e.clientY - d.sy) / r.height, 0), 1 - d.h);
      onMove(d.id, x, y);
      return;
    }
    const dr = drawRef.current;
    if (dr) {
      dr.last = clientToImg(e.clientX, e.clientY);
      setDraft({ x0: dr.start.x, y0: dr.start.y, x1: dr.last.x, y1: dr.last.y });
    }
  };

  const onUp = () => {
    const dr = drawRef.current;
    if (dr && natural) {
      const x = Math.max(0, Math.min(dr.start.x, dr.last.x));
      const y = Math.max(0, Math.min(dr.start.y, dr.last.y));
      const w = Math.min(Math.abs(dr.last.x - dr.start.x), natural.w - x);
      const h = Math.min(Math.abs(dr.last.y - dr.start.y), natural.h - y);
      if (w >= MIN_SIZE_PX && h >= MIN_SIZE_PX) onAdd({ x: x / natural.w, y: y / natural.h, width: w / natural.w, height: h / natural.h });
    }
    drawRef.current = null;
    dragRef.current = null;
    setDraft(null);
  };

  const pct = (v: number) => `${(v * 100).toFixed(4)}%`;

  return (
    <div data-testid="field-canvas" ref={containerRef} className="relative inline-block max-w-full select-none border border-gray-200 dark:border-gray-700" style={{ touchAction: 'none' }}>
      {imgUrl && <img src={imgUrl} alt={pageLabel} draggable={false} className="block w-auto max-w-full h-auto select-none pointer-events-none bg-white" />}
      {natural && (
        <div className="absolute inset-0" style={{ cursor: 'crosshair', touchAction: 'none' }}
          onPointerDown={onOverlayDown} onPointerMove={onMoveEvt} onPointerUp={onUp} onPointerCancel={onUp}>
          {fields.filter((f) => f.page === pageIndex).map((f) => (
            <div key={f.id} data-field data-field-id={f.id} title={f.name}
              onPointerDown={(e) => onFieldDown(e, f)}
              className="absolute cursor-move overflow-hidden"
              style={{
                left: pct(f.x), top: pct(f.y), width: pct(f.width), height: pct(f.height), boxSizing: 'border-box',
                backgroundColor: `${KIND_COLOR[f.kind]}22`,
                border: `${f.id === selectedId ? 2 : 1}px ${f.id === selectedId ? 'solid' : 'dashed'} ${KIND_COLOR[f.kind]}`,
                zIndex: f.id === selectedId ? 30 : 20,
              }}>
              <span className="absolute left-0.5 top-0 text-[10px] leading-tight font-medium" style={{ color: KIND_COLOR[f.kind] }} dir="auto">{f.name}</span>
            </div>
          ))}
          {draft && (
            <div className="absolute pointer-events-none" style={{
              left: pct(Math.min(draft.x0, draft.x1) / natural.w), top: pct(Math.min(draft.y0, draft.y1) / natural.h),
              width: pct(Math.abs(draft.x1 - draft.x0) / natural.w), height: pct(Math.abs(draft.y1 - draft.y0) / natural.h),
              boxSizing: 'border-box', border: '2px dashed #2563eb', backgroundColor: 'rgba(37,99,235,0.12)', zIndex: 40,
            }} />
          )}
        </div>
      )}
    </div>
  );
}
