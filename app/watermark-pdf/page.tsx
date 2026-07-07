 'use client';
import { useState, useRef } from 'react';
import { addWatermark, downloadPdf } from '@/lib/client-pdf';
import CloudFileSaver from '@/components/CloudFileSaver';
import CloudFilePicker from '@/components/CloudFilePicker';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

export default function WatermarkPDF() {
  const { locale } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('POUFNE');
  const [opacity, setOpacity] = useState('50');
  const [position, setPosition] = useState('center');
  const [fontSize, setFontSize] = useState('40');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const processedBlobRef = useRef<Blob | null>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError(t('error.onlypdf', locale)); return; }
    setFile(f);
    setError('');
    setSuccess(false);
  };

  const handleWatermark = async () => {
    if (!file) { setError(t('error.select', locale)); return; }
    if (!text.trim()) { setError(t('page.watermark.enter_text', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await addWatermark(file, text, {
        opacity: parseInt(opacity, 10),
        fontSize: parseInt(fontSize, 10),
        position: position as 'top' | 'center' | 'bottom',
      });
      const blob = await downloadPdf(result, file.name.replace('.pdf', '_znak_wodny.pdf'));
      processedBlobRef.current = blob;
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
          <div className="text-6xl mb-4">{getToolIcon('watermark')}</div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.watermark', locale)}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.watermark.desc', locale)}</p>
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

      <div className="flex justify-center gap-2 mb-6">
        <CloudFilePicker onFilesPicked={(f) => handleFile(f[0] || null)} label={"☁️ " + t('cloud.add', locale)} />
      </div>

        {/* Podgląd znaku wodnego */}
        {text && (
          <div className="tool-card rounded-2xl border p-6 mb-6">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3">{t('page.watermark.preview', locale)}</h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl h-32 flex items-center justify-center relative overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="absolute inset-0 flex items-center justify-center">
               <span style={{
  fontSize: `${Math.min(parseInt(fontSize) * 0.8, 48)}px`,
  opacity: parseInt(opacity) / 100,
  color: '#FF0000',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
}}>
                  {text}
                </span>
              </div>
              <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none">
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-full" />)}
                </div>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-full" />)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ustawienia */}
        <div className="tool-card rounded-2xl border p-6 mb-6 space-y-5">
          <h3 className="font-bold text-gray-700 dark:text-gray-300">{t('page.watermark.settings', locale)}</h3>

          {/* Tekst */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('page.watermark.text_label', locale)}</label>
            <input type="text" value={text} onChange={e => setText(e.target.value)}
              placeholder={t('page.watermark.text_placeholder', locale)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 dark:border-blue-400 dark:focus:border-blue-400" />
            <div className="flex gap-2 mt-2">
              {['POUFNE', 'KOPIA', 'DRAFT', 'PRÓBKA'].map(preset => (
                <button key={preset} onClick={() => setText(preset)}
                  className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:!text-[var(--coffee-accent)] px-3 py-1 rounded-full transition">
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Przezroczystość */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('page.watermark.opacity_label', locale)}: <span className="!text-[var(--coffee-accent)] font-bold">{opacity}%</span>
            </label>
            <input type="range" min="10" max="100" step="10"
              value={opacity} onChange={e => setOpacity(e.target.value)}
              className="w-full accent-blue-600 dark:accent-blue-400" />
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
              <span>{t('page.watermark.opacity_min', locale)}</span>
              <span>{t('page.watermark.opacity_max', locale)}</span>
            </div>
          </div>

          {/* Rozmiar czcionki */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('page.watermark.font_size_label', locale)}: <span className="!text-[var(--coffee-accent)] font-bold">{fontSize}pt</span>
            </label>
            <input type="range" min="20" max="80" step="10"
              value={fontSize} onChange={e => setFontSize(e.target.value)}
              className="w-full accent-blue-600 dark:accent-blue-400" />
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
              <span>{t('page.watermark.font_size_min', locale)}</span>
              <span>{t('page.watermark.font_size_max', locale)}</span>
            </div>
          </div>

          {/* Pozycja */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('page.watermark.position_label', locale)}</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'top', label: t('page.watermark.position_top', locale) },
                { value: 'center', label: t('page.watermark.position_center', locale) },
                { value: 'bottom', label: t('page.watermark.position_bottom', locale) },
              ].map(opt => (
                <button key={opt.value} onClick={() => setPosition(opt.value)}
                  className={`p-3 rounded-xl border-2 text-center text-sm font-medium transition
                    ${position === opt.value ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="tool-info-box rounded-2xl p-5 mb-6">
          <h3 className="font-bold tool-heading mb-2">{t('local.title', locale)}</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">{t('local.desc', locale)}</p>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
        {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">✅ {t('result.success', locale)}</div>}
        {success && file && processedBlobRef.current && (
          <div className="flex justify-center mb-6">
            <CloudFileSaver blob={processedBlobRef.current} fileName={file.name.replace('.pdf', '_znak_wodny.pdf')} />
          </div>
        )}

        <button onClick={handleWatermark} disabled={loading || !file || !text.trim()}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition
            ${loading || !file || !text.trim() ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
          {loading ? `⏳ ${t('page.watermark.loading', locale)}` : `💧 ${t('page.watermark.button', locale)}`}
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
