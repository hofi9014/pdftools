'use client';
import { useState, useRef } from 'react';
import { rotatePDF, downloadPdf } from '@/lib/client-pdf';
import CloudFilePicker from '@/components/CloudFilePicker';
import CloudFileSaver from '@/components/CloudFileSaver';
import JSZip from 'jszip';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

export default function RotatePDF({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const locale = forcedLocale ?? useLocale().locale;
  const [files, setFiles] = useState<File[]>([]);
  const [rotation, setRotation] = useState<'90' | '180' | '270'>('90');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const processedBlobRef = useRef<Blob | null>(null);
  const downloadFileNameRef = useRef('');

  const handleFiles = (newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    const pdfs = arr.filter(f => f.type === 'application/pdf');
    if (pdfs.length !== arr.length) setError(t('page.rotate.not_pdf', locale));
    else setError('');
    setFiles(prev => [...prev, ...pdfs]);
    setSuccess(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setSuccess(false);
  };

  const handleRotate = async () => {
    if (files.length === 0) { setError(t('page.rotate.add_files', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const angle = Number(rotation) as 90 | 180 | 270;
      const results: { data: Uint8Array; name: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        const data = await rotatePDF(files[i], angle);
        results.push({ data, name: files[i].name.replace('.pdf', '_obrócony.pdf') });
      }

      if (results.length === 1) {
        const blob = await downloadPdf(results[0].data, results[0].name);
        processedBlobRef.current = blob;
        downloadFileNameRef.current = results[0].name;
      } else {
        const zip = new JSZip();
        results.forEach(r => zip.file(r.name, r.data));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        processedBlobRef.current = zipBlob;
        downloadFileNameRef.current = 'obrócone.zip';
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'obrócone.zip';
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
          <div className="text-6xl mb-4">{getToolIcon('rotate')}</div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.rotate', locale)}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.rotate.desc', locale)}</p>
        </div>

        <div
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById('fileInput')?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
            ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
            ${files.length > 0 ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}
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
          <div className="tool-card rounded-2xl border mb-6">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <p className="font-medium text-gray-700 dark:text-gray-300">{files.length} {t('files.count', locale)}</p>
              <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400">{t('btn.clear', locale)}</button>
            </div>
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">📄</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium tool-heading truncate">{file.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button onClick={() => removeFile(i)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 px-2">✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="tool-card rounded-2xl border p-6 mb-6">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">{t('page.rotate.angle_title', locale)}</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '90', label: t('page.rotate.right', locale), icon: '↪️' },
              { value: '180', label: '180°', icon: '🔃' },
              { value: '270', label: t('page.rotate.left', locale), icon: '↩️' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setRotation(opt.value as '90' | '180' | '270')}
                className={`p-4 rounded-xl border-2 text-center transition
                  ${rotation === opt.value ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
                <div className="text-3xl mb-2">{opt.icon}</div>
                <div className="text-sm font-medium tool-heading">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
        {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">✅ {t('result.success', locale)}</div>}
        {success && processedBlobRef.current && (
          <div className="flex justify-center mb-6">
            <CloudFileSaver blob={processedBlobRef.current} fileName={downloadFileNameRef.current} />
          </div>
        )}

        <button onClick={handleRotate} disabled={loading || files.length === 0}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition
            ${loading || files.length === 0 ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
          {loading ? `⏳ ${t('page.rotate.loading', locale)}` : `🔄 ${t('page.rotate.button', locale)}`}
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
          {[
            { icon: '🔒', text: t('local.badge', locale) },
            { icon: '📦', text: t('feature.batch_process', locale) },
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
