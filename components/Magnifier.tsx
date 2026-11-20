'use client';
import { useState, useEffect } from 'react';
import { t } from '@/lib/i18n';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import ToolGlyph from '@/components/ToolGlyph';

const levels = [100, 125, 150, 175, 200];
const STORAGE_KEY = 'pdftools-zoom';

export default function Magnifier() {
  const locale = useHydrationSafeLocale();
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
    <div className="fixed bottom-4 right-4 z-[999] flex flex-col items-end gap-2">
      {open && (
        <div className="bg-[var(--coffee-surface-solid)] border border-[var(--coffee-border)] rounded-xl shadow-2xl p-2 min-w-[140px] backdrop-blur-xl">
          {levels.map(l => (
            <button
              key={l}
              onClick={() => handleZoom(l)}
              className={`w-full text-start px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                zoom === l
                  ? 'bg-[var(--coffee-accent-ink)]'
                  : 'hover:bg-[var(--coffee-surface-hover)]'
              }`}
              style={{ color: zoom === l ? 'var(--coffee-on-accent)' : 'var(--coffee-text-secondary)' }}
            >
              {l}%
            </button>
          ))}
          <hr className="my-1 border-[var(--coffee-border)]" />
          <button
            onClick={() => handleZoom(100)}
            className="w-full text-start px-4 py-2 rounded-lg text-sm font-medium transition hover:bg-[var(--coffee-surface-hover)] cursor-pointer"
            style={{ color: 'var(--coffee-text-tertiary)' }}
          >
            {t('magnifier.reset', locale)}
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        // Small and quiet (owner's choice 2026-11-20): the 56 px orange circle looked like a chat
        // bubble and covered content. 40 px is still a comfortable target (WCAG 2.5.8 asks 24).
        className="w-10 h-10 rounded-full flex items-center justify-center text-base transition cursor-pointer border hover:border-[var(--coffee-accent)]"
        style={{
          backgroundColor: 'var(--coffee-surface-solid)',
          borderColor: 'var(--coffee-border-strong)',
          color: 'var(--coffee-accent-ink)',
          boxShadow: '0 4px 12px rgba(74, 47, 22, 0.12)',
        }}
        title={t('magnifier.zoom', locale)}
        aria-label={t('magnifier.zoom', locale)}
        aria-expanded={open}
      >
        <ToolGlyph name="zoom" />
      </button>
    </div>
  );
}
