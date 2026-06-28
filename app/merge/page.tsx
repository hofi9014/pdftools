'use client';
import { useState, useCallback } from 'react';
import { mergePDFs, downloadPdf } from '@/lib/client-pdf';
import CloudFilePicker from '@/components/CloudFilePicker';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

export default function MergePDF() {
  const { locale } = useLocale();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    const pdfs = arr.filter(f => f.type === 'application/pdf');
    if (pdfs.length !== arr.length) {
      setError(t('page.merge.not_pdf', locale));
    } else {
      setError('');
    }
    setFiles(prev => [...prev, ...pdfs]);
    setSuccess(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setSuccess(false);
  };

  const moveFile = (from: number, to: number) => {
    setFiles(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) { setError(t('page.merge.min_two', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await mergePDFs(files);
      await downloadPdf(result, 'polaczony.pdf');
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
          <div className="text-6xl mb-4">{getToolIcon('merge')}</div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.merge', locale)}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.merge.desc', locale)}</p>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById('fileInput')?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
            ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
        >
          <div className="text-5xl mb-3">📂</div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">{t('drag.title', locale)}</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('drag.multiple', locale)}</p>
          <input id="fileInput" type="file" accept=".pdf" multiple className="hidden"
            onChange={e => handleFiles(e.target.files)} />
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <CloudFilePicker onFilesPicked={handleFiles} label={"☁️ " + t('cloud.add', locale)} />
        </div>

        {files.length > 0 && (
          <div className="tool-card rounded-2xl shadow-sm border mb-6">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <p className="font-medium text-gray-700 dark:text-gray-300">{files.length} {t('files.count', locale)}</p>
            </div>
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-gray-400 dark:text-gray-500 font-mono text-sm w-6 shrink-0">{i + 1}.</span>
                  <span className="text-2xl shrink-0">📄</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium tool-heading truncate">{file.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {i > 0 && <button onClick={() => moveFile(i, i - 1)} className="text-gray-400 dark:text-gray-500 hover:!text-[var(--coffee-accent)] px-2 py-1 rounded">↑</button>}
                  {i < files.length - 1 && <button onClick={() => moveFile(i, i + 1)} className="text-gray-400 dark:text-gray-500 hover:!text-[var(--coffee-accent)] px-2 py-1 rounded">↓</button>}
                  <button onClick={() => removeFile(i)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="tool-info-box rounded-2xl p-5 mb-6">
          <h3 className="font-bold tool-heading mb-2">{t('local.title', locale)}</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">{t('local.desc', locale)}</p>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
        {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">✅ {t('result.success', locale)}</div>}

        <button onClick={handleMerge} disabled={loading || files.length < 2}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition
            ${loading || files.length < 2 ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'}`}>
          {loading ? `⏳ ${t('page.merge.loading', locale)}` : `🔗 ${t('page.merge.button', locale)} ${files.length} ${t('files.count', locale)} PDF`}
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
