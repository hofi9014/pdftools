'use client';
import { useState, useCallback, useRef } from 'react';
import CloudFileSaver from '@/components/CloudFileSaver';
import { t, type Locale } from '@/lib/i18n';

export default function PadesSignForm({ locale }: { locale: Locale }) {
  const [file, setFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const processedBlobRef = useRef<Blob | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (!certFile) { setError(t('page.sign.pades_missing_cert', locale)); return; }
    if (!password) { setError(t('page.sign.pades_missing_password', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const { signPdfWithCertificate } = await import('@/lib/pdf/padesSign');
      const pdfBytes = new Uint8Array(await file.arrayBuffer());
      const p12Bytes = new Uint8Array(await certFile.arrayBuffer());
      const signed = await signPdfWithCertificate(pdfBytes, p12Bytes, password, {
        reason: reason || undefined,
        location: location || undefined,
        contactInfo: contactInfo || undefined,
      });
      const blob = new Blob([signed as BlobPart], { type: 'application/pdf' });
      processedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `podpisany-${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('page.edit.unknown_error', locale));
    } finally {
      setLoading(false);
    }
  }, [file, certFile, password, reason, location, contactInfo, locale]);

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center max-w-2xl mx-auto">{t('page.sign.pades_desc', locale)}</p>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl p-3 mb-6 text-xs leading-relaxed">
        ⚠️ {t('page.sign.pades_disclaimer', locale)}
      </div>

      <form onSubmit={handleSubmit} className="tool-card rounded-2xl border p-8 space-y-6">
        <div
          className="tool-dropzone rounded-xl p-6 text-center cursor-pointer transition"
          onClick={() => document.getElementById('pades-file-input')?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('pades-file-input')?.click(); } }}
        >
          <input id="pades-file-input" type="file" accept=".pdf" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setError(''); setSuccess(false); }} />
          {file ? <p className="!text-[var(--coffee-accent)] font-medium">{file.name}</p> : <p className="text-gray-400 dark:text-gray-500">{t('page.edit.click_select', locale)}</p>}
        </div>

        <div>
          <label className="text-xs font-semibold tool-heading block mb-2">{t('page.sign.pades_cert_label', locale)}</label>
          <div
            className="tool-dropzone rounded-xl p-4 text-center cursor-pointer transition"
            onClick={() => document.getElementById('pades-cert-input')?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('pades-cert-input')?.click(); } }}
          >
            <input id="pades-cert-input" type="file" accept=".p12,.pfx" className="hidden" onChange={(e) => { setCertFile(e.target.files?.[0] || null); setError(''); }} />
            {certFile ? <p className="!text-[var(--coffee-accent)] font-medium text-sm">{certFile.name}</p> : <p className="text-gray-400 dark:text-gray-500 text-sm">.p12 / .pfx</p>}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold tool-heading block mb-2">{t('page.sign.pades_password_label', locale)}</label>
          <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} autoComplete="off"
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-sm" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('page.sign.pades_reason_label', locale)}</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('page.sign.pades_location_label', locale)}</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('page.sign.pades_contact_label', locale)}</label>
            <input type="text" value={contactInfo} onChange={e => setContactInfo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm" />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={!file || !certFile || !password || loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium rounded-xl transition">
          {loading ? t('page.sign.pades_loading', locale) : t('page.sign.pades_btn', locale)}
        </button>
      </form>

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mt-6">
          ✅ {t('result.success', locale)}
        </div>
      )}
      {success && file && processedBlobRef.current && (
        <div className="flex justify-center mt-6">
          <CloudFileSaver blob={processedBlobRef.current} fileName={`podpisany-${file.name}`} />
        </div>
      )}
    </div>
  );
}
