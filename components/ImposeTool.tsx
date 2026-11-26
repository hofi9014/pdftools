'use client';
import { useState } from 'react';
import Link from 'next/link';
import CloudFileSaver from '@/components/CloudFileSaver';
import CloudFilePicker from '@/components/CloudFilePicker';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import { toolPath } from '@/lib/tools';
import ToolGlyph from '@/components/ToolGlyph';
import PdfBadge from '@/components/PdfBadge';
import { errorText } from '@/lib/error-text';
import { useIdlePreload } from '@/hooks/useIdlePreload';
import type { ImposeResult, PagesPerSheet, SheetSize } from '@/lib/pdf/imposePages';

// "Pages per sheet" and "Booklet" (plan 2.7, 2026-11-26) — one page component, two tools.
// The engine (lib/pdf/imposePages.ts, pdf-lib only) is loaded when the page is idle or on first use.
const loadEngine = () => import('@/lib/pdf/imposePages');

const PER_SHEET: PagesPerSheet[] = [2, 4, 6, 9, 16];
const SHEETS: SheetSize[] = ['A4', 'A3', 'Letter'];
const MARGINS = [{ mm: 0, key: 'page.impose.m_none' }, { mm: 5, key: 'page.impose.m_small' }, { mm: 10, key: 'page.impose.m_large' }];

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const choice = (active: boolean) => `px-4 py-2 rounded-xl border text-sm font-medium transition ${active
  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'}`;

export default function ImposeTool({ mode, locale: forcedLocale }: { mode: 'nup' | 'booklet'; locale?: Locale }) {
  const contextLocale = useLocale().locale;
  const locale = forcedLocale ?? contextLocale;
  useIdlePreload(loadEngine);
  const [file, setFile] = useState<File | null>(null);
  const [perSheet, setPerSheet] = useState<PagesPerSheet>(2);
  const [sheet, setSheet] = useState<SheetSize>('A4');
  const [margin, setMargin] = useState(5);
  const [borders, setBorders] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Omit<ImposeResult, 'bytes'> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [outBlob, setOutBlob] = useState<Blob | null>(null);

  const key = mode === 'nup' ? 'nup' : 'booklet';
  const outName = (f: File) => f.name.replace(/\.pdf$/i, '') + t(`file.${key}_suffix`, locale) + '.pdf';

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { setError(t('error.onlypdf', locale)); return; }
    setFile(f);
    setError('');
    setResult(null);
    setOutBlob(null);
  };

  const handleSubmit = async () => {
    if (!file) { setError(t('error.select', locale)); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { imposePages } = await loadEngine();
      const { bytes, ...rest } = await imposePages(await file.arrayBuffer(), { mode, perSheet, sheet, marginMm: margin, borders });
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      saveBlob(blob, outName(file));
      setOutBlob(blob);
      setResult(rest);
    } catch (err: unknown) {
      setError(errorText(err, locale));
    } finally {
      setLoading(false);
    }
  };

  const [notePre, notePost] = t(mode === 'nup' ? 'page.impose.see_booklet' : 'page.impose.see_nup', locale).split('{tool}');

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon(key)}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t(`tool.${key}`, locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t(`page.${key}.desc`, locale)}</p>
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

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6 space-y-5">
        {mode === 'nup' && (
          <div role="group" aria-labelledby="impose-per-sheet">
            <p id="impose-per-sheet" className="font-medium tool-heading mb-2">{t('page.impose.per_sheet', locale)}</p>
            <div className="flex flex-wrap gap-2">
              {PER_SHEET.map((n) => (
                <button key={n} type="button" aria-pressed={perSheet === n} className={choice(perSheet === n)} onClick={() => setPerSheet(n)}>{n}</button>
              ))}
            </div>
          </div>
        )}
        <div role="group" aria-labelledby="impose-sheet">
          <p id="impose-sheet" className="font-medium tool-heading mb-2">{t('page.impose.sheet_size', locale)}</p>
          <div className="flex flex-wrap gap-2">
            {SHEETS.map((s) => (
              <button key={s} type="button" aria-pressed={sheet === s} className={choice(sheet === s)} onClick={() => setSheet(s)}>{s}</button>
            ))}
          </div>
        </div>
        <div role="group" aria-labelledby="impose-margin">
          <p id="impose-margin" className="font-medium tool-heading mb-2">{t('page.impose.margin', locale)}</p>
          <div className="flex flex-wrap gap-2">
            {MARGINS.map((m) => (
              <button key={m.mm} type="button" aria-pressed={margin === m.mm} className={choice(margin === m.mm)} onClick={() => setMargin(m.mm)}>{t(m.key, locale)}</button>
            ))}
          </div>
        </div>
        <label htmlFor="impose-borders" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input id="impose-borders" type="checkbox" checked={borders} onChange={(e) => setBorders(e.target.checked)} />
          <span>{t('page.impose.borders', locale)}</span>
        </label>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6" role="alert"><ToolGlyph name="warning" /> {error}</div>}

      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6" role="status">
          <ToolGlyph name="success" /> {t('page.impose.success', locale)}
          <div className="text-sm mt-1" data-testid="impose-summary">
            {mode === 'nup'
              ? t('page.impose.summary_nup', locale, { pages: result.sourcePages, sheets: result.sheets })
              : t('page.impose.summary_booklet', locale, { pages: result.sourcePages, sheets: result.sheets, sides: result.sheets * 2 })}
            {result.blanksAdded > 0 && <> {t('page.impose.blanks', locale, { n: result.blanksAdded })}</>}
          </div>
        </div>
      )}
      {result && mode === 'booklet' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl p-4 mb-6 text-sm" data-testid="impose-print-tip">
          <ToolGlyph name="info" /> {t('page.impose.print_tip', locale)}
        </div>
      )}
      {result && file && outBlob && (
        <div className="flex justify-center mb-6">
          <CloudFileSaver blob={outBlob} fileName={outName(file)} />
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading || !file}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || !file ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? <span><ToolGlyph name="hourglass" /> {t('page.impose.loading', locale)}</span> : <span>{t(`page.impose.btn_${key}`, locale)}</span>}
      </button>

      <div className="tool-info-box rounded-2xl p-5 mt-8">
        <h2 className="font-bold tool-heading mb-2">{t('page.impose.how_title', locale)}</h2>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>{t('page.impose.how_1', locale)}</li>
          <li>{t(mode === 'nup' ? 'page.impose.how_2_nup' : 'page.impose.how_2_booklet', locale)}</li>
          <li>{t('page.impose.how_3', locale)}</li>
        </ul>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
          {notePre}<Link href={toolPath(mode === 'nup' ? 'booklet' : 'nup', locale)} className="link-accent underline">{t(mode === 'nup' ? 'tool.booklet' : 'tool.nup', locale)}</Link>{notePost}
        </p>
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
