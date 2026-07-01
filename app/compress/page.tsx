'use client';
import { useState } from 'react';
import JSZip from 'jszip';
import { compressPDFClient } from '@/lib/client-pdf';
import CloudFilePicker from '@/components/CloudFilePicker';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import { RecommendedSize } from '@/components/UploadInfo';

export default function CompressPDF() {
  const { locale } = useLocale();
  const [files, setFiles] = useState<File[]>([]);
  const [level, setLevel] = useState('recommended');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [results, setResults] = useState<{ name: string; originalSize: number; compressedSize: number }[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const formatSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const handleFiles = (newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    const pdfs = arr.filter(f => f.type === 'application/pdf');
    if (pdfs.length !== arr.length) setError(t('page.compress.not_pdf', locale));
    else setError('');
    setFiles(prev => [...prev, ...pdfs]);
    setResults([]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setResults([]);
  };

  const totalSavings = results.length > 0
    ? Math.round((1 - results.reduce((s, r) => s + r.compressedSize, 0) / results.reduce((s, r) => s + r.originalSize, 0)) * 100)
    : 0;

  const handleCompressAll = async () => {
    if (files.length === 0) { setError(t('page.compress.add_files', locale)); return; }
    setLoading(true);
    setError('');
    setResults([]);
    setProgress(0);

    const batchResults: { name: string; originalSize: number; compressedSize: number; data: Blob }[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await compressPDFClient(file, level as 'low' | 'recommended' | 'extreme');
        const blob = new Blob([result as BlobPart], { type: 'application/pdf' });
        batchResults.push({ name: file.name.replace('.pdf', '_skompresowany.pdf'), originalSize: file.size, compressedSize: blob.size, data: blob });
        setProgress(i + 1);
      }

      setResults(batchResults.map(r => ({ name: r.name, originalSize: r.originalSize, compressedSize: r.compressedSize })));

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
        a.download = 'skompresowane.zip';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.generic', locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('compress')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.compress', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.compress.desc', locale)}</p>
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
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('drag.multiple', locale)}</p>
        <input id="fileInput" type="file" accept=".pdf" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>

      <RecommendedSize locale={locale} />
      <div className="flex justify-center gap-2 mb-6">
        <CloudFilePicker onFilesPicked={handleFiles} label={"☁️ " + t('cloud.add', locale)} />
      </div>

      {files.length > 0 && (
        <div className="tool-card rounded-2xl shadow-sm border mb-6">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <p className="font-medium text-gray-700 dark:text-gray-300">{files.length} {t('files.count', locale)}</p>
            <button onClick={() => { setFiles([]); setResults([]); }} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400">{t('btn.clear', locale)}</button>
          </div>
          {files.map((file, i) => {
            const fileResult = results.find(r => r.name.startsWith(file.name.replace('.pdf', '')));
            return (
              <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">📄</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium tool-heading truncate">{file.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  {fileResult && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">-{Math.round((1 - fileResult.compressedSize / fileResult.originalSize) * 100)}%</span>
                  )}
                  <button onClick={() => removeFile(i)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 px-2">✕</button>
                </div>
              </div>
            );
          })}
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

      {results.length > 1 && (
        <div className="tool-success-box rounded-2xl p-5 mb-6 text-center">
          <p className="font-bold text-green-700 dark:text-green-400">✅ {t('page.compress.all_done', locale)}</p>
          <p className="text-sm text-green-600 dark:text-green-300 mt-1">{t('page.compress.savings', locale)} -{totalSavings}%</p>
        </div>
      )}

      <div className="tool-card rounded-2xl border p-6 mb-6">
        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">{t('page.compress.level_title', locale)}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: 'recommended', label: t('page.compress.level_recommended', locale), desc: t('page.compress.level_recommended_desc', locale), icon: '⭐' },
            { value: 'low', label: t('page.compress.level_low', locale), desc: t('page.compress.level_low_desc', locale), icon: '📄' },
            { value: 'extreme', label: t('page.compress.level_extreme', locale), desc: t('page.compress.level_extreme_desc', locale), icon: '🔥' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setLevel(opt.value)}
              className={`p-4 rounded-xl border-2 text-center transition
                ${level === opt.value ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
              <div className="text-xl mb-1">{opt.icon}</div>
              <div className="font-medium text-sm tool-heading">{opt.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}

      <button onClick={handleCompressAll} disabled={loading || files.length === 0}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || files.length === 0 ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? `⏳ ${t('page.compress.loading', locale)} ${progress}/${files.length}` : `🗜️ ${t('page.compress.button', locale)}`}
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