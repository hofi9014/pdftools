'use client';
import { useState, useEffect } from 'react';

const levels = [100, 125, 150, 175, 200];
const STORAGE_KEY = 'pdftools-zoom';

export default function Magnifier() {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const z = parseInt(saved, 10);
        if (levels.includes(z)) {
          applyZoom(z);
          setZoom(z);
        }
      }
    } catch {}
  }, []);

  function applyZoom(z: number) {
    document.body.style.zoom = String(z / 100);
  }

  function handleZoom(z: number) {
    setZoom(z);
    applyZoom(z);
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(z));
    } catch {}
  }

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-2">
      {open && (
        <div className="bg-[var(--coffee-surface-solid)] dark:bg-[#1C1A18] border border-[var(--coffee-border)] rounded-xl shadow-2xl p-2 min-w-[140px] backdrop-blur-xl">
          {levels.map(l => (
            <button
              key={l}
              onClick={() => handleZoom(l)}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                zoom === l
                  ? 'bg-[var(--coffee-accent)] text-white'
                  : 'hover:bg-[var(--coffee-surface-hover)]'
              }`}
              style={{ color: zoom === l ? '#fff' : 'var(--coffee-text-secondary)' }}
            >
              {l}%
            </button>
          ))}
          <hr className="my-1 border-[var(--coffee-border)]" />
          <button
            onClick={() => handleZoom(100)}
            className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition hover:bg-[var(--coffee-surface-hover)] cursor-pointer"
            style={{ color: 'var(--coffee-text-tertiary)' }}
          >
            Reset
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-11 h-11 rounded-xl shadow-lg flex items-center justify-center text-lg transition cursor-pointer hover:scale-110 border"
        style={{
          backgroundColor: 'var(--coffee-accent)',
          color: '#fff',
          borderColor: 'var(--coffee-border)',
        }}
        title="Powiększ / Zoom"
      >
        🔍
      </button>
    </div>
  );
}
