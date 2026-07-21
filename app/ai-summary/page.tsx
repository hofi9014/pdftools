'use client';
import { useState, useCallback } from 'react';
import { extractTextFromPDF } from '@/lib/client-pdf';
import { summarizeText } from '@/lib/client-ai';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import CloudFilePicker from '@/components/CloudFilePicker';

export default function AiSummary({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const locale = forcedLocale ?? useLocale().locale;
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError(t('error.onlypdf', locale)); return; }
    setFile(f); setError(''); setSummary(''); setNote('');
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setError(''); setSummary(''); setNote('');
    try {
      const text = await extractTextFromPDF(file);
      if (!text.trim()) { throw new Error(t('page.aisummary.no_text', locale)); }
      const result = await summarizeText(text);
      setSummary(result);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : t('error.generic', locale)); }
    finally { setLoading(false); }
  }, [file]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{getToolIcon('aisummary')}</div>
        <h1 className="text-3xl font-bold tool-heading">{t('tool.aisummary', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{t('page.aisummary.desc', locale)}</p>
      </div>

      <form onSubmit={handleSubmit} className="tool-card rounded-2xl border p-8 space-y-6">
          <div onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById('file-input')?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-blue-400'} ${file ? 'border-green-400 dark:border-green-500' : ''}`}>
          <input id="file-input" type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
          {file ? <p className="!text-[var(--coffee-accent)] font-medium">{file.name}</p> : <p className="text-gray-400 dark:text-gray-500">{t('page.aisummary.click_to_select', locale)}</p>}
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <CloudFilePicker onFilesPicked={(f) => handleFile(f[0] || null)} label={"☁️ " + t('cloud.add', locale)} />
        </div>

        <button type="submit" disabled={!file || loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium rounded-xl transition">
          {loading ? <span>{t('page.aisummary.loading', locale)}</span> : <span>{t('page.aisummary.btn_generate', locale)}</span>}
        </button>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {note && <p className="text-amber-600 dark:text-amber-400 text-xs">{note}</p>}

        {summary && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold tool-heading mb-3 text-lg">{t('page.aisummary.summary_heading', locale)}</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{summary}</div>
          </div>
        )}
      </form>

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
        <h2 className="font-semibold tool-heading mb-2">{t('section.how_it_works', locale)}</h2>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
          <li>{t('page.aisummary.howto_1', locale)}</li>
          <li>{t('page.aisummary.howto_2', locale)}</li>
          <li>{t('page.aisummary.howto_3', locale)}</li>
          <li>{t('page.aisummary.howto_4', locale)}</li>
          <li>{t('page.aisummary.howto_5', locale)}</li>
        </ul>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">{t('feature.ai_daily_limit', locale)}</p>
    </div>
  );
}
