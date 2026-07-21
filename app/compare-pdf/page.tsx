'use client';
import { useState } from 'react';
import { comparePdfTextClient, comparePdfVisual, type PageDiff } from '@/lib/client-pdf';
import { getToolIcon } from '@/lib/icons';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import CloudFilePicker from '@/components/CloudFilePicker';

type Mode = 'text' | 'visual';

interface DiffItem {
  page: number;
  type: 'added' | 'removed';
  content: string;
}

export default function ComparePDF({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const locale = forcedLocale ?? useLocale().locale;
  const [mode, setMode] = useState<Mode>('text');
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [diffs, setDiffs] = useState<DiffItem[] | null>(null);
  const [vDiffs, setVDiffs] = useState<PageDiff[] | null>(null);
  const [dragOverA, setDragOverA] = useState(false);
  const [dragOverB, setDragOverB] = useState(false);

  const handleFile = (side: 'A' | 'B') => (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError(t('page.compare.error_onlypdf', locale)); return; }
    if (side === 'A') setFileA(f);
    else setFileB(f);
    setError('');
    setDiffs(null);
    setVDiffs(null);
  };

  const handleCompare = async () => {
    if (!fileA || !fileB) { setError(t('page.compare.error_select_both', locale)); return; }
    setLoading(true);
    setError('');
    setDiffs(null);
    setVDiffs(null);

    try {
      if (mode === 'text') {
        const { differences } = await comparePdfTextClient(fileA, fileB);
        setDiffs(differences);
      } else {
        const visualDiffs = await comparePdfVisual(fileA, fileB);
        setVDiffs(visualDiffs);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('page.compare.error_generic', locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('compare')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('page.compare.heading', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.compare.subtitle', locale)}</p>
      </div>

      <div className="flex justify-center gap-2 mb-8">
        <button onClick={() => { setMode('text'); setDiffs(null); setVDiffs(null); }}
          className={`px-6 py-2 rounded-full font-medium text-sm transition ${mode === 'text' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
          📝 {t('page.compare.mode_text', locale)}
        </button>
        <button onClick={() => { setMode('visual'); setDiffs(null); setVDiffs(null); }}
          className={`px-6 py-2 rounded-full font-medium text-sm transition ${mode === 'visual' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
          🎨 {t('page.compare.mode_visual', locale)}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div
          onDrop={(e) => { e.preventDefault(); setDragOverA(false); handleFile('A')(e.dataTransfer.files[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragOverA(true); }}
          onDragLeave={() => setDragOverA(false)}
          onClick={() => document.getElementById('fileInputA')?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition
            ${dragOverA ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
            ${fileA ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}>
          {fileA ? (
            <div>
              <div className="text-4xl mb-2">📄</div>
              <p className="font-medium tool-heading text-sm">{fileA.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('page.compare.click_to_change', locale)}</p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-2">📄</div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">{t('page.compare.file_a_label', locale)}</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{t('page.compare.drag_or_click', locale)}</p>
            </div>
          )}
          <input id="fileInputA" type="file" accept=".pdf" className="hidden"
            onChange={e => handleFile('A')(e.target.files?.[0] || null)} />
        </div>

        <div
          onDrop={(e) => { e.preventDefault(); setDragOverB(false); handleFile('B')(e.dataTransfer.files[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragOverB(true); }}
          onDragLeave={() => setDragOverB(false)}
          onClick={() => document.getElementById('fileInputB')?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition
            ${dragOverB ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
            ${fileB ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}>
          {fileB ? (
            <div>
              <div className="text-4xl mb-2">📄</div>
              <p className="font-medium tool-heading text-sm">{fileB.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('page.compare.click_to_change', locale)}</p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-2">📄</div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">{t('page.compare.file_b_label', locale)}</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{t('page.compare.drag_or_click', locale)}</p>
            </div>
          )}
          <input id="fileInputB" type="file" accept=".pdf" className="hidden"
            onChange={e => handleFile('B')(e.target.files?.[0] || null)} />
        </div>
      </div>

      <div className="flex justify-center gap-2 mb-6">
        <CloudFilePicker onFilesPicked={(f) => handleFile('A')(f[0] || null)} label={"☁️ " + t('cloud.add', locale)} />
        <CloudFilePicker onFilesPicked={(f) => handleFile('B')(f[0] || null)} label={"☁️ " + t('cloud.add', locale)} />
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}

      <button onClick={handleCompare} disabled={loading || !fileA || !fileB}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition mb-6
          ${loading || !fileA || !fileB ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? '⏳ ' + t('page.compare.comparing', locale) : mode === 'text' ? '🔍 ' + t('page.compare.btn_compare_text', locale) : '🎨 ' + t('page.compare.btn_compare_visual', locale)}
      </button>

      {diffs !== null && mode === 'text' && (
        <div className="tool-card rounded-2xl border overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <p className="font-bold tool-heading">
              {t('page.compare.text_result_count', locale).replace('{count}', String(diffs.length))}{diffs.length === 0 ? t('page.compare.text_result_identical', locale) : ''}
            </p>
          </div>
          {diffs.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-gray-500 dark:text-gray-400">✅ {t('page.compare.text_identical_msg', locale)}</p>
            </div>
          )}
          {diffs.map((diff, i) => (
            <div key={i} className={`p-4 border-b border-gray-50 dark:border-gray-700 ${diff.type === 'added' ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${diff.type === 'added' ? 'bg-green-500' : 'bg-red-500'}`}>
                  {diff.type === 'added' ? t('page.compare.label_added', locale) : t('page.compare.label_removed', locale)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('page.compare.page_label', locale).replace('{page}', String(diff.page))}</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{diff.content}</p>
            </div>
          ))}
        </div>
      )}

      {vDiffs !== null && mode === 'visual' && (
        <div className="space-y-6">
          <div className="tool-card rounded-2xl border p-4">
            <p className="font-bold tool-heading mb-2">
              {t('page.compare.visual_result_count', locale).replace('{count}', String(vDiffs.length))}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('page.compare.visual_result_hint', locale)}
            </p>
          </div>
          {vDiffs.map((d) => (
            <div key={d.page} className="tool-card rounded-2xl border overflow-hidden">
              <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{t('page.compare.page_label', locale).replace('{page}', String(d.page))}</span>
                {d.diffPercent > 0 && (
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">{d.diffPercent}% {t('page.compare.diff_percent', locale)}</span>
                )}
                {d.diffPercent === 0 && d.pageAExists && d.pageBExists && (
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">✅ {t('page.compare.identical_badge', locale)}</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                {d.imgA && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">{t('page.compare.file_a_short', locale)}</p>
                    <img src={d.imgA} alt={`Strona ${d.page} A`} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg" />
                  </div>
                )}
                {d.imgB && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">{t('page.compare.file_b_short', locale)}</p>
                    <img src={d.imgB} alt={`Strona ${d.page} B`} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg" />
                  </div>
                )}
                {d.diffOverlay && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">{t('page.compare.diff_label', locale)}</p>
                    <img src={d.diffOverlay} alt={`Różnice strona ${d.page}`} className="w-full border border-red-200 dark:border-red-800 rounded-lg" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: '🔒', text: t('page.compare.feature_no_storage', locale) },
          { icon: '⚡', text: t('page.compare.feature_instant', locale) },
          { icon: '🆓', text: t('page.compare.feature_free', locale) },
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
