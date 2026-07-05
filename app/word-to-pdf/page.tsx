'use client';
import { useState, useRef } from 'react';
import CloudFileSaver from '@/components/CloudFileSaver';
import { officeToPdf } from '@/lib/client-pdf';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

const FORMATS = [
  { id: 'word', icon: '📝', label: 'Word', formats: 'DOC, DOCX', exts: ['.doc', '.docx'], mimes: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  { id: 'excel', icon: '📊', label: 'Excel', formats: 'XLS, XLSX', exts: ['.xls', '.xlsx'], mimes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] },
  { id: 'powerpoint', icon: '🎯', label: 'PowerPoint', formats: 'PPT, PPTX', exts: ['.ppt', '.pptx'], mimes: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'] },
  { id: 'openoffice', icon: '📄', label: 'OpenOffice', formats: 'ODT, ODS, ODP', exts: ['.odt', '.ods', '.odp'], mimes: [] },
];

export default function WordToPDF() {
  const { locale } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState('word');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const processedBlobRef = useRef<Blob | null>(null);

  const currentFormat = FORMATS.find(f => f.id === format) || FORMATS[0];
  const acceptedExtensions = currentFormat.exts;

  const handleFile = (f: File | null) => {
    if (!f) return;
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!acceptedExtensions.includes(ext)) {
      setError(`${t('page.wordtopdf.ext_error', locale)} ${currentFormat.label}: ${currentFormat.formats}`);
      return;
    }
    setFile(f);
    setError('');
    setSuccess(false);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['xls', 'xlsx'].includes(ext || '')) return '📊';
    if (['ppt', 'pptx'].includes(ext || '')) return '🎯';
    return '📄';
  };

  const handleConvert = async () => {
    if (!file) { setError(t('page.wordtopdf.select_file', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const blob = await officeToPdf(file);
      processedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.\w+$/, '') + '.pdf';
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
        <div className="text-6xl mb-4">{getToolIcon('wordtopdf')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.wordtopdf', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.wordtopdf.desc', locale)}</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {FORMATS.map((item) => (
          <button key={item.id} onClick={() => { setFormat(item.id); setFile(null); setError(''); setSuccess(false); }}
            className={`rounded-xl p-4 border-2 text-center transition cursor-pointer
              ${format === item.id ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'}`}>
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className="font-medium text-sm tool-heading">{item.label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{item.formats}</div>
          </button>
        ))}
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
            <div className="text-5xl mb-3">{getFileIcon(file.name)}</div>
            <p className="font-medium tool-heading">{file.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{t('drag.change', locale)}</p>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-3">📂</div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">{t('drag.title', locale)}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('page.wordtopdf.supported', locale)} {currentFormat.formats}</p>
          </div>
        )}
        <input id="fileInput" type="file" accept={acceptedExtensions.join(',')} className="hidden"
          onChange={e => handleFile(e.target.files?.[0] || null)} />
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">
          ✅ {t('result.success', locale)}
        </div>
      )}
      {success && file && processedBlobRef.current && (
        <div className="flex justify-center mb-6">
          <CloudFileSaver blob={processedBlobRef.current} fileName={file.name.replace(/\.\w+$/, '') + '.pdf'} />
        </div>
      )}

      <button onClick={handleConvert} disabled={loading || !file}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || !file ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? `⏳ ${t('page.wordtopdf.loading', locale)}` : `${t('page.wordtopdf.btn', locale)}`}
      </button>
    </div>
  );
}
