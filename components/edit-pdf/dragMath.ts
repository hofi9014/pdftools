// Pure helpers behind EditLayer's pointer handling, kept free of React/DOM so they are unit-testable.
import type { EditorElement } from './EditLayer';

export interface DragStart {
  ox: number;
  oy: number;
  ow: number;
  oh: number;
  ox2?: number;
  oy2?: number;
  opoints?: { x: number; y: number }[];
  handle: string | null;
}

/**
 * Element after being dragged by (dx, dy) canvas pixels from the snapshot taken at pointer-down.
 * A line/arrow is defined by BOTH endpoints (x,y)-(x2,y2) and a freehand stroke lives entirely in
 * `points` (its x/y stay 0), so translating only x/y moved one end of a line (changing its length
 * and angle) and did nothing at all for a freehand stroke.
 */
export function dragElement(el: EditorElement, d: DragStart, dx: number, dy: number): EditorElement {
  if (el.type === 'line' || el.type === 'arrow') {
    return {
      ...el,
      x: d.ox + dx,
      y: d.oy + dy,
      x2: (d.ox2 ?? el.x2 ?? d.ox) + dx,
      y2: (d.oy2 ?? el.y2 ?? d.oy) + dy,
    };
  }
  if (el.type === 'freehand') {
    const base = d.opoints ?? el.points ?? [];
    return { ...el, points: base.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  }
  if (d.handle) {
    let { x, y, w, h } = el;
    if (d.handle.includes('e')) w = Math.max(20, d.ow + dx);
    if (d.handle.includes('w')) { x = d.ox + dx; w = Math.max(20, d.ow - dx); }
    if (d.handle.includes('s')) h = Math.max(20, d.oh + dy);
    if (d.handle.includes('n')) { y = d.oy + dy; h = Math.max(20, d.oh - dy); }
    return { ...el, x, y, w, h };
  }
  return { ...el, x: d.ox + dx, y: d.oy + dy };
}

/** True when a key press belongs to a form control / editable region, not to the canvas. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as { tagName?: string; isContentEditable?: boolean } | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

export type ShortcutAction =
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'delete' }
  | { kind: 'tool'; tool: string };

const TOOL_KEYS: Record<string, string> = {
  v: 'select', t: 'text', r: 'rect', c: 'circle', l: 'line', a: 'arrow', f: 'freehand', h: 'highlight',
};

/**
 * Maps a key press to an editor action. Single-letter tool shortcuts fire only WITHOUT
 * Ctrl/Cmd/Alt — otherwise the browser's own Ctrl+C / Ctrl+A / Ctrl+R / Ctrl+L / Ctrl+F / Ctrl+H
 * also silently switched the active tool to circle / arrow / rect / line / freehand / highlight.
 */
export function shortcutAction(
  e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean; target: EventTarget | null },
): ShortcutAction | null {
  if (isTypingTarget(e.target)) return null;
  const key = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  if (mod && !e.altKey) {
    if (key === 'z') return e.shiftKey ? { kind: 'redo' } : { kind: 'undo' };
    if (key === 'y') return { kind: 'redo' };
    return null;
  }
  if (e.altKey || mod) return null;
  if (key === 'delete' || key === 'backspace') return { kind: 'delete' };
  const tool = TOOL_KEYS[key];
  return tool ? { kind: 'tool', tool } : null;
}
