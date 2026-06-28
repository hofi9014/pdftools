'use client';
import { useState } from 'react';
import { imagesToPdf } from '@/lib/client-pdf';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

export default function JPGToPDF() {
  const { locale } = useLocale();
  const [files, setFiles] = useState<File[]>([]);
  const [margin, setMargin] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp'];

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const images = Array.from(newFiles).filter(f => acceptedTypes.includes(f.type));
    if (images.length !== newFiles.length) {
      setError(t('page.jpgTopdf.not_images', locale));
    } else {
      setError('');
    }
    setFiles(prev => [...prev, ...images]);
    setSuccess(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const moveFile = (from: number, to: number) => {
    setFiles(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  };

  const handleConvert = async () => {
    if (files.length === 0) { setError(t('page.jpgTopdf.no_images', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const blob = await imagesToPdf(files, parseInt(margin));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'obrazy.pdf';
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
    <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">{getToolIcon('jpgTopdf')}</div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.jpgTopdf', locale)}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.jpgTopdf.desc', locale)}</p>
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
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">JPG, PNG, GIF, BMP, TIFF, WebP</p>
          <input id="fileInput" type="file"
            accept=".jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
            multiple className="hidden"
            onChange={e => handleFiles(e.target.files)} />
        </div>

        {files.length > 0 && (
          <div className="tool-card rounded-2xl shadow-sm border mb-6">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <p className="font-medium text-gray-700 dark:text-gray-300">{files.length} {t('files.count', locale)}</p>
            </div>
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-600 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 dark:text-gray-500 font-mono text-sm w-6">{i + 1}.</span>
                  <span className="text-2xl">🖼️</span>
                  <div>
                    <p className="text-sm font-medium tool-heading">{file.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {i > 0 && (
                    <button onClick={() => moveFile(i, i - 1)}
                      className="text-gray-400 dark:text-gray-500 hover:!text-[var(--coffee-accent)] px-2 py-1 rounded">↑</button>
                  )}
                  {i < files.length - 1 && (
                    <button onClick={() => moveFile(i, i + 1)}
                      className="text-gray-400 dark:text-gray-500 hover:!text-[var(--coffee-accent)] px-2 py-1 rounded">↓</button>
                  )}
                  <button onClick={() => removeFile(i)}
                    className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="tool-card rounded-2xl border p-6 mb-6">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3">{t('page.jpgTopdf.margin', locale)}</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '0', label: t('page.jpgTopdf.margin_none', locale) },
              { value: '10', label: t('page.jpgTopdf.margin_small', locale) },
              { value: '20', label: t('page.jpgTopdf.margin_large', locale) },
            ].map(opt => (
              <button key={opt.value} onClick={() => setMargin(opt.value)}
                className={`p-3 rounded-xl border-2 text-center transition
                  ${margin === opt.value ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
                <div className="text-sm font-medium tool-heading">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
        {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">            ✅ {t('page.jpgTopdf.success', locale)}</div>}

        <button onClick={handleConvert} disabled={loading || files.length === 0}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition
            ${loading || files.length === 0 ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
          {loading ? <span>⏳ {t('btn.loading', locale)}</span> : <span>🖼️ {t('page.jpgTopdf.btn', locale)}</span>}
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
          {[
            { icon: '🔒', text: t('feature.files_deleted', locale) },
            { icon: '⚡', text: t('feature.fast_cloud', locale) },
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