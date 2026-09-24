// Pure history transitions behind useUndoRedo (unit-testable without React).
export interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

/** A real, undoable change: the current present becomes one history step. */
export function commit<T>(s: UndoRedoState<T>, next: T, maxHistory: number): UndoRedoState<T> {
  const past = s.past.length >= maxHistory
    ? [...s.past.slice(s.past.length - maxHistory + 1), s.present]
    : [...s.past, s.present];
  return { past, present: next, future: [] };
}

/** Transient update inside a gesture (drag, stroke): history and future untouched. */
export function replace<T>(s: UndoRedoState<T>, next: T): UndoRedoState<T> {
  return { ...s, present: next };
}

export function undo<T>(s: UndoRedoState<T>): UndoRedoState<T> {
  if (s.past.length === 0) return s;
  const previous = s.past[s.past.length - 1]!;
  return { past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future] };
}

export function redo<T>(s: UndoRedoState<T>): UndoRedoState<T> {
  if (s.future.length === 0) return s;
  const next = s.future[0]!;
  return { past: [...s.past, s.present], present: next, future: s.future.slice(1) };
}
