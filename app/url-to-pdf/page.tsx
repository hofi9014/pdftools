'use client';
import { useState, useRef } from 'react';
import CloudFileSaver from '@/components/CloudFileSaver';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

export default function UrlToPdf() {
  const { locale } = useLocale();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const processedBlobRef = useRef<Blob | null>(null);

  const handleConvert = async () => {
    if (!url.trim()) { setError(t('page.url.no_url', locale)); return; }
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/url-to-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }

      const blob = await res.blob();
      processedBlobRef.current = blob;
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      a.download = 'strona.pdf';
      a.click();
      URL.revokeObjectURL(urlObj);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.generic', locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('url')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.url', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.url.desc', locale)}</p>
      </div>

      <div className="tool-card rounded-2xl border p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('page.url.url_label', locale)}</label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setSuccess(false); setError(''); }}
            placeholder="https://example.com"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-gray-50 dark:bg-gray-700 tool-heading"
          />
          <button onClick={() => setUrl('https://example.com')}
            className="text-xs !text-[var(--coffee-accent)] hover:underline whitespace-nowrap">{t('page.url.example_btn', locale)}</button>
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">✅ {t('page.url.success', locale)}</div>}
      {success && processedBlobRef.current && (
        <div className="flex justify-center mb-6">
          <CloudFileSaver blob={processedBlobRef.current} fileName="strona.pdf" />
        </div>
      )}

      <button onClick={handleConvert} disabled={loading || !url.trim()}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || !url.trim() ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? <span>⏳ {t('page.url.loading', locale)}</span> : <span>🌍 {t('page.url.btn', locale)}</span>}
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: '🔒', text: t('feature.only_content', locale) },
          { icon: '⚡', text: t('feature.quick_processing', locale) },
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
