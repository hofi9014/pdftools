'use client';
import { useState, useRef } from 'react';
import { reorderPages, downloadPdf } from '@/lib/client-pdf';
import PagePreview from '@/components/PagePreview';
import CloudFileSaver from '@/components/CloudFileSaver';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

export default function ReorderPages() {
  const { locale } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [currentOrder, setCurrentOrder] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const processedBlobRef = useRef<Blob | null>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError(t('error.onlypdf', locale)); return; }
    setFile(f);
    setCurrentOrder([]);
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (!file) { setError(t('error.select', locale)); return; }
    if (currentOrder.length === 0) { setError(t('page.reorder.noselect', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await reorderPages(file, currentOrder);
      const blob = await downloadPdf(result, 'przestawione.pdf');
      processedBlobRef.current = blob;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.generic', locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('reorder')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.reorder', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.reorder.desc', locale)}</p>
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
        <input id="fileInput" type="file" accept=".pdf" className="hidden"
          onChange={e => handleFile(e.target.files?.[0] || null)} />
      </div>

      {file && (
        <PagePreview
          file={file}
          mode="reorder"
          selectedPages={[]}
          onSelectionChange={() => {}}
          onNewOrder={setCurrentOrder}
        />
      )}

      <div className="tool-info-box rounded-2xl p-5 mb-6">
        <h3 className="font-bold tool-heading mb-2">{t('local.title', locale)}</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">{t('local.desc', locale)}</p>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">✅ {t('result.success', locale)}</div>}
      {success && processedBlobRef.current && (
        <div className="flex justify-center mb-6">
          <CloudFileSaver blob={processedBlobRef.current} fileName="przestawione.pdf" />
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading || !file || currentOrder.length === 0}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || !file || currentOrder.length === 0 ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? `⏳ ${t('page.reorder.loading', locale)}` : `${t('page.reorder.btn', locale)}`}
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: '🔒', text: t('local.badge', locale) },
          { icon: '⚡', text: t('local.nolimits', locale) },
          { icon: '🆓', text: t('local.free', locale) },
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
