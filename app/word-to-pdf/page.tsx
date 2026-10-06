'use client';
import { useState, useRef } from 'react';
import CloudFileSaver from '@/components/CloudFileSaver';
import CloudFilePicker from '@/components/CloudFilePicker';
import { officeToPdf } from '@/lib/client-pdf';
import { docxToIR, renderIRToPdf, hasUnsupportedScriptInPages } from '@/lib/client-pdf-docx';
import { positionedDocxToPdf, positionedOdtToPdf } from '@/lib/pdf/fixedLayoutToPdf';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

// FINDING (2026-09-21) — .doc/.xls/.ppt are the legacy OLE Compound File Binary Format, not a
// ZIP archive at all (unlike their modern .docx/.xlsx/.pptx successors), so officeToPdf's
// JSZip-based extraction can never open them — every upload of these three extensions was
// guaranteed to fail with "Format nie jest obsługiwany", despite this list (and the file
// picker's accept attribute built from it) explicitly advertising and accepting them. Real
// support would need a dedicated OLE/legacy-binary-format parser, well out of scope here;
// removed from the advertised formats instead of leaving a button that always fails — the same
// "don't claim what isn't real" choice already applied elsewhere in this codebase (see
// AGENTS.md's PDF-UA/MarkInfo findings). .ods/.odp, by contrast, ARE ordinary ZIP-based
// OpenDocument XML (verified against hand-built fixtures) and are now genuinely supported by
// officeToPdf, so they stay.
const FORMATS = [
  { id: 'word', icon: '📝', label: 'Word', formats: 'DOCX', exts: ['.docx'], mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  { id: 'excel', icon: '📊', label: 'Excel', formats: 'XLSX', exts: ['.xlsx'], mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] },
  { id: 'powerpoint', icon: '🎯', label: 'PowerPoint', formats: 'PPTX', exts: ['.pptx'], mimes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'] },
  { id: 'openoffice', icon: '📄', label: 'OpenOffice', formats: 'ODT, ODS, ODP', exts: ['.odt', '.ods', '.odp'], mimes: [] },
];

export default function WordToPDF({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const locale = forcedLocale ?? useLocale().locale;
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState('word');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const processedBlobRef = useRef<Blob | null>(null);

  // Safe: FORMATS is a non-empty literal array, so FORMATS[0] always exists as the fallback.
  const currentFormat = FORMATS.find(f => f.id === format) || FORMATS[0]!;
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
    setFallbackUsed(false);
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
    setFallbackUsed(false);

    try {
      const ext = file.name.toLowerCase().split('.').pop() || '';
      let blob: Blob;
      let fallbackUsed = false;
      if (ext === 'docx') {
        try {
          // A document laid out by position (what PDF -> Word writes in its faithful layout) is
          // drawn where it says; every other document (null) is converted the ordinary way.
          const positioned = await positionedDocxToPdf(file);
          if (positioned) {
            blob = positioned;
          } else {
            const { pages, images } = await docxToIR(file);
            if (hasUnsupportedScriptInPages(pages)) {
              console.warn('Unsupported script detected, falling back to legacy officeToPdf');
              blob = await officeToPdf(file);
              fallbackUsed = true;
            } else {
              blob = await renderIRToPdf(pages, images);
            }
          }
        } catch (irErr) {
          console.error('docxToIR/renderIRToPdf failed, falling back:', irErr);
          blob = await officeToPdf(file);
          fallbackUsed = true;
        }
      } else if (ext === 'odt') {
        // The same for OpenDocument text; failing that, this tab's plain conversion as before.
        const positioned = await positionedOdtToPdf(file).catch(() => null);
        blob = positioned ?? await officeToPdf(file);
      } else {
        blob = await officeToPdf(file);
      }
      processedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.\w+$/, '') + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
      setFallbackUsed(fallbackUsed);
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
          <button key={item.id} onClick={() => { setFormat(item.id); setFile(null); setError(''); setSuccess(false); setFallbackUsed(false); }}
            className={`rounded-xl p-4 border-2 text-center transition cursor-pointer
              ${format === item.id ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'}`}>
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className="font-medium text-sm tool-heading">{item.label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{item.formats}</div>
          </button>
        ))}
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0] ?? null); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('fileInput')?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('fileInput')?.click(); } }}
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

      <div className="flex justify-center gap-2 mb-6">
        <CloudFilePicker onFilesPicked={(f) => handleFile(f[0] || null)} accept={acceptedExtensions.join(',')} label={"☁️ " + t('cloud.add', locale)} />
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
      {fallbackUsed && !error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 rounded-xl p-4 mb-6">
          ⚠️ {t('page.word.fallback', locale)}
        </div>
      )}
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
