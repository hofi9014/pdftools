'use client';
import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import SignatureCanvas from 'react-signature-canvas';
import CloudFileSaver from '@/components/CloudFileSaver';
import CloudFilePicker from '@/components/CloudFilePicker';
import { signPdfClient } from '@/lib/client-pdf';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';



export default function SignPdf() {
  const { locale } = useLocale();

  const presets = [
    { id: 'top-left', label: t('page.sign.preset_top_left', locale) },
    { id: 'top-center', label: t('page.sign.preset_top_center', locale) },
    { id: 'top-right', label: t('page.sign.preset_top_right', locale) },
    { id: 'center-left', label: t('page.sign.preset_center_left', locale) },
    { id: 'center', label: t('page.sign.preset_center', locale) },
    { id: 'center-right', label: t('page.sign.preset_center_right', locale) },
    { id: 'bottom-left', label: t('page.sign.preset_bottom_left', locale) },
    { id: 'bottom-center', label: t('page.sign.preset_bottom_center', locale) },
    { id: 'bottom-right', label: t('page.sign.preset_bottom_right', locale) },
  ];

  const pageModes = [
    { id: 'single', label: t('page.sign.single', locale) },
    { id: 'first', label: t('page.sign.first', locale) },
    { id: 'last', label: t('page.sign.last', locale) },
    { id: 'all', label: t('page.sign.all', locale) },
    { id: 'custom', label: t('page.sign.custom', locale) },
  ];

  const [file, setFile] = useState<File | null>(null);
  const [pageMode, setPageMode] = useState('single');
  const [singlePage, setSinglePage] = useState(1);
  const [customPages, setCustomPages] = useState('');
  const [signName, setSignName] = useState('');
  const [signImage, setSignImage] = useState<File | null>(null);
  const [signPreview, setSignPreview] = useState('');
  const [signX, setSignX] = useState(50);
  const [signY, setSignY] = useState(50);
  const [unit, setUnit] = useState('mm');
  const [preset, setPreset] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const sigRef = useRef<SignatureCanvas | null>(null);
  const processedBlobRef = useRef<Blob | null>(null);

  const clearSignature = useCallback(() => {
    sigRef.current?.clear();
    setSignImage(null);
    setSignPreview('');
  }, []);

  const saveSignature = useCallback(() => {
    if (sigRef.current?.isEmpty()) return;
    const dataUrl = sigRef.current?.toDataURL('image/png');
    if (dataUrl) {
      setSignPreview(dataUrl);
      fetch(dataUrl)
        .then(r => r.blob())
        .then(b => setSignImage(new File([b], 'podpis.png', { type: 'image/png' })));
    }
  }, []);

  const handlePreset = useCallback((id: string) => {
    setPreset(prev => prev === id ? '' : id);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (!signName && !signImage) { setError(t('page.sign.add_signature_prompt', locale)); return; }
    setLoading(true);
    setError('');
    try {
      const blob = await signPdfClient(file, {
        pageMode,
        singlePage,
        customPages,
        signName,
        signImage: signImage || undefined,
        signX,
        signY,
        unit,
        preset,
      });
      processedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `podpisany-${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('page.edit.unknown_error', locale));
    } finally { setLoading(false); }
  }, [file, pageMode, singlePage, customPages, signName, signImage, signX, signY, unit, preset]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{getToolIcon('sign')}</div>
        <h1 className="text-3xl font-bold tool-heading">{t('tool.sign', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{t('page.sign.desc', locale)}</p>
      </div>

      <form onSubmit={handleSubmit} className="tool-card rounded-2xl border p-8 space-y-6">
        <div className="tool-dropzone rounded-xl p-6 text-center cursor-pointer transition" onClick={() => document.getElementById('file-input')?.click()}>
          <input id="file-input" type="file" accept=".pdf" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setError(''); }} />
          {file ? <p className="!text-[var(--coffee-accent)] font-medium">{file.name}</p> : <p className="text-gray-400 dark:text-gray-500">{t('page.edit.click_select', locale)}</p>}
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <CloudFilePicker onFilesPicked={(f) => { setFile(f[0] || null); setError(''); }} label={"☁️ " + t('cloud.add', locale)} />
        </div>

        <div>
          <p className="font-semibold tool-heading text-sm mb-2">{t('page.sign.choose_pages', locale)}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {pageModes.map(m => (
              <button key={m.id} type="button" onClick={() => setPageMode(m.id)}
                className={`text-xs py-2 px-3 rounded-lg border transition ${pageMode === m.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                {m.label}
              </button>
            ))}
          </div>
          {pageMode === 'single' && (
            <input type="number" min={1} value={singlePage} onChange={e => setSinglePage(Number(e.target.value) || 1)} className="w-24 px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm" placeholder={t('page.sign.page_placeholder', locale)} />
          )}
          {pageMode === 'custom' && (
            <input type="text" value={customPages} onChange={e => setCustomPages(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm" placeholder={t('page.sign.custom_placeholder', locale)} />
          )}
        </div>

        <div>
          <p className="font-semibold tool-heading text-sm mb-2">{t('page.sign.quick_positions', locale)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map(p => (
              <button key={p.id} type="button" onClick={() => handlePreset(p.id)}
                className={`text-xs py-2.5 px-2 rounded-lg border transition min-h-[44px] ${preset === p.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">{t('page.sign.unit', locale)}</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm">
              <option value="mm">{t('page.sign.unit_mm', locale)}</option>
              <option value="cm">{t('page.sign.unit_cm', locale)}</option>
              <option value="in">{t('page.sign.unit_in', locale)}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">X ({unit})</label>
            <input type="number" value={signX} onChange={e => setSignX(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Y ({unit})</label>
            <input type="number" value={signY} onChange={e => setSignY(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="font-semibold tool-heading text-sm">{t('page.sign.text_signature', locale)}</p>
            <input type="text" value={signName} onChange={e => setSignName(e.target.value)} placeholder={t('page.sign.name_placeholder', locale)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-sm" />
          </div>
          <div className="space-y-3">
            <p className="font-semibold tool-heading text-sm">{t('page.sign.draw_signature', locale)}</p>
            <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden bg-white" style={{ height: 100 }}>
              <SignatureCanvas ref={sigRef} penColor="blue" canvasProps={{ className: 'w-full h-full' }} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={saveSignature} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition">{t('page.sign.confirm', locale)}</button>
              <button type="button" onClick={clearSignature} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition">{t('page.sign.clear', locale)}</button>
            </div>
            {signPreview && <Image src={signPreview} alt="Podglad" width={200} height={40} className="h-10 w-auto border border-gray-200 rounded" />}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={!file || loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium rounded-xl transition">
          {loading ? t('page.sign.loading', locale) : t('page.sign.btn', locale)}
        </button>
      </form>

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">
          ✅ {t('result.success', locale)}
        </div>
      )}
      {success && file && processedBlobRef.current && (
        <div className="flex justify-center mb-6">
          <CloudFileSaver blob={processedBlobRef.current} fileName={`podpisany-${file.name}`} />
        </div>
      )}

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
        <h2 className="font-semibold tool-heading mb-2">{t('section.how_it_works', locale)}</h2>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
          <li>{t('page.sign.step1', locale)}</li>
          <li>{t('page.sign.step2', locale)}</li>
          <li>{t('page.sign.step3', locale)}</li>
          <li>{t('page.sign.step4', locale)}</li>
          <li>{t('page.sign.step5', locale)}</li>
        </ul>
      </div>
    </div>
  );
}
