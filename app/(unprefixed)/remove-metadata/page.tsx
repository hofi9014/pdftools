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
import type { MetadataReport } from '@/lib/pdf/cleanMetadata';

// "Remove metadata" (plan 2.1, 2026-11-20). The engine (lib/pdf/cleanMetadata.ts, pdf-lib only)
// is loaded when the page is idle or on first use, so it is not in the page's first script.
// The page shows what the file says about itself, removes it, then checks the downloaded file
// with the same analysis and says whether anything is left.
const loadEngine = () => import('@/lib/pdf/cleanMetadata');

/** Readable labels for the Info dictionary entries users actually see in files. */
const INFO_LABELS: Record<string, string> = {
  Author: 'page.metadata.author', Title: 'page.metadata.title', Subject: 'page.metadata.subject',
  Keywords: 'page.metadata.keywords', Creator: 'page.cleanmeta.k_creator', Producer: 'page.cleanmeta.k_producer',
  CreationDate: 'page.cleanmeta.k_created', ModDate: 'page.cleanmeta.k_modified',
};

/** PDF dates look like D:20260115093012+01'00' — shown as 2026-01-15 09:30. */
function readableValue(value: string): string {
  const m = /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(value);
  if (!m) return value;
  const [, y, mo = '01', d = '01', h, mi] = m;
  return `${y}-${mo}-${d}${h ? ` ${h}:${mi ?? '00'}` : ''}`;
}

function hasFindings(r: MetadataReport): boolean {
  return r.info.some((i) => i.value.trim()) || r.xmp || r.objectXmp > 0 || r.jpegWithMetadata > 0 || r.pageThumbnails > 0
    || r.pieceInfo > 0 || r.annotationAuthors.length > 0 || r.attachments > 0 || r.unreferenced > 0;
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RemoveMetadata({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const contextLocale = useLocale().locale;
  const locale = forcedLocale ?? contextLocale;
  useIdlePreload(loadEngine);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<MetadataReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<'clean' | 'kept' | 'left' | null>(null);
  const [removeAuthors, setRemoveAuthors] = useState(true);
  const [removeAttachments, setRemoveAttachments] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [outBlob, setOutBlob] = useState<Blob | null>(null);

  const outName = (f: File) => f.name.replace(/\.pdf$/i, '') + t('file.cleaned_suffix', locale) + '.pdf';

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { setError(t('error.onlypdf', locale)); return; }
    setFile(f);
    setError('');
    setResult(null);
    setOutBlob(null);
    setReport(null);
    setRemoveAuthors(true);
    setRemoveAttachments(false);
    setAnalyzing(true);
    try {
      const { analyzePdfMetadata } = await loadEngine();
      setReport(await analyzePdfMetadata(await f.arrayBuffer()));
    } catch (err: unknown) {
      setError(errorText(err, locale));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClean = async () => {
    if (!file) { setError(t('error.select', locale)); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { cleanPdfMetadata, analyzePdfMetadata, reportIsClean } = await loadEngine();
      const opts = { annotationAuthors: removeAuthors, attachments: removeAttachments };
      const bytes = await cleanPdfMetadata(await file.arrayBuffer(), opts);
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      saveBlob(blob, outName(file));
      setOutBlob(blob);
      // The downloaded bytes are checked with the same analysis that produced the list above.
      const after = await analyzePdfMetadata(bytes);
      const keptSomething = (!removeAuthors && after.annotationAuthors.length > 0) || (!removeAttachments && after.attachments > 0);
      setResult(!reportIsClean(after, opts) ? 'left' : keptSomething ? 'kept' : 'clean');
    } catch (err: unknown) {
      setError(errorText(err, locale));
    } finally {
      setLoading(false);
    }
  };

  const info = report ? report.info.filter((i) => i.value.trim()) : [];
  const [notePre, notePost] = t('page.cleanmeta.content_note', locale).split('{tool}');

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('cleanmeta')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.cleanmeta', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.cleanmeta.desc', locale)}</p>
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFile(e.dataTransfer.files[0] ?? null); }}
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
          onChange={(e) => void handleFile(e.target.files?.[0] || null)} />
      </div>

      <div className="flex justify-center gap-2 mb-6">
        <CloudFilePicker onFilesPicked={(f) => void handleFile(f[0] || null)} label={t('cloud.add', locale)} />
      </div>

      {analyzing && <p className="text-center text-gray-500 dark:text-gray-400 mb-6" role="status"><ToolGlyph name="hourglass" /> {t('page.cleanmeta.analyzing', locale)}</p>}

      {report && (
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6" aria-labelledby="cleanmeta-found">
          <h2 id="cleanmeta-found" className="font-bold tool-heading mb-3">{t('page.cleanmeta.found_title', locale)}</h2>
          {!hasFindings(report) ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('page.cleanmeta.r_none', locale)}</p>
          ) : (
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc ps-5" data-testid="cleanmeta-report">
              {info.length > 0 && (
                <li>
                  {t('page.cleanmeta.r_info', locale)}
                  <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                    {info.map((i) => (
                      <div key={i.key} className="contents">
                        <dt className="text-gray-500 dark:text-gray-400">{INFO_LABELS[i.key] ? t(INFO_LABELS[i.key]!, locale) : i.key}</dt>
                        <dd className="break-all">{readableValue(i.value)}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              )}
              {report.xmp && <li>{t('page.cleanmeta.r_xmp', locale, { kb: Math.max(1, Math.round(report.xmpBytes / 1024)) })}</li>}
              {report.xmpHistory > 0 && <li>{t('page.cleanmeta.r_history', locale, { n: report.xmpHistory })}</li>}
              {report.xmpThumbnail && <li>{t('page.cleanmeta.r_xmp_thumb', locale)}</li>}
              {report.xmpPaths.length > 0 && (
                <li>
                  {t('page.cleanmeta.r_paths', locale)}
                  <ul className="mt-1 space-y-0.5">{report.xmpPaths.map((p) => <li key={p} className="break-all font-mono text-xs" dir="ltr">{p}</li>)}</ul>
                </li>
              )}
              {report.xmpIds && <li>{t('page.cleanmeta.r_ids', locale)}</li>}
              {report.objectXmp > 0 && <li>{t('page.cleanmeta.r_object_xmp', locale, { n: report.objectXmp })}</li>}
              {report.jpegWithMetadata > 0 && <li>{t('page.cleanmeta.r_jpeg', locale, { n: report.jpegWithMetadata })}</li>}
              {report.pageThumbnails > 0 && <li>{t('page.cleanmeta.r_page_thumbs', locale, { n: report.pageThumbnails })}</li>}
              {report.pieceInfo > 0 && <li>{t('page.cleanmeta.r_pieceinfo', locale, { n: report.pieceInfo })}</li>}
              {report.annotationAuthors.length > 0 && <li>{t('page.cleanmeta.r_authors', locale)} {report.annotationAuthors.join(', ')}</li>}
              {report.attachments > 0 && <li>{t('page.cleanmeta.r_attachments', locale, { n: report.attachments })}</li>}
              {report.unreferenced > 0 && <li>{t('page.cleanmeta.r_unref', locale, { n: report.unreferenced })}</li>}
            </ul>
          )}

          {(report.annotationAuthors.length > 0 || report.attachments > 0) && (
            <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {report.annotationAuthors.length > 0 && (
                <label htmlFor="cleanmeta-authors" className="flex items-start gap-2 cursor-pointer">
                  <input id="cleanmeta-authors" type="checkbox" className="mt-1" checked={removeAuthors} onChange={(e) => setRemoveAuthors(e.target.checked)} />
                  <span>{t('page.cleanmeta.opt_authors', locale)}</span>
                </label>
              )}
              {report.attachments > 0 && (
                <label htmlFor="cleanmeta-attachments" className="flex items-start gap-2 cursor-pointer">
                  <input id="cleanmeta-attachments" type="checkbox" className="mt-1" checked={removeAttachments} onChange={(e) => setRemoveAttachments(e.target.checked)} />
                  <span>{t('page.cleanmeta.opt_attachments', locale)}</span>
                </label>
              )}
            </div>
          )}
        </section>
      )}

      {report?.signed && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl p-4 mb-6 text-sm">
          <ToolGlyph name="warning" /> {t('page.cleanmeta.warn_signed', locale)}
        </div>
      )}
      {report?.pdfA && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl p-4 mb-6 text-sm">
          <ToolGlyph name="info" /> {t('page.cleanmeta.warn_pdfa', locale)}
        </div>
      )}

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6" role="alert"><ToolGlyph name="warning" /> {error}</div>}
      {result && (
        <div className={`rounded-xl p-4 mb-6 border ${result === 'left' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'}`} role="status">
          {result === 'left' ? <ToolGlyph name="warning" /> : <ToolGlyph name="success" />} {t('page.cleanmeta.success', locale)}
          <div className="text-sm mt-1" data-testid="cleanmeta-verdict">
            {t(result === 'clean' ? 'page.cleanmeta.verified' : result === 'kept' ? 'page.cleanmeta.verified_kept' : 'page.cleanmeta.not_verified', locale)}
          </div>
        </div>
      )}
      {result && file && outBlob && (
        <div className="flex justify-center mb-6">
          <CloudFileSaver blob={outBlob} fileName={outName(file)} />
        </div>
      )}

      <button onClick={handleClean} disabled={loading || analyzing || !file}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || analyzing || !file ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? <span><ToolGlyph name="hourglass" /> {t('page.cleanmeta.loading', locale)}</span> : <span>{t('page.cleanmeta.btn', locale)}</span>}
      </button>

      <div className="tool-info-box rounded-2xl p-5 mt-8">
        <h2 className="font-bold tool-heading mb-2">{t('page.cleanmeta.keeps_title', locale)}</h2>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>{t('page.cleanmeta.keeps_1', locale)}</li>
          <li>{t('page.cleanmeta.keeps_2', locale)}</li>
          <li>{t('page.cleanmeta.keeps_3', locale)}</li>
        </ul>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
          {notePre}<Link href={toolPath('redact', locale)} className="link-accent underline">{t('tool.redact', locale)}</Link>{notePost}
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
