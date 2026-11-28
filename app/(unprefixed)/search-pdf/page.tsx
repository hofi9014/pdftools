'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import CloudFilePicker from '@/components/CloudFilePicker';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import { toolPath } from '@/lib/tools';
import ToolGlyph from '@/components/ToolGlyph';
import PdfBadge from '@/components/PdfBadge';
import { errorText } from '@/lib/error-text';
import { useIdlePreload } from '@/hooks/useIdlePreload';
import { hitsToCsv, searchPages, type SearchHit } from '@/lib/pdf/searchText';

// "Search in many PDFs" (plan 2.8, 2026-11-26). The text of each page is read once, when the file
// is added (lib/pdf/pdfPageTexts.ts, pdf.js — loaded when the page is idle or on first use); the
// search itself (lib/pdf/searchText.ts) runs on every keystroke over the texts in memory.
const loadEngine = () => import('@/lib/pdf/pdfPageTexts');

const MAX_SHOWN = 100;

interface Doc {
  id: number;
  file: File;
  status: 'reading' | 'ready' | 'error';
  pages?: string[];
  chars?: number;
  error?: string;
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SearchPdf({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const contextLocale = useLocale().locale;
  const locale = forcedLocale ?? contextLocale;
  useIdlePreload(loadEngine);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [query, setQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchDiacritics, setMatchDiacritics] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const nextId = useRef(1);

  const addFiles = async (list: File[]) => {
    const pdfs = list.filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    setError(pdfs.length < list.length ? t('error.onlypdf', locale) : '');
    const added = pdfs.map((file) => ({ id: nextId.current++, file, status: 'reading' as const }));
    if (!added.length) return;
    setDocs((d) => [...d, ...added]);
    const { pdfPageTexts } = await loadEngine();
    for (const doc of added) {
      try {
        const { pages, chars } = await pdfPageTexts(new Uint8Array(await doc.file.arrayBuffer()));
        setDocs((d) => d.map((x) => (x.id === doc.id ? { ...x, status: 'ready', pages, chars } : x)));
      } catch (err: unknown) {
        setDocs((d) => d.map((x) => (x.id === doc.id ? { ...x, status: 'error', error: errorText(err, locale) } : x)));
      }
    }
  };

  const results = useMemo(() => {
    if (!query.trim()) return null;
    return docs
      .filter((d) => d.status === 'ready')
      .map((d) => ({ doc: d, hits: searchPages(d.pages!, query, { matchCase, matchDiacritics, wholeWord }) }));
  }, [docs, query, matchCase, matchDiacritics, wholeWord]);
  const total = results?.reduce((n, r) => n + r.hits.length, 0) ?? 0;
  const filesWithHits = results?.filter((r) => r.hits.length > 0).length ?? 0;
  const reading = docs.some((d) => d.status === 'reading');

  const downloadCsv = () => {
    if (!results) return;
    const rows = results.flatMap((r) => r.hits.map((hit: SearchHit) => ({ file: r.doc.file.name, hit })));
    const csv = hitsToCsv(rows, [t('page.search.csv_file', locale), t('page.search.csv_page', locale), t('page.search.csv_fragment', locale)]);
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${t('file.search_results', locale)}.csv`);
  };

  const [ocrPre, ocrPost] = t('page.search.no_text', locale).split('{tool}');

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('search')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.search', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.search.desc', locale)}</p>
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void addFiles(Array.from(e.dataTransfer.files)); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('fileInput')?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('fileInput')?.click(); } }}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
          ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
        <div className="text-5xl mb-3"><ToolGlyph name="folderOpen" /></div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">{t('page.search.drop', locale)}</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('drag.subtitle', locale)}</p>
        <input id="fileInput" type="file" accept=".pdf" multiple className="hidden"
          onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      </div>

      <div className="flex justify-center gap-2 mb-6">
        <CloudFilePicker onFilesPicked={(f) => void addFiles(f)} label={t('cloud.add', locale)} />
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6" role="alert"><ToolGlyph name="warning" /> {error}</div>}

      {docs.length > 0 && (
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6" aria-labelledby="search-files">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 id="search-files" className="font-bold tool-heading">{t('page.search.files_title', locale, { n: docs.length })}</h2>
            <button type="button" className="text-sm text-red-700 dark:text-red-400 hover:underline" onClick={() => setDocs([])}>{t('page.search.clear', locale)}</button>
          </div>
          <ul className="space-y-2 text-sm" data-testid="search-files">
            {docs.map((d) => (
              <li key={d.id} className="flex items-start gap-3">
                <span className="text-xl shrink-0"><PdfBadge /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium tool-heading break-all">{d.file.name}</p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {d.status === 'reading' && <><ToolGlyph name="hourglass" /> {t('page.search.reading', locale)}</>}
                    {d.status === 'ready' && t('page.search.pages', locale, { n: d.pages!.length })}
                    {d.status === 'error' && <span className="text-red-700 dark:text-red-400">{d.error}</span>}
                  </p>
                  {d.status === 'ready' && d.chars === 0 && (
                    <p className="text-amber-800 dark:text-amber-300" data-testid="search-no-text">
                      {ocrPre}<Link href={toolPath('ocr', locale)} className="link-accent underline">{t('tool.ocr', locale)}</Link>{ocrPost}
                    </p>
                  )}
                </div>
                <button type="button" className="text-sm text-gray-500 dark:text-gray-400 hover:underline shrink-0"
                  aria-label={`${t('page.search.remove', locale)}: ${d.file.name}`}
                  onClick={() => setDocs((all) => all.filter((x) => x.id !== d.id))}>{t('page.search.remove', locale)}</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <label htmlFor="search-query" className="block font-medium tool-heading mb-2">{t('page.search.query_label', locale)}</label>
        <input id="search-query" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t('page.search.query_placeholder', locale)}
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-base tool-heading" />
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-gray-700 dark:text-gray-300">
          {[
            { id: 'search-case', v: matchCase, set: setMatchCase, key: 'page.search.opt_case' },
            { id: 'search-diacritics', v: matchDiacritics, set: setMatchDiacritics, key: 'page.search.opt_diacritics' },
            { id: 'search-whole', v: wholeWord, set: setWholeWord, key: 'page.search.opt_whole' },
          ].map((o) => (
            <label key={o.id} htmlFor={o.id} className="flex items-center gap-2 cursor-pointer">
              <input id={o.id} type="checkbox" checked={o.v} onChange={(e) => o.set(e.target.checked)} />
              <span>{t(o.key, locale)}</span>
            </label>
          ))}
        </div>
      </div>

      {results && (
        <section aria-labelledby="search-results" className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 id="search-results" className="font-bold tool-heading" role="status" data-testid="search-summary">
              {total > 0
                ? t('page.search.summary', locale, { hits: total, files: filesWithHits, total: results.length })
                : t('page.search.no_hits', locale, { query: query.trim() })}
              {reading && <span className="font-normal text-gray-500 dark:text-gray-400"> — {t('page.search.still_reading', locale)}</span>}
            </h2>
            {total > 0 && (
              <button type="button" onClick={downloadCsv} className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium tool-heading hover:border-blue-400">
                {t('page.search.csv', locale)}
              </button>
            )}
          </div>
          <div className="space-y-4" data-testid="search-results">
            {results.filter((r) => r.hits.length > 0).map((r) => (
              <div key={r.doc.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-medium tool-heading break-all mb-2">{r.doc.file.name} <span className="text-gray-500 dark:text-gray-400 font-normal">({r.hits.length})</span></h3>
                <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  {r.hits.slice(0, MAX_SHOWN).map((h, i) => (
                    <li key={i}>
                      <span className="font-medium text-gray-500 dark:text-gray-400">{t('page.search.page_label', locale, { page: h.page })}:</span>{' '}
                      <span className="break-words">{h.before}<mark className="bg-amber-200 dark:bg-amber-700 text-gray-900 dark:text-white rounded px-0.5">{h.match}</mark>{h.after}</span>
                    </li>
                  ))}
                </ol>
                {r.hits.length > MAX_SHOWN && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('page.search.shown_of', locale, { shown: MAX_SHOWN, total: r.hits.length })}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="tool-info-box rounded-2xl p-5 mt-8">
        <h2 className="font-bold tool-heading mb-2">{t('page.search.how_title', locale)}</h2>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>{t('page.search.how_1', locale)}</li>
          <li>{t('page.search.how_2', locale)}</li>
          <li>{t('page.search.how_3', locale)}</li>
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
