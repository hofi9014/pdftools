'use client';
import { useState } from 'react';
import { extractTextFromPDF } from '@/lib/client-pdf';
import { translateText } from '@/lib/client-ai';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import CloudFilePicker from '@/components/CloudFilePicker';

const LANG_KEYS = [
  { value: 'angielski', key: 'lang.english' },
  { value: 'polski', key: 'lang.polish' },
  { value: 'niemiecki', key: 'lang.german' },
  { value: 'francuski', key: 'lang.french' },
  { value: 'hiszpański', key: 'lang.spanish' },
  { value: 'włoski', key: 'lang.italian' },
  { value: 'rosyjski', key: 'lang.russian' },
  { value: 'ukraiński', key: 'lang.ukrainian' },
  { value: 'czeski', key: 'lang.czech' },
  { value: 'chiński (uproszczony)', key: 'lang.chinese_simplified' },
  { value: 'japoński', key: 'lang.japanese' },
];

export default function AiTranslate({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const locale = forcedLocale ?? useLocale().locale;
  const LANGUAGES = LANG_KEYS.map(l => ({ value: l.value, label: t(l.key, locale) }));
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState('angielski');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ translated: string; original: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError(t('error.onlypdf', locale)); return; }
    setFile(f); setError(''); setResult(null);
  };

  const handleTranslate = async () => {
    if (!file) { setError(t('error.select', locale)); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const text = await extractTextFromPDF(file);
      if (!text.trim()) throw new Error(t('page.translate.no_text', locale));
      const translated = await translateText(text, targetLang);
      setResult({ translated, original: text.slice(0, 500) });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : t('error.generic', locale)); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('translate')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.translate', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.translate.desc', locale)}</p>
      </div>

      <div onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('fileInput')?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
          ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
          ${file ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}>
        {file ? (
          <div>
            <div className="text-5xl mb-3">📄</div>
            <p className="font-medium tool-heading">{file.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{t('drag.change', locale)}</p>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-3">📂</div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">{t('drag.title', locale)}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('drag.subtitle', locale)}</p>
          </div>
        )}
        <input id="fileInput" type="file" accept=".pdf" className="hidden" onChange={e => handleFile(e.target.files?.[0] || null)} />
      </div>

      <div className="flex justify-center gap-2 mb-6">
        <CloudFilePicker onFilesPicked={(f) => handleFile(f[0] || null)} label={"☁️ " + t('cloud.add', locale)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="tool-card rounded-2xl border p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('page.translate.lang_label', locale)}</label>
          <select value={targetLang} onChange={e => setTargetLang(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-800 tool-heading">
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-6">
          <h3 className="font-bold text-purple-800 dark:text-purple-200 mb-1">{t('page.translate.ai_title', locale)}</h3>
          <p className="text-sm text-purple-700 dark:text-purple-300">{t('page.translate.ai_desc', locale)}</p>
        </div>
      </div>

      <div className="tool-info-box rounded-2xl p-5 mb-6">
        <h3 className="font-bold tool-heading mb-2">{t('section.how_it_works', locale)}</h3>
        <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
          <li>{t('page.translate.howto_1', locale)}</li>
          <li>{t('page.translate.howto_2', locale)}</li>
          <li>{t('page.translate.howto_3', locale)}</li>
        </ol>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}

      <button onClick={handleTranslate} disabled={loading || !file}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition mb-6
          ${loading || !file ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white shadow-lg'}`}>
        {loading ? <span>⏳ {t('page.translate.loading', locale)}</span> : <span>🌐 {t('page.translate.btn', locale)}</span>}
      </button>

      {result && (
        <div className="tool-card rounded-2xl border p-6">
          <h3 className="font-bold tool-heading mb-4">{t('page.translate.result_heading', locale)}</h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.translated}</div>
          <button onClick={() => navigator.clipboard.writeText(result.translated)}
            className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 transition">{t('page.translate.copy_btn', locale)}</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: '🤖', text: t('page.translate.feature_1', locale) },
          { icon: '🌍', text: t('feature.eleven_langs', locale) },
          { icon: '🔒', text: t('feature.no_upload_browser', locale) },
        ].map((item, i) => (
          <div key={i} className="tool-feature-card rounded-xl p-4 border">
            <div className="text-2xl mb-1">{item.icon}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.text}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">⚡ 15 darmowych zapytań AI dziennie</p>
    </div>
  );
}
