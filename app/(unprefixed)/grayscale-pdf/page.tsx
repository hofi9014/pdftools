'use client';
import { useState } from 'react';
import CloudFileSaver from '@/components/CloudFileSaver';
import CloudFilePicker from '@/components/CloudFilePicker';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import ToolGlyph from '@/components/ToolGlyph';
import PdfBadge from '@/components/PdfBadge';
import { errorText } from '@/lib/error-text';
import { useIdlePreload } from '@/hooks/useIdlePreload';
import type { GrayscaleReport } from '@/lib/pdf/grayscale';

// "Grayscale PDF" (plan 2.6, 2026-11-26). The engine (lib/pdf/grayscale.ts, pdf-lib only) rewrites
// the colours in place — text stays text, vector graphics stay vector graphics — and the browser
// decodes and re-encodes JPEG images. Loaded when the page is idle or on first use.
const loadEngine = () => Promise.all([import('@/lib/pdf/grayscale'), import('@/lib/pdf/browserGrayscaleCodec')]);

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GrayscalePdf({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const contextLocale = useLocale().locale;
  const locale = forcedLocale ?? contextLocale;
  useIdlePreload(loadEngine);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<GrayscaleReport | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [outBlob, setOutBlob] = useState<Blob | null>(null);

  const outName = (f: File) => f.name.replace(/\.pdf$/i, '') + t('file.grayscale_suffix', locale) + '.pdf';

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { setError(t('error.onlypdf', locale)); return; }
    setFile(f);
    setError('');
    setReport(null);
    setOutBlob(null);
  };

  const handleConvert = async () => {
    if (!file) { setError(t('error.select', locale)); return; }
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const [{ convertToGrayscale }, { browserGrayscaleCodec }] = await loadEngine();
      const { bytes, report: r } = await convertToGrayscale(new Uint8Array(await file.arrayBuffer()), browserGrayscaleCodec);
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      saveBlob(blob, outName(file));
      setOutBlob(blob);
      setReport(r);
    } catch (err: unknown) {
      setError(errorText(err, locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('grayscale')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.grayscale', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.grayscale.desc', locale)}</p>
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0] ?? null); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('fileInput')?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('fileInput')?.click(); } }}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
          ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
          ${file ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}>
        {file ? (
          <div>
            <div className="text-5xl mb-3"><PdfBadge /></div>
            <p className="font-medium tool-heading">{file.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{t('drag.change', locale)}</p>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-3"><ToolGlyph name="folderOpen" /></div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">{t('drag.title', locale)}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('drag.subtitle', locale)}</p>
          </div>
        )}
        <input id="fileInput" type="file" accept=".pdf" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)} />
      </div>

      <div className="flex justify-center gap-2 mb-6">
        <CloudFilePicker onFilesPicked={(f) => handleFile(f[0] || null)} label={t('cloud.add', locale)} />
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6" role="alert"><ToolGlyph name="warning" /> {error}</div>}

      {report && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6" role="status">
          <ToolGlyph name="success" /> {t('page.grayscale.success', locale)}
          <div className="text-sm mt-1" data-testid="grayscale-summary">
            {t('page.grayscale.summary', locale, { pages: report.pages, colours: report.colours, images: report.images, gradients: report.gradients })}
          </div>
        </div>
      )}
      {report && report.overlayPages.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl p-4 mb-6 text-sm" data-testid="grayscale-overlay">
          <ToolGlyph name="info" /> {t('page.grayscale.overlay_note', locale, { pages: report.overlayPages.join(', ') })}
        </div>
      )}
      {report && file && outBlob && (
        <div className="flex justify-center mb-6">
          <CloudFileSaver blob={outBlob} fileName={outName(file)} />
        </div>
      )}

      <button onClick={handleConvert} disabled={loading || !file}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || !file ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? <span><ToolGlyph name="hourglass" /> {t('page.grayscale.loading', locale)}</span> : <span>{t('page.grayscale.btn', locale)}</span>}
      </button>

      <div className="tool-info-box rounded-2xl p-5 mt-8">
        <h2 className="font-bold tool-heading mb-2">{t('page.grayscale.how_title', locale)}</h2>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>{t('page.grayscale.how_1', locale)}</li>
          <li>{t('page.grayscale.how_2', locale)}</li>
          <li>{t('page.grayscale.how_3', locale)}</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: 'shield' as const, text: t('feature.local_short', locale) },
          { icon: 'bolt' as const, text: t('feature.instant_result', locale) },
          { icon: 'gift' as const, text: t('feature.free_simple', locale) },
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
