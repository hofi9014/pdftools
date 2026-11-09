'use client';
import { useState, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import CloudFileSaver from '@/components/CloudFileSaver';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import ToolGlyph from '@/components/ToolGlyph';
import { errorText } from '@/lib/error-text';

export default function HtmlToPdf({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const locale = forcedLocale ?? useLocale().locale;
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const processedBlobRef = useRef<Blob | null>(null);

  const handleConvert = async () => {
    if (!html.trim()) { setError(t('page.html.no_html', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { htmlToTaggedPdf } = await import('@/lib/pdf/htmlToTaggedPdf');
      const blob = await htmlToTaggedPdf(html);
      processedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t('file.document', locale)}.pdf`;
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
        <div className="text-6xl mb-4">{getToolIcon('html')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.html', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.html.desc', locale)}</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <label className="font-medium text-gray-700 dark:text-gray-300">{t('page.html.paste_label', locale)}</label>
          <div className="flex gap-2">
            <button onClick={() => setHtml(`<h1>${t('page.html.sample_title', locale)}</h1>\n<p>${t('page.html.sample_text', locale)}</p>`)}
              className="text-xs !text-[var(--coffee-accent-ink)] hover:underline">{t('page.html.example_btn', locale)}</button>
            <button onClick={() => setHtml('')}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline">{t('btn.clear', locale)}</button>
          </div>
        </div>
        <textarea
          value={html}
          onChange={e => { setHtml(e.target.value); setSuccess(false); setError(''); }}
          placeholder={t('page.html.placeholder', locale)}
          rows={12}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-2xl px-5 py-4 text-sm font-mono focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 tool-heading resize-y"
        />
      </div>

      {html.trim() && (
        <div className="tool-card rounded-2xl border p-5 mb-6">
          <h2 className="font-bold text-gray-700 dark:text-gray-300 mb-3">{t('page.html.preview', locale)}</h2>
          <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 max-h-60 overflow-y-auto bg-white text-gray-900"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, { ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','b','i','strong','em','a','ul','ol','li','pre','code','blockquote','table','thead','tbody','tr','th','td','img','div','span','hr','sub','sup','dl','dt','dd'] }) }} />
          <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-xl px-4 py-3 text-sm">
            <ToolGlyph name="warning" /> {t('page.html.warning', locale)}
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6"><ToolGlyph name="warning" /> {error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6"><ToolGlyph name="success" /> {t('page.html.success', locale)}</div>}
      {success && processedBlobRef.current && (
        <div className="flex justify-center mb-6">
          <CloudFileSaver blob={processedBlobRef.current} fileName={`${t('file.document', locale)}.pdf`} />
        </div>
      )}

      <button data-testid="html-to-pdf-submit" onClick={handleConvert} disabled={loading || !html.trim()}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || !html.trim() ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? <span><ToolGlyph name="hourglass" /> {t('page.html.loading', locale)}</span> : <span>{t('page.html.btn', locale)}</span>}
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: 'shield' as const, text: t('feature.no_storage', locale) },
          { icon: 'bolt' as const, text: t('feature.quick_generation', locale) },
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
