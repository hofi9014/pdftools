'use client';
import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import CloudFileSaver from '@/components/CloudFileSaver';
import CloudFilePicker from '@/components/CloudFilePicker';

const LANGUAGES = [
  { value: 'pol', labelKey: 'page.ocr.lang_polish' },
  { value: 'eng', labelKey: 'page.ocr.lang_english' },
  { value: 'deu', labelKey: 'page.ocr.lang_german' },
  { value: 'fra', labelKey: 'page.ocr.lang_french' },
  { value: 'spa', labelKey: 'page.ocr.lang_spanish' },
  { value: 'ita', labelKey: 'page.ocr.lang_italian' },
  { value: 'rus', labelKey: 'page.ocr.lang_russian' },
  { value: 'ara', labelKey: 'page.ocr.lang_arabic' },
  { value: 'bul', labelKey: 'page.ocr.lang_bulgarian' },
  { value: 'chi_sim', labelKey: 'page.ocr.lang_chinese_simplified' },
  { value: 'chi_tra', labelKey: 'page.ocr.lang_chinese_traditional' },
  { value: 'hrv', labelKey: 'page.ocr.lang_croatian' },
  { value: 'ces', labelKey: 'page.ocr.lang_czech' },
  { value: 'dan', labelKey: 'page.ocr.lang_danish' },
  { value: 'nld', labelKey: 'page.ocr.lang_dutch' },
  { value: 'fin', labelKey: 'page.ocr.lang_finnish' },
  { value: 'ell', labelKey: 'page.ocr.lang_greek' },
  { value: 'hin', labelKey: 'page.ocr.lang_hindi' },
  { value: 'hun', labelKey: 'page.ocr.lang_hungarian' },
  { value: 'ind', labelKey: 'page.ocr.lang_indonesian' },
  { value: 'jpn', labelKey: 'page.ocr.lang_japanese' },
  { value: 'kor', labelKey: 'page.ocr.lang_korean' },
  { value: 'lit', labelKey: 'page.ocr.lang_lithuanian' },
  { value: 'lav', labelKey: 'page.ocr.lang_latvian' },
  { value: 'nor', labelKey: 'page.ocr.lang_norwegian' },
  { value: 'por', labelKey: 'page.ocr.lang_portuguese' },
  { value: 'ron', labelKey: 'page.ocr.lang_romanian' },
  { value: 'srp', labelKey: 'page.ocr.lang_serbian' },
  { value: 'slk', labelKey: 'page.ocr.lang_slovak' },
  { value: 'slv', labelKey: 'page.ocr.lang_slovenian' },
  { value: 'swe', labelKey: 'page.ocr.lang_swedish' },
  { value: 'tur', labelKey: 'page.ocr.lang_turkish' },
  { value: 'ukr', labelKey: 'page.ocr.lang_ukrainian' },
];

async function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OCRPDF() {
  const { locale } = useLocale();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const processedBlobRef = useRef<Blob | null>(null);
  const downloadFileNameRef = useRef('');
  const [language, setLanguage] = useState('pol');
  const [recognizedText, setRecognizedText] = useState('');
  const [ocrDone, setOcrDone] = useState(false);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);

  const handleFiles = (newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    const pdfs = arr.filter(f => f.type === 'application/pdf');
    if (pdfs.length !== arr.length) setError(t('page.ocr.not_pdf', locale));
    else setError('');
    setFiles(prev => [...prev, ...pdfs]);
    setSuccess(false);
    setOcrDone(false);
    setRecognizedText('');
    setPdfData(null);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setSuccess(false);
    setOcrDone(false);
    setRecognizedText('');
    setPdfData(null);
  };

  const handleOCR = async () => {
    if (files.length === 0) { setError(t('page.ocr.add_files', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);
    setProgress(0);
    setOcrDone(false);
    setRecognizedText('');
    setPdfData(null);

    try {
      const { ocrPdfClient } = await import('@/lib/client-ocr');
      const allText: string[] = [];
      let totalPages = 0;
      let completedPages = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgressLabel(`Strona ${completedPages + 1}...`);
        const result = await ocrPdfClient(file, language, (page, total) => {
          totalPages = total;
          completedPages = completedPages - (completedPages % Math.max(1, totalPages)) + page - 1;
          setProgress(completedPages + page);
          setProgressLabel(`Strona ${page}/${total}`);
        });
        completedPages += totalPages;
        allText.push(result.text);
        if (i === 0) setPdfData(result.pdfData);
        setProgress(completedPages);
      }

      const combinedText = allText.join('\n\n');
      setRecognizedText(combinedText);
      setOcrDone(true);
      setSuccess(true);
    } catch (err: unknown) {
      console.error('[OCR] Błąd w UI:', err);
      setError(err instanceof Error ? err.message : t('error.generic', locale));
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!pdfData) return;
    const blob = new Blob([pdfData as BlobPart], { type: 'application/pdf' });
    processedBlobRef.current = blob;
    downloadFileNameRef.current = files.length === 1 ? files[0].name.replace('.pdf', '_ocr.pdf') : 'ocr-wyniki.pdf';
    await downloadBlob(blob, downloadFileNameRef.current);
  };

  const downloadTXT = () => {
    if (!recognizedText) return;
    const blob = new Blob([recognizedText], { type: 'text/plain;charset=utf-8' });
    processedBlobRef.current = blob;
    downloadFileNameRef.current = files.length === 1 ? files[0].name.replace('.pdf', '_ocr.txt') : 'ocr-wyniki.txt';
    downloadBlob(blob, downloadFileNameRef.current);
  };

  const downloadDOCX = async () => {
    if (!recognizedText) return;
    const { Document, Packer, Paragraph, TextRun } = await import('docx');
    const doc = new Document({
      sections: [{
        children: recognizedText.split('\n').map(line =>
          new Paragraph({ children: [new TextRun(line || ' ')] })
        ),
      }],
    });
    const blob = await Packer.toBlob(doc);
    processedBlobRef.current = blob;
    downloadFileNameRef.current = files.length === 1 ? files[0].name.replace('.pdf', '_ocr.docx') : 'ocr-wyniki.docx';
    downloadBlob(blob, downloadFileNameRef.current);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('ocr')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.ocr', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.ocr.desc', locale)}</p>
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

      <div className="flex justify-center gap-2 mb-6">
        <CloudFilePicker onFilesPicked={handleFiles} label={"☁️ " + t('cloud.add', locale)} />
      </div>

      {files.length > 0 && (
        <div className="tool-card rounded-2xl shadow-sm border mb-6">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <p className="font-medium text-gray-700 dark:text-gray-300">{files.length} {t('files.count', locale)}</p>
            <button onClick={() => { setFiles([]); setSuccess(false); setOcrDone(false); setRecognizedText(''); setPdfData(null); }} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400">{t('btn.clear', locale)}</button>
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
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{progressLabel || `${progress}/${files.length}`}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="tool-card rounded-2xl border p-6 mb-6">
        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">{t('page.ocr.language_label', locale)}</h3>
        <select id="ocr-language" name="ocr-language" value={language} onChange={e => setLanguage(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 dark:border-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-800 tool-heading">
          {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>{t(lang.labelKey, locale)}</option>
          ))}
        </select>
      </div>

      <div className="tool-success-box rounded-2xl p-5 mb-6">
        <h3 className="font-bold text-green-800 dark:text-green-200 mb-2">{t('local.title', locale)}</h3>
        <p className="text-sm text-green-700 dark:text-green-300">{t('page.ocr.local_desc', locale)}</p>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}

      {!loading && !ocrDone && (
        <button onClick={handleOCR} disabled={loading || files.length === 0}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition mb-6
            ${loading || files.length === 0 ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
          {loading ? `⏳ ${t('page.ocr.loading', locale)} ${progressLabel || `${progress}/${files.length}`}` : `🔍 ${t('page.ocr.button', locale)}`}
        </button>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">
          ✅ {files.length > 1 ? t('page.ocr.success_zip', locale) : t('page.ocr.success_single', locale)}
        </div>
      )}
      {success && processedBlobRef.current && (
        <div className="flex justify-center mb-6">
          <CloudFileSaver blob={processedBlobRef.current} fileName={downloadFileNameRef.current} />
        </div>
      )}

      {ocrDone && recognizedText && (
        <div className="tool-card rounded-2xl border p-6 mb-6">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3">{t('page.ocr.preview_label', locale)}</h3>
          <textarea id="ocr-result" readOnly value={recognizedText}
            className="w-full h-64 border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-sm font-mono bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 resize-y"
          />
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={downloadPDF} className="flex-1 min-w-[140px] py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition text-sm">
              📄 {t('page.ocr.download_pdf', locale)}
            </button>
            <button onClick={downloadTXT} className="flex-1 min-w-[140px] py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-xl transition text-sm">
              📝 {t('page.ocr.download_txt', locale)}
            </button>
            <button onClick={downloadDOCX} className="flex-1 min-w-[140px] py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition text-sm">
              📃 {t('page.ocr.download_docx', locale)}
            </button>
          </div>
        </div>
      )}

      {ocrDone && !recognizedText && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 rounded-xl p-4 mb-6">
          ⚠️ {t('page.ocr.no_text_found', locale)}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: '🔒', text: t('local.badge', locale) },
          { icon: '⚡', text: t('local.nolimits', locale) },
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
