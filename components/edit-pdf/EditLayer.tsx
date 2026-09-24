'use client';
import { useRef, useCallback } from 'react';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getFontFamily } from '@/lib/pdf/fonts';
import { dragElement, type DragStart } from './dragMath';

export interface EditorElement {
  id: number
  type: 'text' | 'rect' | 'circle' | 'line' | 'arrow' | 'highlight' | 'freehand' | 'image'
  x: number
  y: number
  w: number
  h: number
  text?: string
  size?: number
  color?: string
  opacity?: number
  font?: string
  bold?: boolean
  italic?: boolean
  x2?: number
  y2?: number
  rotation?: number
  imageDataUrl?: string
  points?: { x: number; y: number }[]
  visible?: boolean
}

interface Props {
  elements: EditorElement[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  /** 'begin' = first change of a gesture (one undo step); 'update' = later moves of the same gesture. */
  onElementsChange: (elements: EditorElement[], phase?: 'begin' | 'update') => void
  canvasWidth: number
  canvasHeight: number
  activeTool: string
  onAddElement: (x: number, y: number) => void
  onFreehandStart: (x: number, y: number) => number
  onFreehandAddPoint: (id: number, x: number, y: number) => void
  onLineStart: (x: number, y: number) => number
  onLineMove: (id: number, x: number, y: number) => void
  textBlocks?: { id: string; x: number; y: number; width: number; height: number; text: string; page: number }[]
  onTextBlockClick?: (block: any) => void
  hoveredTextBlock?: string | null
  onHoverTextBlock?: (id: string | null) => void
}

const HANDLES = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'] as const;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function EditLayer({
  elements, selectedId, onSelect, onElementsChange, canvasWidth, canvasHeight, activeTool,
  onAddElement, onFreehandStart, onFreehandAddPoint, onLineStart, onLineMove,
  textBlocks, onTextBlockClick, hoveredTextBlock, onHoverTextBlock,
}: Props) {
  const locale = useHydrationSafeLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<(DragStart & { id: number; sx: number; sy: number; started: boolean }) | null>(null);
  const drawingRef = useRef<{ id: number; type: 'line' | 'arrow' | 'freehand'; pts: { x: number; y: number }[] } | null>(null);

  const clientToImg = useCallback((clientX: number, clientY: number) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return {
      x: ((clientX - r.left) / r.width) * canvasWidth,
      y: ((clientY - r.top) / r.height) * canvasHeight,
    };
  }, [canvasWidth, canvasHeight]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.edit-el')) return;
    if (target.closest('.text-block-hit')) return;

    const p = clientToImg(e.clientX, e.clientY);

    // Capture the pointer so releasing outside the layer still ends the stroke; otherwise the
    // stroke stays "live" and keeps drawing on the next mouse move.
    if (activeTool === 'line' || activeTool === 'arrow' || activeTool === 'freehand') {
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    }

    if (activeTool === 'line' || activeTool === 'arrow') {
      const id = onLineStart(p.x, p.y);
      drawingRef.current = { id, type: activeTool as 'line' | 'arrow', pts: [p] };
      return;
    }

    if (activeTool === 'freehand') {
      const id = onFreehandStart(p.x, p.y);
      drawingRef.current = { id, type: 'freehand', pts: [p] };
      return;
    }

    if (activeTool === 'text' || activeTool === 'rect' || activeTool === 'circle' || activeTool === 'highlight') {
      onAddElement(p.x, p.y);
      onSelect(null);
      return;
    }

    onSelect(null);
  }, [activeTool, clientToImg, onAddElement, onFreehandStart, onLineStart, onSelect]);

  const onElementPointerDown = useCallback((e: React.PointerEvent, el: EditorElement, handle: string | null = null) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    onSelect(el.id);
    dragRef.current = {
      id: el.id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h, handle,
      ox2: el.x2, oy2: el.y2, opoints: el.points?.map((pt) => ({ ...pt })), started: false,
    };
  }, [onSelect]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drawingRef.current;
    if (d) {
      const p = clientToImg(e.clientX, e.clientY);
      if (d.type === 'line' || d.type === 'arrow') {
        onLineMove(d.id, p.x, p.y);
      } else if (d.type === 'freehand') {
        onFreehandAddPoint(d.id, p.x, p.y);
      }
      return;
    }

    const dr = dragRef.current;
    if (!dr || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const sx = canvasWidth / r.width;
    const sy = canvasHeight / r.height;
    const dx = (e.clientX - dr.sx) * sx;
    const dy = (e.clientY - dr.sy) * sy;

    const updated = elements.map(el => (el.id === dr.id ? dragElement(el, dr, dx, dy) : el));
    onElementsChange(updated, dr.started ? 'update' : 'begin');
    dr.started = true;
  }, [elements, canvasWidth, canvasHeight, onElementsChange, clientToImg, onLineMove, onFreehandAddPoint]);

  const onPointerUp = useCallback(() => {
    drawingRef.current = null;
    dragRef.current = null;
  }, []);

  // Delete/Backspace and the other shortcuts are handled once, in PdfEditor (shortcutAction) — a
  // second window listener here removed the element twice and wrote two identical undo steps.

  const pct = (v: number, dim: number) => `${(v / dim) * 100}%`;

  const renderElement = (el: EditorElement) => {
    const isSel = el.id === selectedId;
    const isLineLike = el.type === 'line' || el.type === 'arrow';

    if (el.type === 'line' || el.type === 'arrow') {
      const dx = (el.x2 ?? el.x) - el.x;
      const dy = (el.y2 ?? el.y) - el.y;
      return (
        <div key={el.id} className="edit-el absolute"
          onPointerDown={e => onElementPointerDown(e, el)}
          style={{
            left: pct(Math.min(el.x, el.x2 ?? el.x), canvasWidth),
            top: pct(Math.min(el.y, el.y2 ?? el.y), canvasHeight),
            width: pct(Math.abs(dx) || 1, canvasWidth),
            height: pct(Math.abs(dy) || 1, canvasHeight),
            zIndex: isSel ? 100 : 10, cursor: 'move', pointerEvents: 'auto',
          }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            <defs>{el.type === 'arrow' && (
              <marker id={`a-${el.id}`} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0,10 3.5,0 7" fill={el.color || '#000'} />
              </marker>
            )}</defs>
            <line x1={dx >= 0 ? 0 : -dx} y1={dy >= 0 ? 0 : -dy}
              x2={dx >= 0 ? Math.abs(dx) : 0} y2={dy >= 0 ? Math.abs(dy) : 0}
              stroke={el.color || '#000'} strokeWidth={el.size || 2}
              markerEnd={el.type === 'arrow' ? `url(#a-${el.id})` : undefined}
              opacity={el.opacity ?? 1} />
          </svg>
          {isSel && <div className="absolute inset-0 border-2 border-[var(--coffee-accent)] rounded pointer-events-none" />}
        </div>
      );
    }

    if (el.type === 'freehand' && el.points?.length) {
      const minX = Math.min(...el.points.map(p => p.x));
      const minY = Math.min(...el.points.map(p => p.y));
      const maxX = Math.max(...el.points.map(p => p.x));
      const maxY = Math.max(...el.points.map(p => p.y));
      const w = Math.max(maxX - minX, 1);
      const h = Math.max(maxY - minY, 1);
      return (
        <div key={el.id} className="edit-el absolute"
          onPointerDown={e => onElementPointerDown(e, el)}
          style={{
            left: pct(minX, canvasWidth), top: pct(minY, canvasHeight),
            width: pct(w, canvasWidth), height: pct(h, canvasHeight),
            zIndex: isSel ? 100 : 10, cursor: 'move',
          }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}
            viewBox={`${minX} ${minY} ${w} ${h}`}>
            <polyline points={el.points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none" stroke={el.color || '#000'} strokeWidth={el.size || 3}
              strokeLinecap="round" strokeLinejoin="round" opacity={el.opacity ?? 1} />
          </svg>
          {isSel && <div className="absolute inset-0 border-2 border-[var(--coffee-accent)] rounded pointer-events-none" />}
        </div>
      );
    }

    return (
      <div key={el.id} className="edit-el absolute"
        onPointerDown={e => onElementPointerDown(e, el)}
        style={{
          left: pct(el.x, canvasWidth), top: pct(el.y, canvasHeight),
          width: el.w ? pct(el.w, canvasWidth) : undefined,
          height: el.h ? pct(el.h, canvasHeight) : undefined,
          opacity: el.opacity ?? 1,
          zIndex: isSel ? 100 : 10, cursor: 'move', pointerEvents: 'auto',
          minWidth: 8, minHeight: 8,
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        }}>
        {el.type === 'text' && (
          <span className="pointer-events-none block whitespace-pre-wrap break-words"
            style={{
              fontSize: `${el.size ?? 16}px`, color: el.color || '#000',
              fontFamily: `${getFontFamily(el.font || 'Arial')}, sans-serif`,
              fontWeight: el.bold ? '700' : '400',
              fontStyle: el.italic ? 'italic' : 'normal',
              lineHeight: 1.2,
              textShadow: '0 0 1px rgba(255,255,255,0.8)',
            }}>{el.text || ''}</span>
        )}
        {el.type === 'rect' && (
          <div className="pointer-events-none w-full h-full rounded" style={{ backgroundColor: el.color || '#C28F5B' }} />
        )}
        {el.type === 'circle' && (
          <div className="pointer-events-none w-full h-full rounded-full" style={{ backgroundColor: el.color || '#C28F5B' }} />
        )}
        {el.type === 'highlight' && (
          <div className="pointer-events-none w-full h-full rounded-sm" style={{ backgroundColor: hexToRgba(el.color || '#ffff00', el.opacity ?? 0.3), mixBlendMode: 'multiply' }} />
        )}
        {el.type === 'image' && el.imageDataUrl && (
          <img src={el.imageDataUrl} alt="" className="pointer-events-none w-full h-full object-contain" draggable={false} />
        )}
        {isSel && (
          <>
            <div className="absolute inset-0 border-2 border-[var(--coffee-accent)] rounded pointer-events-none" />
            {HANDLES.map(h => (
              <div key={h} onPointerDown={e => onElementPointerDown(e, el, h)}
                className="absolute w-3 h-3 bg-white border-2 border-[var(--coffee-accent)] rounded-sm pointer-events-auto"
                style={{
                  ...(h.includes('n') ? { top: -5 } : h.includes('s') ? { bottom: -5 } : { top: 'calc(50% - 6px)' }),
                  ...(h.includes('w') ? { left: -5 } : h.includes('e') ? { right: -5 } : { left: 'calc(50% - 6px)' }),
                  cursor: h + '-resize',
                }} />
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef}
      className="absolute inset-0 select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ cursor: activeTool === 'text' ? 'text' : activeTool === 'freehand' ? 'crosshair' : activeTool === 'line' || activeTool === 'arrow' ? 'crosshair' : 'default' }}
    >
      {elements.map(el => (
        el.type === 'freehand' || el.type === 'line' || el.type === 'arrow'
          ? renderElement(el)
          : renderElement(el)
      ))}

      {textBlocks?.map(block => {
        const isHovered = hoveredTextBlock === block.id;
        const minHit = 12;
        const cssW = Math.max(block.width, minHit);
        const cssH = Math.max(block.height, minHit);
        return (
          <div key={block.id}
            className={`text-block-hit absolute ${isHovered ? 'z-30' : 'z-20'}`}
            style={{
              left: pct(block.x, canvasWidth), top: pct(block.y, canvasHeight),
              width: pct(cssW, canvasWidth), height: pct(cssH, canvasHeight),
              pointerEvents: 'auto', cursor: 'pointer',
            }}
            onMouseEnter={() => onHoverTextBlock?.(block.id)}
            onMouseLeave={() => onHoverTextBlock?.(null)}
            onClick={(e) => { e.stopPropagation(); onTextBlockClick?.(block); }}
          >
            {isHovered && (
              <div className="w-full h-full border-2 border-dashed border-[var(--coffee-accent)] bg-[var(--coffee-accent-subtle)] rounded flex items-center justify-center">
                <span className="text-[10px] font-medium text-[var(--coffee-accent)] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded shadow-sm">✏️ {t('edit.btn_edit', locale)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
