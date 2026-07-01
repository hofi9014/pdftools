'use client';
import { useState, useCallback, useRef } from 'react';

export interface UndoRedoState<T> {
  past: T[]
  present: T
  future: T[]
}

export function useUndoRedo<T>(initial: T, maxHistory: number = 50) {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initial,
    future: [],
  });
  const skipRef = useRef(false);

  const set = useCallback((newPresent: T) => {
    if (skipRef.current) {
      skipRef.current = false;
      setState(s => ({ ...s, present: newPresent }));
      return;
    }
    setState(s => ({
      past: s.past.length >= maxHistory
        ? [...s.past.slice(s.past.length - maxHistory + 1), s.present]
        : [...s.past, s.present],
      present: newPresent,
      future: [],
    }));
  }, [maxHistory]);

  const setWithoutHistory = useCallback((newPresent: T) => {
    skipRef.current = true;
    setState(s => ({ ...s, present: newPresent }));
  }, []);

  const undo = useCallback(() => {
    setState(s => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        present: previous,
        future: [s.present, ...s.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(s => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        past: [...s.past, s.present],
        present: next,
        future: s.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback((newInitial: T) => {
    setState({
      past: [],
      present: newInitial,
      future: [],
    });
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
