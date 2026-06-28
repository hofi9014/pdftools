'use client';
import { useState } from 'react';
import JSZip from 'jszip';
import { pdfToExcel } from '@/lib/client-pdf';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

export default function PdfToExcel() {
  const { locale } = useLocale();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    const pdfs = arr.filter(f => f.type === 'application/pdf');
    if (pdfs.length !== arr.length) setError(t('page.excel.not_pdf', locale));
    else setError('');
    setFiles(prev => [...prev, ...pdfs]);
    setSuccess(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (files.length === 0) { setError(t('page.excel.no_files', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);
    setProgress(0);

    const batchResults: { name: string; data: Blob }[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const blob = await pdfToExcel(file);
        batchResults.push({ name: file.name.replace(/\.pdf$/i, '.xlsx'), data: blob });
        setProgress(i + 1);
      }

      if (batchResults.length === 1) {
        const r = batchResults[0];
        const url = URL.createObjectURL(r.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = r.name;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const zip = new JSZip();
        batchResults.forEach(r => zip.file(r.name, r.data));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'excels.zip';
        a.click();
        URL.revokeObjectURL(url);
      }

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
        <div className="text-6xl mb-4">{getToolIcon('excel')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.excel', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.excel.desc', locale)}</p>
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('fileInput')?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
          ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
      >
        <div className="text-5xl mb-3">📂</div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">{t('drag.title', locale)}</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('drag.subtitle', locale)}</p>
        <input id="fileInput" type="file" accept=".pdf" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div className="tool-card rounded-2xl shadow-sm border mb-6">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <p className="font-medium text-gray-700 dark:text-gray-300">{files.length} {t('files.count', locale)}</p>
            <button onClick={() => { setFiles([]); setSuccess(false); }} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400">{t('btn.clear', locale)}</button>
          </div>
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl flex-shrink-0">📄</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium tool-heading truncate">{file.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button onClick={() => removeFile(i)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 px-2 flex-shrink-0">✕</button>
            </div>
          ))}
          {loading && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${(progress / files.length) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{progress}/{files.length}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 mb-6">
        <h2 className="font-bold tool-heading mb-2">{t('section.how_it_works', locale)}</h2>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc pl-5">
          <li>{t('page.excel.howto_1', locale)}</li>
          <li>{t('page.excel.howto_2', locale)}</li>
          <li>{t('page.excel.howto_3', locale)}</li>
          <li>{t('page.excel.howto_4', locale)}</li>
        </ul>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">
          ✅ {t('result.success', locale)} {files.length > 1 ? t('page.excel.success_zip', locale) : t('page.excel.success_single', locale)}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading || files.length === 0}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || files.length === 0 ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? <span>⏳ {t('btn.loading', locale)} {progress}/{files.length}</span> : <span>📊 {t('page.excel.btn', locale)}</span>}
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
            { icon: '🔒', text: t('feature.files_deleted', locale) },
            { icon: '📦', text: t('feature.zip_output', locale) },
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