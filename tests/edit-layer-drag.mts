// edit-pdf EditLayer pointer handling (found in the audit of the edit-pdf sub-components):
//  1. Dragging a selected line/arrow only translated its START point (x,y) — x2,y2 stayed put, so
//     the line changed length and angle instead of moving.
//  2. Dragging a freehand stroke did nothing: its geometry lives in `points`, but only x/y (0,0)
//     were updated.
//  3. Delete/Backspace deleted the selected element while a <select> (font picker) had focus —
//     only INPUT/TEXTAREA were treated as typing targets.
//  4. Drawing did not capture the pointer, so releasing the button outside the layer never fired
//     pointer-up and the stroke kept extending on later mouse moves.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { dragElement, isTypingTarget, shortcutAction, type DragStart } from '../components/edit-pdf/dragMath.ts';
import { commit, replace, undo, redo, type UndoRedoState } from '../hooks/undoRedoLogic.ts';
import type { EditorElement } from '../components/edit-pdf/EditLayer.tsx';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const near = (a: number | undefined, b: number): boolean => a !== undefined && Math.abs(a - b) < 1e-9;

const line: EditorElement = { id: 1, type: 'line', x: 10, y: 20, w: 0, h: 0, x2: 110, y2: 70 };
const start = (el: EditorElement, handle: string | null = null): DragStart => ({
  ox: el.x, oy: el.y, ow: el.w, oh: el.h, ox2: el.x2, oy2: el.y2, opoints: el.points?.map((p) => ({ ...p })), handle,
});

console.log('=== line / arrow keep their length and angle when dragged ===');
for (const type of ['line', 'arrow'] as const) {
  const el = { ...line, type };
  const out = dragElement(el, start(el), 30, -5);
  check(near(out.x, 40) && near(out.y, 15) && near(out.x2, 140) && near(out.y2, 65), `${type}: both endpoints translated by (30,-5) → (${out.x},${out.y})-(${out.x2},${out.y2})`);
  check(near((out.x2! - out.x), 100) && near((out.y2! - out.y), 50), `${type}: vector between endpoints unchanged (100,50)`);
}
{
  // What the old inline code did, for the record: shows the failure mode the fix removes.
  const d = start(line);
  const old = { ...line, x: d.ox + 30, y: d.oy - 5 };
  check(!near(old.x2! - old.x, 100), 'old behaviour (only x/y moved) changed the line vector — the bug');
}

console.log('\n=== freehand stroke moves with the drag ===');
{
  const fh: EditorElement = { id: 2, type: 'freehand', x: 0, y: 0, w: 0, h: 0, points: [{ x: 5, y: 5 }, { x: 15, y: 25 }, { x: 40, y: 10 }] };
  const out = dragElement(fh, start(fh), 7, 3);
  check(JSON.stringify(out.points) === JSON.stringify([{ x: 12, y: 8 }, { x: 22, y: 28 }, { x: 47, y: 13 }]), 'every point translated by (7,3)');
  check(JSON.stringify(fh.points) === JSON.stringify([{ x: 5, y: 5 }, { x: 15, y: 25 }, { x: 40, y: 10 }]), 'source points not mutated');
  const again = dragElement(out, start(fh), 7, 3);
  check(JSON.stringify(again.points) === JSON.stringify(out.points), 'dragging is relative to the pointer-down snapshot (idempotent per pointermove)');
}

console.log('\n=== rectangles: move and resize unchanged ===');
{
  const r: EditorElement = { id: 3, type: 'rect', x: 50, y: 60, w: 100, h: 80 };
  const moved = dragElement(r, start(r), 10, 10);
  check(moved.x === 60 && moved.y === 70 && moved.w === 100 && moved.h === 80, 'plain drag translates x/y only');
  const se = dragElement(r, start(r, 'se'), 20, 30);
  check(se.w === 120 && se.h === 110 && se.x === 50 && se.y === 60, 'se handle grows w/h');
  const nw = dragElement(r, start(r, 'nw'), 30, 20);
  check(nw.x === 80 && nw.y === 80 && nw.w === 70 && nw.h === 60, 'nw handle moves the origin and shrinks');
  const tiny = dragElement(r, start(r, 'e'), -500, 0);
  check(tiny.w === 20, 'width clamps at 20');
}

console.log('\n=== typing targets ===');
check(isTypingTarget({ tagName: 'INPUT' } as never) && isTypingTarget({ tagName: 'TEXTAREA' } as never), 'INPUT and TEXTAREA count as typing');
check(isTypingTarget({ tagName: 'SELECT' } as never), 'SELECT counts as typing (Delete/Backspace must not remove the element)');
check(isTypingTarget({ tagName: 'DIV', isContentEditable: true } as never), 'contentEditable counts as typing');
check(!isTypingTarget({ tagName: 'DIV' } as never) && !isTypingTarget({ tagName: 'BODY' } as never) && !isTypingTarget(null), 'plain elements and null do not');

console.log('\n=== EditLayer really uses them ===');
{
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'components', 'edit-pdf', 'EditLayer.tsx'), 'utf-8');
  check(/dragElement\(el, dr, dx, dy\)/.test(src), 'pointer move delegates to dragElement');
  check(!src.includes("addEventListener('keydown'"), 'EditLayer registers no keydown listener of its own (shortcuts live in PdfEditor)');
  const pe = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'components', 'edit-pdf', 'PdfEditor.tsx'), 'utf-8');
  check(pe.includes('shortcutAction(e)'), 'PdfEditor keyboard handler goes through shortcutAction');
  check(pe.includes("phase === 'update'") && src.includes("dr.started ? 'update' : 'begin'"), 'drag emits one begin then updates; only begin is an undo step');
  check(/opoints: el\.points/.test(src) && /ox2: el\.x2/.test(src), 'pointer-down snapshots endpoints and points');
  { const a = src.indexOf('const handlePointerDown'); const b = src.indexOf('setPointerCapture(e.pointerId)', a); const c = src.indexOf('onLineStart(p.x', a); check(a >= 0 && b > a && c > b, 'drawing captures the pointer on the layer before starting a stroke'); }
}

console.log('\n=== shortcuts ===');
{
  const k = (key: string, o: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean; target: unknown }> = {}) =>
    shortcutAction({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, target: null, ...o } as never);
  check(JSON.stringify(k('l')) === '{"kind":"tool","tool":"line"}', 'plain "l" selects the line tool');
  check(k('c', { ctrlKey: true }) === null && k('a', { ctrlKey: true }) === null && k('r', { metaKey: true }) === null && k('f', { ctrlKey: true }) === null && k('h', { ctrlKey: true }) === null, 'Ctrl/Cmd+C/A/R/F/H no longer switch tools');
  check(k('l', { altKey: true }) === null, 'Alt+L does not switch tools');
  check(k('z', { ctrlKey: true })?.kind === 'undo' && k('z', { ctrlKey: true, shiftKey: true })?.kind === 'redo' && k('y', { metaKey: true })?.kind === 'redo', 'undo/redo shortcuts intact');
  check(k('Delete')?.kind === 'delete' && k('Backspace')?.kind === 'delete', 'Delete/Backspace delete');
  check(k('t', { target: { tagName: 'SELECT' } }) === null && k('Backspace', { target: { tagName: 'SELECT' } }) === null && k('t', { target: { tagName: 'INPUT' } }) === null, 'nothing fires while a form control has focus (incl. SELECT type-ahead)');
}

console.log('\n=== undo history: one gesture = one step ===');
{
  const init: UndoRedoState<number> = { past: [], present: 0, future: [] };
  let s1 = commit(init, 1, 50);
  for (let i = 2; i <= 61; i++) s1 = replace(s1, i);
  check(s1.past.length === 1 && s1.present === 61, 'a 61-move drag adds exactly one history entry');
  check(undo(s1).present === 0, 'a single undo returns to the pre-drag state');
  const s2 = commit(s1, 100, 50);
  check(s2.past.length === 2 && undo(s2).present === 61, 'the action after a gesture gets its own undo step');
  check(redo(undo(s2)).present === 100, 'redo restores it');
  let cap = init;
  for (let i = 1; i <= 80; i++) cap = commit(cap, i, 50);
  check(cap.past.length === 50 && cap.past[0] === 30, 'history is capped at 50 (oldest dropped)');
}


console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
