'use client';
import { useState, useRef } from 'react';
import { convertToPdfA, downloadPdf } from '@/lib/client-pdf';
import CloudFileSaver from '@/components/CloudFileSaver';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

export default function ToPdfA() {
  const { locale } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const processedBlobRef = useRef<Blob | null>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError(t('error.onlypdf', locale)); return; }
    setFile(f);
    setError('');
    setSuccess(false);
  };

  const handleConvert = async () => {
    if (!file) { setError(t('error.select', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await convertToPdfA(file);
      const blob = await downloadPdf(result, file.name.replace('.pdf', '_pdfa.pdf'));
      processedBlobRef.current = blob;
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
        <div className="text-6xl mb-4">{getToolIcon('pdfa')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.pdfa', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.pdfa.desc', locale)}</p>
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('fileInput')?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
          ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
          ${file ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}>
        {file ? (
          <div>
            <div className="text-4xl mb-2">📄</div>
            <p className="font-medium tool-heading text-sm">{file.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('drag.change', locale)}</p>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-3">📂</div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">{t('drag.title', locale)}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('drag.subtitle', locale)}</p>
          </div>
        )}
        <input id="fileInput" type="file" accept=".pdf" className="hidden"
          onChange={e => handleFile(e.target.files?.[0] || null)} />
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">{t('page.pdfa.success', locale)}</div>}
      {success && file && processedBlobRef.current && (
        <div className="flex justify-center mb-6">
          <CloudFileSaver blob={processedBlobRef.current} fileName={file.name.replace('.pdf', '_pdfa.pdf')} />
        </div>
      )}

      <button onClick={handleConvert} disabled={loading || !file}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition mb-6
          ${loading || !file ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? `⏳ ${t('btn.loading', locale)}` : `📦 ${t('page.pdfa.btn', locale)}`}
      </button>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-5 mb-6">
        <h3 className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">{t('section.warning', locale)}</h3>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          {t('page.pdfa.warning_info', locale)}
        </p>
      </div>

      <div className="tool-card rounded-2xl border p-6 mb-6">
        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">{t('section.what_pdfa_does', locale)}</h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>{t('page.pdfa.action1', locale)}</li>
          <li>{t('page.pdfa.action2', locale)}</li>
          <li>{t('page.pdfa.action3', locale)}</li>
          <li>{t('page.pdfa.action4', locale)}</li>
          <li>{t('page.pdfa.action5', locale)}</li>
          <li>{t('page.pdfa.action6', locale)}</li>
          <li>{t('page.pdfa.action7', locale)}</li>
          <li>{t('page.pdfa.action8', locale)}</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: '🔒', text: t('feature.local_short', locale) },
          { icon: '📦', text: t('feature.ready_archive', locale) },
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
