'use client';
import { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import CloudFileSaver from '@/components/CloudFileSaver';
import { useLocale } from '@/lib/locale-context';
import { localeToHtmlLang, t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import ToolGlyph from '@/components/ToolGlyph';
import PdfBadge from '@/components/PdfBadge';
import { errorText } from '@/lib/error-text';
import { useIdlePreload } from '@/hooks/useIdlePreload';
import { baseName, decodeTextFile, markdownToDocument, modeForFileName, plainTextToDocument, type TextMode } from '@/lib/markdown-to-html';
import { missingGlyphs } from '@/lib/pdf/fontCoverage';

// "Markdown to PDF" (plan 2.4, 2026-11-24): a .md or .txt file, or pasted text, becomes a tagged
// PDF through the same writer as HTML to PDF (lib/pdf/htmlToTaggedPdf.ts). Everything runs in the
// browser; the writer is loaded when the page is idle or on first use.
const loadWriter = () => import('@/lib/pdf/htmlToTaggedPdf');
/** Larger text is not a document anyone reads as a PDF, and would freeze the tab while drawn. */
const MAX_MB = 5;

export default function MarkdownToPdf({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const ctxLocale = useLocale().locale;
  const locale = forcedLocale ?? ctxLocale;
  useIdlePreload(loadWriter);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [encoding, setEncoding] = useState('');
  const [mode, setMode] = useState<TextMode>('markdown');
  const [keepLayout, setKeepLayout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);

  const doc = useMemo(() => {
    if (!text.trim()) return null;
    const opts = { lang: localeToHtmlLang(locale), fallbackTitle: fileName ? baseName(fileName) : '' };
    return mode === 'markdown' ? markdownToDocument(text, opts) : plainTextToDocument(text, { ...opts, keepLayout });
  }, [text, mode, keepLayout, fileName, locale]);
  const missing = useMemo(() => missingGlyphs(text), [text]);
  const previewHtml = useMemo(() => {
    if (!doc) return '';
    const body = /<body>([\s\S]*)<\/body>/.exec(doc.html)?.[1] ?? '';
    return DOMPurify.sanitize(body);
  }, [doc]);
  const pdfName = `${(fileName && baseName(fileName)) || t('file.document', locale)}.pdf`;

  const reset = () => { setSuccess(false); setError(''); setResult(null); };

  const handleFile = async (f: File | null) => {
    reset();
    if (!f) return;
    const fileMode = modeForFileName(f.name);
    if (!fileMode) { setError(t('page.md.bad_file', locale)); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setError(t('page.md.too_big', locale, { mb: MAX_MB })); return; }
    const decoded = decodeTextFile(new Uint8Array(await f.arrayBuffer()), locale);
    setText(decoded.text);
    setEncoding(decoded.encoding === 'UTF-8' || decoded.encoding === 'UTF-16' ? '' : decoded.encoding);
    setFileName(f.name);
    setMode(fileMode);
  };

  const handleConvert = async () => {
    if (!doc) { setError(t('page.md.empty', locale)); return; }
    setLoading(true);
    reset();
    try {
      const { htmlToTaggedPdf } = await loadWriter();
      const blob = await htmlToTaggedPdf(doc.html);
      setResult(blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfName;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err: unknown) {
      setError(errorText(err, locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('markdown')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.markdown', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.md.desc', locale)}</p>
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFile(e.dataTransfer.files[0] ?? null); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('fileInput')?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('fileInput')?.click(); } }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition mb-6
          ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
          ${fileName ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}>
        {fileName ? (
          <div>
            <div className="text-4xl mb-2"><PdfBadge type={mode === 'markdown' ? 'MD' : 'TXT'} /></div>
            <p className="font-medium tool-heading break-all">{fileName}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{t('drag.change', locale)}</p>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-2"><ToolGlyph name="folderOpen" /></div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">{t('page.md.drop_title', locale)}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('drag.subtitle', locale)}</p>
          </div>
        )}
        <input id="fileInput" type="file" accept=".md,.markdown,.mdown,.mkd,.txt,.text,text/markdown,text/plain" className="hidden"
          onChange={(e) => { void handleFile(e.target.files?.[0] || null); e.target.value = ''; }} />
      </div>
      {encoding && (
        <p className="text-sm text-amber-700 dark:text-amber-400 mb-4" data-testid="md-encoding"><ToolGlyph name="info" /> {t('page.md.legacy_encoding', locale, { enc: encoding })}</p>
      )}

      <div className="space-y-3 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="md-text" className="font-medium text-gray-700 dark:text-gray-300">{t('page.md.text_label', locale)}</label>
          <div className="flex gap-3">
            <button type="button" onClick={() => { reset(); setFileName(''); setEncoding(''); setMode('markdown'); setText(t('page.md.sample', locale)); }}
              className="text-xs !text-[var(--coffee-accent-ink)] hover:underline">{t('page.html.example_btn', locale)}</button>
            <button type="button" onClick={() => { reset(); setFileName(''); setEncoding(''); setText(''); }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline">{t('btn.clear', locale)}</button>
          </div>
        </div>
        <textarea
          id="md-text"
          value={text}
          onChange={(e) => { setText(e.target.value); reset(); }}
          placeholder={t('page.md.placeholder', locale)}
          rows={12}
          spellCheck={false}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-2xl px-5 py-4 text-sm font-mono focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 tool-heading resize-y"
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <legend className="sr-only">{t('page.md.mode_label', locale)}</legend>
            <span aria-hidden="true" className="text-sm text-gray-600 dark:text-gray-400">{t('page.md.mode_label', locale)}:</span>
            {(['markdown', 'text'] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="radio" name="md-mode" value={m} checked={mode === m} onChange={() => { setMode(m); reset(); }} />
                {t(m === 'markdown' ? 'page.md.mode_markdown' : 'page.md.mode_text', locale)}
              </label>
            ))}
          </fieldset>
          {mode === 'text' && (
            <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" checked={keepLayout} onChange={(e) => { setKeepLayout(e.target.checked); reset(); }} />
              {t('page.md.keep_layout', locale)}
            </label>
          )}
        </div>
      </div>

      {doc && (
        <div className="tool-card rounded-2xl border p-5 mb-6">
          <h2 className="font-bold text-gray-700 dark:text-gray-300 mb-3">{t('page.html.preview', locale)}</h2>
          <div className="doc-preview border border-gray-200 dark:border-gray-600 rounded-xl p-4 max-h-80 overflow-y-auto bg-white text-gray-900"
            data-testid="md-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          {missing.length > 0 && (
            <p className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3 text-sm" data-testid="md-missing-glyphs">
              <ToolGlyph name="warning" /> {t('page.md.missing_glyphs', locale, { chars: missing.join(' ') })}
            </p>
          )}
          {doc.skippedImages > 0 && (
            <p className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3 text-sm" data-testid="md-skipped-images">
              <ToolGlyph name="warning" /> {t('page.md.skipped_images', locale, { n: doc.skippedImages })}
            </p>
          )}
        </div>
      )}

      {error && <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6"><ToolGlyph name="warning" /> {error}</div>}
      {success && <div role="status" className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6"><ToolGlyph name="success" /> {t('page.md.success', locale)}</div>}
      {success && result && (
        <div className="flex justify-center mb-6">
          <CloudFileSaver blob={result} fileName={pdfName} />
        </div>
      )}

      <button data-testid="md-to-pdf-submit" onClick={handleConvert} disabled={loading || !doc}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || !doc ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? <span><ToolGlyph name="hourglass" /> {t('page.html.loading', locale)}</span> : <span>{t('page.html.btn', locale)}</span>}
      </button>

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">{t('page.md.kept', locale)}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: 'shield' as const, text: t('feature.no_upload_browser', locale) },
          { icon: 'bolt' as const, text: t('feature.fast_processing', locale) },
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
