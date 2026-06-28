'use client';
import { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { htmlToPdf } from '@/lib/client-pdf';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

export default function HtmlToPdf() {
  const { locale } = useLocale();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleConvert = async () => {
    if (!html.trim()) { setError(t('page.html2pdf.no_html', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const blob = await htmlToPdf(html);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dokument.pdf';
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.generic', locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('html')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.html2pdf', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.html2pdf.desc', locale)}</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <label className="font-medium text-gray-700 dark:text-gray-300">{t('page.html2pdf.paste_label', locale)}</label>
          <div className="flex gap-2">
            <button onClick={() => setHtml('<h1>Witaj świecie</h1>\n<p>To jest przykładowy dokument PDF wygenerowany z HTML.</p>')}
              className="text-xs !text-[var(--coffee-accent)] hover:underline">{t('page.html2pdf.example_btn', locale)}</button>
            <button onClick={() => setHtml('')}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline">{t('btn.clear', locale)}</button>
          </div>
        </div>
        <textarea
          value={html}
          onChange={e => { setHtml(e.target.value); setSuccess(false); setError(''); }}
          placeholder={t('page.html2pdf.placeholder', locale)}
          rows={12}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-2xl px-5 py-4 text-sm font-mono focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 tool-heading resize-y"
        />
      </div>

      {html.trim() && (
        <div className="tool-card rounded-2xl border p-5 mb-6">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3">{t('page.html2pdf.preview', locale)}</h3>
          <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 max-h-60 overflow-y-auto bg-white"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, { ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','b','i','strong','em','a','ul','ol','li','pre','code','blockquote','table','thead','tbody','tr','th','td','img','div','span','hr','sub','sup','dl','dt','dd'] }) }} />
        </div>
      )}

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">✅ {t('page.html2pdf.success', locale)}</div>}

      <button onClick={handleConvert} disabled={loading || !html.trim()}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || !html.trim() ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? <span>⏳ {t('page.html2pdf.loading', locale)}</span> : <span>🌐 {t('page.html2pdf.btn', locale)}</span>}
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: '🔒', text: t('feature.no_storage', locale) },
          { icon: '⚡', text: t('feature.quick_generation', locale) },
          { icon: '🆓', text: t('feature.free_simple', locale) },
        ].map((item, i) => (
          <div key={i} className="tool-feature-card rounded-xl p-4 border">
            <div className="text-2xl mb-1">{item.icon}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
