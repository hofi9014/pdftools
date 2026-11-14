'use client';
import { useEffect } from 'react';

// Starts a module fetch once the page is idle (after it is drawn and interactive), so a tool's
// engine is usually loaded before the user picks a file, without delaying the page itself.
// The fetched scripts land in the service worker's cache like any other, so a tool opened once
// still works offline. `load` must be a stable function (defined at module scope).
export function useIdlePreload(load: () => Promise<unknown>): void {
  useEffect(() => {
    const run = () => { load().catch(() => { /* fetched again when the tool is used */ }); };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 1500);
    return () => window.clearTimeout(id);
  }, [load]);
}
