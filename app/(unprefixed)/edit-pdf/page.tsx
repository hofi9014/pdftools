'use client';
import { useState, useCallback } from 'react';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import CloudFilePicker from '@/components/CloudFilePicker';
import dynamic from 'next/dynamic';
import ToolGlyph from '@/components/ToolGlyph';
import { useIdlePreload } from '@/hooks/useIdlePreload';
import { preloadPdfEngine } from '@/lib/client-pdf-lazy';

// The editor (pdf.js rendering, pdf-lib export, fonts) is drawn only after a file is chosen.
const PdfEditor = dynamic(() => import('@/components/edit-pdf/PdfEditor'), { ssr: false });

// Fetched once the page is idle, so the tool is ready (and cached for offline use) when a file is chosen.
const preloadTool = () => Promise.all([preloadPdfEngine(), import('@/components/edit-pdf/PdfEditor')]);

export default function EditPdfPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const locale = forcedLocale ?? useLocale().locale;
  useIdlePreload(preloadTool);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError(t('error.onlypdf', locale));
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError(t('edit.max_size', locale));
      return;
    }
    setError('');
    setFile(f);
  }, [locale]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f ?? null);
  }, [handleFile]);

  const handleReset = useCallback(() => {
    setFile(null);
  }, []);

  if (file) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PdfEditor file={file} onReset={handleReset} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('edit')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.edit', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.edit.desc', locale)}</p>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6"><ToolGlyph name="warning" /> {error}</div>}

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('fileInput')?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('fileInput')?.click(); } }}
        className={`border-2 border-dashed rounded-2xl p-12 sm:p-16 text-center cursor-pointer transition mb-6
          ${dragOver
            ? 'border-[var(--coffee-accent)] bg-[var(--coffee-accent-subtle)]'
            : 'border-gray-300 dark:border-gray-600 hover:border-[var(--coffee-accent)] hover:bg-gray-50 dark:hover:bg-gray-700'}`}
      >
        <div className="text-6xl mb-4"><ToolGlyph name="folderOpen" /></div>
        <p className="text-gray-600 dark:text-gray-300 font-medium text-lg">{t('drag.title', locale)}</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('drag.subtitle', locale)}</p>
        <input id="fileInput" type="file" accept=".pdf" className="hidden"
          onChange={e => handleFile(e.target.files?.[0] ?? null)} />
      </div>

      <div className="flex justify-center gap-2 mb-6">
        <CloudFilePicker onFilesPicked={(f) => handleFile(f[0] || null)} label={t('cloud.add', locale)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: 'letters' as const, key: 'edit.feature_text' },
          { icon: 'highlighter' as const, key: 'edit.feature_highlight' },
          { icon: 'pencil' as const, key: 'edit.feature_edit_text' },
        ].map((item, i) => (
          <div key={i} className="tool-feature-card rounded-xl p-4 border text-center">
            <div className="text-2xl mb-1"><ToolGlyph name={item.icon} /></div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t(item.key, locale)}</p>
          </div>
        ))}
      </div>

      <div className="tool-info-box rounded-2xl p-5 mb-6">
        <h2 className="font-bold tool-heading mb-2"><ToolGlyph name="shield" /> {t('local.title', locale)}</h2>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {t('local.desc', locale)} {t('edit.local_saved', locale)}{locale === 'pl' ? ' ' + t('page.edit.supports_polish', locale) : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        {[
          { icon: 'shield' as const, text: t('local.badge', locale) },
          { icon: 'bolt' as const, text: t('local.nolimits', locale) },
          { icon: 'gift' as const, text: t('local.free', locale) },
        ].map((item, i) => (
          <div key={i} className="tool-feature-card rounded-xl p-4 border">
            <div className="text-2xl mb-1"><ToolGlyph name={item.icon} /></div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
