'use client';
import { useState, useRef } from 'react';
import { splitPDF, splitByRanges, extractPages, downloadZip } from '@/lib/client-pdf';
import PagePreview from '@/components/PagePreview';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import CloudFileSaver from '@/components/CloudFileSaver';

export default function SplitPDF() {
  const { locale } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [splitMode, setSplitMode] = useState('fixed');
  const [ranges, setRanges] = useState('');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const processedBlobRef = useRef<Blob | null>(null);
  const downloadFileNameRef = useRef('');

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError(t('error.onlypdf', locale)); return; }
    setFile(f);
    setError('');
    setSuccess(false);
    setSelectedPages([]);
  };

  const handleSplit = async () => {
    if (!file) { setError(t('error.select', locale)); return; }
    if (splitMode === 'ranges' && !ranges.trim()) { setError(t('page.split.enter_ranges', locale)); return; }
    if (splitMode === 'select' && selectedPages.length === 0) { setError(t('page.split.select_pages', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      let results: { data: Uint8Array; name: string }[];
      if (splitMode === 'fixed') {
        const bufs = await splitPDF(file);
        results = bufs.map((data, i) => ({ data, name: `strona_${i + 1}.pdf` }));
      } else if (splitMode === 'select') {
        const data = await extractPages(file, selectedPages);
        const names = selectedPages.map(p => `strona_${p + 1}.pdf`);
        results = [{ data, name: `wybrane_strony.pdf` }];
      } else {
        results = await splitByRanges(file, ranges);
      }
      if (results.length === 0) throw new Error(t('page.split.no_pages', locale));
      const blob = await downloadZip(results);
      processedBlobRef.current = blob;
      downloadFileNameRef.current = 'archive.zip';
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
          <div className="text-6xl mb-4">{getToolIcon('split')}</div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.split', locale)}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.split.desc', locale)}</p>
        </div>

        <div
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById('fileInput')?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
            ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
            ${file ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}
        >
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

        {/* Tryb podziału */}
        <div className="tool-card rounded-2xl border p-6 mb-6">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">{t('page.split.mode_title', locale)}</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { value: 'fixed', label: t('page.split.mode_fixed', locale), desc: t('page.split.mode_fixed_desc', locale), icon: '📄' },
              { value: 'select', label: t('page.split.mode_select', locale), desc: t('page.split.mode_select_desc', locale), icon: '👆' },
              { value: 'ranges', label: t('page.split.mode_ranges', locale), desc: t('page.split.mode_ranges_desc', locale), icon: '🎯' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setSplitMode(opt.value)}
                className={`p-4 rounded-xl border-2 text-left transition
                  ${splitMode === opt.value ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
                <div className="text-2xl mb-2">{opt.icon}</div>
                <div className="font-medium text-sm tool-heading">{opt.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>

          {splitMode === 'select' && file && (
            <PagePreview
              file={file}
              mode="select"
              selectedPages={selectedPages}
              onSelectionChange={setSelectedPages}
              onNewOrder={() => {}}
            />
          )}

          {splitMode === 'ranges' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('page.split.ranges_label', locale)}
              </label>
              <input
                type="text"
                value={ranges}
                onChange={e => setRanges(e.target.value)}
                placeholder={t('page.split.ranges_placeholder', locale)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 dark:border-blue-400 dark:focus:border-blue-400"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {t('page.split.examples_label', locale)} <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">1-3</span> ({t('page.split.example_pages_1_3', locale)}), 
                <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded ml-1">5</span> ({t('page.split.example_page_5_only', locale)}),
                <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded ml-1">1-3,7-9</span> ({t('page.split.example_two_ranges', locale)})
              </p>
            </div>
          )}
        </div>

        <div className="tool-info-box rounded-2xl p-5 mb-6">
          <h3 className="font-bold tool-heading mb-2">{t('local.title', locale)}</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">{t('local.desc', locale)}</p>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
        {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">✅ {t('result.zip', locale)}</div>}
        {success && processedBlobRef.current && (
          <div className="flex justify-center mb-6">
            <CloudFileSaver blob={processedBlobRef.current} fileName={downloadFileNameRef.current} />
          </div>
        )}

        <button onClick={handleSplit} disabled={loading || !file}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition
            ${loading || !file ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
          {loading ? `⏳ ${t('page.split.loading', locale)}` : `✂️ ${t('page.split.button', locale)}`}
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
