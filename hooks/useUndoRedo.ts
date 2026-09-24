'use client';
import { useState, useCallback } from 'react';
import { commit, replace, undo as undoState, redo as redoState, type UndoRedoState } from './undoRedoLogic';

export type { UndoRedoState };

export function useUndoRedo<T>(initial: T, maxHistory: number = 50) {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const set = useCallback((newPresent: T) => {
    setState(s => commit(s, newPresent, maxHistory));
  }, [maxHistory]);

  // Used for the many intermediate updates of one gesture. It must NOT leave any state behind:
  // it previously armed a flag that made the next real set() skip its own history entry.
  const setWithoutHistory = useCallback((newPresent: T) => {
    setState(s => replace(s, newPresent));
  }, []);

  const undo = useCallback(() => { setState(undoState); }, []);
  const redo = useCallback(() => { setState(redoState); }, []);

  const reset = useCallback((newInitial: T) => {
    setState({ past: [], present: newInitial, future: [] });
  }, []);

  return {
    state: state.present,
    set,
    setWithoutHistory,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    pastLength: state.past.length,
    futureLength: state.future.length,
  };
}
