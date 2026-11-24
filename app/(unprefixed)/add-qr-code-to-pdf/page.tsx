'use client';
import { useMemo, useState } from 'react';
import CloudFileSaver from '@/components/CloudFileSaver';
import CloudFilePicker from '@/components/CloudFilePicker';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import ToolGlyph from '@/components/ToolGlyph';
import PdfBadge from '@/components/PdfBadge';
import { errorText } from '@/lib/error-text';
import { useIdlePreload } from '@/hooks/useIdlePreload';
import { QR_MAX_BYTES, QUIET_ZONE, isWebLink, qrByteLength, qrMatrix, qrPathData, qrSvg } from '@/lib/qr';
import type { QrPages, QrPosition } from '@/lib/pdf/addQrCode';

// "Add QR code to PDF" (plan 2.5, 2026-11-24): a QR code for a link or a text, downloaded as PNG
// or SVG, or drawn as vector shapes on pages of a PDF (lib/pdf/addQrCode.ts, loaded when idle).
// Everything runs in the browser.
const loadEngine = () => import('@/lib/pdf/addQrCode');
const SIZES = [20, 30, 40, 50] as const;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AddQrCodeToPdf({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const ctxLocale = useLocale().locale;
  const locale = forcedLocale ?? ctxLocale;
  useIdlePreload(loadEngine);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sizeMm, setSizeMm] = useState<number>(30);
  const [position, setPosition] = useState<QrPosition>('bottom-right');
  const [pages, setPages] = useState<QrPages>('first');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Blob | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const value = text.trim();
  const bytes = qrByteLength(value);
  const tooLong = bytes > QR_MAX_BYTES;
  const matrix = useMemo(() => {
    const v = text.trim();
    return v && qrByteLength(v) <= QR_MAX_BYTES ? qrMatrix(v) : null;
  }, [text]);
  const modules = matrix ? matrix.length + QUIET_ZONE * 2 : 0;
  // A whole number of screen pixels per module (at least 4): with crisp edges, a fractional size
  // makes modules of uneven width, and a phone may fail to read the code from the screen.
  const previewPx = modules ? modules * Math.max(4, Math.floor(200 / modules)) : 0;
  const pdfName = file ? `${file.name.replace(/\.pdf$/i, '')}${t('file.qr_suffix', locale)}.pdf` : '';

  const reset = () => { setError(''); setResult(null); };

  const downloadPng = async () => {
    if (!matrix) return;
    const px = Math.max(8, Math.ceil(1024 / modules));
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = modules * px;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    matrix.forEach((row, r) => row.forEach((dark, c) => { if (dark) ctx.fillRect((c + QUIET_ZONE) * px, (r + QUIET_ZONE) * px, px, px); }));
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (blob) download(blob, `${t('file.qr_code', locale)}.png`);
  };
  const downloadSvg = () => {
    if (!matrix) return;
    download(new Blob([qrSvg(value)], { type: 'image/svg+xml' }), `${t('file.qr_code', locale)}.svg`);
  };

  const handleFile = (f: File | null) => {
    reset();
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { setError(t('page.qr.bad_file', locale)); return; }
    setFile(f);
  };

  const addToPdf = async () => {
    if (!file || !matrix) return;
    setLoading(true);
    reset();
    try {
      const { addQrCodeToPdf } = await loadEngine();
      const out = await addQrCodeToPdf(new Uint8Array(await file.arrayBuffer()), { text: value, sizeMm, position, pages });
      const blob = new Blob([out as BlobPart], { type: 'application/pdf' });
      setResult(blob);
      download(blob, pdfName);
    } catch (err: unknown) {
      setError(errorText(err, locale));
    } finally {
      setLoading(false);
    }
  };

  const positions: { value: QrPosition; icon: 'posTL' | 'posTC' | 'posTR' | 'posBL' | 'posBC' | 'posBR'; label: string }[] = [
    { value: 'top-left', icon: 'posTL', label: t('page.pagenumbers.top_left', locale) },
    { value: 'top-center', icon: 'posTC', label: t('page.pagenumbers.top_center', locale) },
    { value: 'top-right', icon: 'posTR', label: t('page.pagenumbers.top_right', locale) },
    { value: 'bottom-left', icon: 'posBL', label: t('page.pagenumbers.bottom_left', locale) },
    { value: 'bottom-center', icon: 'posBC', label: t('page.pagenumbers.bottom_center', locale) },
    { value: 'bottom-right', icon: 'posBR', label: t('page.pagenumbers.bottom_right', locale) },
  ];
  const choice = (on: boolean) => `rounded-xl border-2 text-center text-sm font-medium transition
    ${on ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300'}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('qrcode')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.qrcode', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.qr.desc', locale)}</p>
      </div>

      <section className="tool-card rounded-2xl border p-6 mb-6" aria-labelledby="qr-make">
        <h2 id="qr-make" className="font-bold tool-heading mb-4">{t('page.qr.make_title', locale)}</h2>
        <label htmlFor="qr-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('page.qr.text_label', locale)}</label>
        <textarea id="qr-text" value={text} rows={3} spellCheck={false}
          onChange={(e) => { setText(e.target.value); reset(); }}
          placeholder="https://"
          aria-describedby="qr-count"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 tool-heading resize-y" />
        <p id="qr-count" className={`text-xs mt-1 ${tooLong ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`} data-testid="qr-count">
          {tooLong ? t('page.qr.too_long', locale, { n: bytes, max: QR_MAX_BYTES }) : t('page.qr.count', locale, { n: bytes, max: QR_MAX_BYTES })}
        </p>

        {matrix && (
          <div className="mt-5 flex flex-col sm:flex-row items-center gap-6">
            <svg role="img" aria-label={t('page.qr.preview_alt', locale, { text: value.length > 60 ? `${value.slice(0, 60)}…` : value })}
              data-testid="qr-preview" viewBox={`0 0 ${modules} ${modules}`} width={previewPx} height={previewPx} shapeRendering="crispEdges" className="shrink-0 max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600">
              <rect width={modules} height={modules} fill="#fff" />
              <path d={qrPathData(matrix)} fill="#000" />
            </svg>
            <div className="space-y-3 w-full">
              <p className="text-sm text-gray-600 dark:text-gray-300">{t(isWebLink(value) ? 'page.qr.is_link' : 'page.qr.is_text', locale)}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void downloadPng()} data-testid="qr-png"
                  className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-sm font-medium tool-heading hover:border-blue-400">{t('page.qr.download_png', locale)}</button>
                <button type="button" onClick={downloadSvg} data-testid="qr-svg"
                  className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-sm font-medium tool-heading hover:border-blue-400">{t('page.qr.download_svg', locale)}</button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('page.qr.test_hint', locale)}</p>
            </div>
          </div>
        )}
      </section>

      <section className="tool-card rounded-2xl border p-6 mb-6" aria-labelledby="qr-pdf">
        <h2 id="qr-pdf" className="font-bold tool-heading mb-4">{t('page.qr.pdf_title', locale)}</h2>
        <div
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0] ?? null); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById('fileInput')?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('fileInput')?.click(); } }}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition mb-4
            ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
            ${file ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}>
          {file ? (
            <div>
              <div className="text-4xl mb-2"><PdfBadge /></div>
              <p className="font-medium tool-heading break-all">{file.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('drag.change', locale)}</p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-2"><ToolGlyph name="folderOpen" /></div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">{t('drag.title', locale)}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('drag.subtitle', locale)}</p>
            </div>
          )}
          <input id="fileInput" type="file" accept=".pdf,application/pdf" className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0] || null); e.target.value = ''; }} />
        </div>
        <div className="flex justify-center mb-5">
          <CloudFilePicker onFilesPicked={(f) => handleFile(f[0] || null)} label={t('cloud.add', locale)} />
        </div>

        <div className="space-y-5">
          <div>
            <span id="qr-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('page.qr.size_label', locale)}</span>
            <div role="group" aria-labelledby="qr-size" className="grid grid-cols-4 gap-2">
              {SIZES.map((s) => (
                <button key={s} type="button" aria-pressed={sizeMm === s} onClick={() => { setSizeMm(s); reset(); }} className={`p-2 ${choice(sizeMm === s)}`}>
                  {t('page.qr.size_cm', locale, { n: s / 10 })}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span id="qr-position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('page.pagenumbers.position_label', locale)}</span>
            <div role="group" aria-labelledby="qr-position" className="grid grid-cols-3 gap-2">
              {positions.map((p) => (
                <button key={p.value} type="button" aria-pressed={position === p.value} onClick={() => { setPosition(p.value); reset(); }} className={`p-3 text-xs ${choice(position === p.value)}`}>
                  <span className="block text-2xl mb-1"><ToolGlyph name={p.icon} /></span>{p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span id="qr-pages" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('page.qr.pages_label', locale)}</span>
            <div role="group" aria-labelledby="qr-pages" className="grid grid-cols-3 gap-2">
              {(['first', 'last', 'all'] as const).map((p) => (
                <button key={p} type="button" aria-pressed={pages === p} onClick={() => { setPages(p); reset(); }} className={`p-2 ${choice(pages === p)}`}>
                  {t(`page.qr.pages_${p}`, locale)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6"><ToolGlyph name="warning" /> {error}</div>}
      {result && (
        <>
          <div role="status" className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">
            <ToolGlyph name="success" /> {t('page.qr.success', locale)}
          </div>
          <div className="flex justify-center mb-6"><CloudFileSaver blob={result} fileName={pdfName} /></div>
        </>
      )}

      <button data-testid="qr-submit" onClick={() => void addToPdf()} disabled={loading || !file || !matrix}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || !file || !matrix ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? <span><ToolGlyph name="hourglass" /> {t('page.qr.loading', locale)}</span> : <span>{t('page.qr.btn', locale)}</span>}
      </button>
      {!matrix && file && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">{t('page.qr.need_text', locale)}</p>}

      <ul className="text-sm text-gray-600 dark:text-gray-400 mt-8 space-y-2 list-disc ps-5">
        <li>{t('page.qr.info_vector', locale)}</li>
        <li>{t('page.qr.info_link', locale)}</li>
        <li>{t('page.qr.info_local', locale)}</li>
      </ul>
    </div>
  );
}
