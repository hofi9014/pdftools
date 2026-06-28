'use client';
import { useState } from 'react';
import { extractImagesFromPdf } from '@/lib/client-pdf';
import JSZip from 'jszip';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

export default function PdfToImages() {
  const { locale } = useLocale();
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('jpeg');
  const [scale, setScale] = useState('2');
  const [quality, setQuality] = useState('80');
  const [images, setImages] = useState<{ fileIdx: number; page: number; blob: Blob; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    const pdfs = arr.filter(f => f.type === 'application/pdf');
    if (pdfs.length !== arr.length) setError(t('page.jpg.skipped_nonpdf', locale));
    else setError('');
    setFiles(prev => [...prev, ...pdfs]);
    setImages([]);
    setSuccess(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setImages([]);
    setSuccess(false);
  };

  const handleConvert = async () => {
    if (files.length === 0) { setError(t('page.jpg.no_files', locale)); return; }
    setLoading(true);
    setError('');
    setImages([]);
    setSuccess(false);
    setProgress(0);

    try {
      const q = parseInt(quality, 10);
      const s = parseFloat(scale) || 2;
      const allResults: { fileIdx: number; page: number; blob: Blob; url: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const qualityVal = format === 'jpeg' || format === 'webp' ? (isNaN(q) ? 0.9 : q / 100) : undefined;
        const results = await extractImagesFromPdf(file, { format, scale: s, quality: qualityVal });
        results.forEach(r => allResults.push({ fileIdx: i, ...r }));
        setProgress(i + 1);
      }

      if (allResults.length === 0) throw new Error(t('page.jpg.no_results', locale));
      setImages(allResults);

      const zip = new JSZip();
      allResults.forEach(img => {
        const baseName = files[img.fileIdx].name.replace(/\.pdf$/i, '');
        zip.file(`${baseName}_strona${img.page}.${format}`, img.blob);
      });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = files.length === 1 ? files[0].name.replace('.pdf', '_obrazy.zip') : 'obrazy.zip';
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
        <div className="text-6xl mb-4">{getToolIcon('images')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.images', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.images.desc', locale)}</p>
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

      {files.length > 0 && (
        <div className="tool-card rounded-2xl shadow-sm border mb-6">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <p className="font-medium text-gray-700 dark:text-gray-300">{`${files.length} ${t('files.count', locale)}`}</p>
            <button onClick={() => { setFiles([]); setImages([]); setSuccess(false); }} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400">{t('btn.clear', locale)}</button>
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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('page.images.format_label', locale)}</label>
          <select value={format} onChange={e => setFormat(e.target.value as any)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 tool-heading">
            <option value="png">{t('page.images.png_label', locale)}</option>
            <option value="jpeg">{t('page.images.jpeg_label', locale)}</option>
            <option value="webp">{t('page.images.webp_label', locale)}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('page.images.scale_label', locale)}</label>
          <input type="number" min="0.5" max="4" step="0.25" value={scale} onChange={e => setScale(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 tool-heading" />
        </div>
        {(format === 'jpeg' || format === 'webp') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('page.images.quality_label', locale)} <span className="text-blue-600 dark:text-blue-400 font-bold">{quality}%</span></label>
            <input type="range" min="10" max="100" step="10"
              value={quality} onChange={e => setQuality(e.target.value)}
              className="w-full accent-blue-600 dark:accent-blue-400" />
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">✅ {t('result.zip', locale)}</div>}

      <button onClick={handleConvert} disabled={loading || files.length === 0}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition mb-6
          ${loading || files.length === 0 ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? `⏳ ${t('page.images.btn_loading', locale)} ${progress}/${files.length}` : `🖼️ ${t('page.images.btn_ready', locale)} (${files.length})`}
      </button>

      {images.length > 0 && (
        <div className="tool-card rounded-2xl border p-4 mb-6">
          <p className="font-bold tool-heading mb-4">{t('page.images.extracted_label', locale)} ({images.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                <img src={img.url} alt={`${t('page.images.page_label', locale)} ${img.page}`} className="w-full h-auto" />
                <div className="p-2 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{files[img.fileIdx].name.replace(/\.pdf$/i, '')} — {t('page.images.page_label', locale)} {img.page}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: '🔒', text: t('feature.files_deleted', locale) },
          { icon: '🎨', text: t('feature.png_jpeg_webp', locale) },
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
