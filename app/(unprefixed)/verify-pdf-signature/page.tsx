'use client';
import { useState } from 'react';
import CloudFilePicker from '@/components/CloudFilePicker';
import { useLocale } from '@/lib/locale-context';
import { localeToHtmlLang, t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import ToolGlyph from '@/components/ToolGlyph';
import { errorText } from '@/lib/error-text';
import { useIdlePreload } from '@/hooks/useIdlePreload';
import type { CertInfo, ChainLink, PdfSignatureReport, VerifyResult } from '@/lib/pdf/verifySignatures';

// "Verify PDF signature" (plan 2.9, 2026-11-28). The check runs in the browser
// (lib/pdf/verifySignatures.ts: pdf-lib + Web Crypto, loaded when the page is idle or on first use).
const loadEngine = () => import('@/lib/pdf/verifySignatures');

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_STYLE: Record<PdfSignatureReport['status'], { box: string; glyph: 'success' | 'warning' | 'info' }> = {
  valid: { box: 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300', glyph: 'success' },
  invalid: { box: 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300', glyph: 'warning' },
  unknown: { box: 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300', glyph: 'info' },
};

export default function VerifyPdfSignature({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const contextLocale = useLocale().locale;
  const locale = forcedLocale ?? contextLocale;
  useIdlePreload(loadEngine);
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const fmt = (d: Date | null | undefined) => (d
    // dateStyle/timeStyle cannot be combined with timeZoneName (Chrome throws "Invalid option").
    ? new Intl.DateTimeFormat(localeToHtmlLang(locale), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(d)
    : '—');
  const fmtDay = (d: Date | null | undefined) => (d ? new Intl.DateTimeFormat(localeToHtmlLang(locale), { dateStyle: 'medium' }).format(d) : '—');

  const check = async (list: File[]) => {
    const f = list.find((x) => x.type === 'application/pdf' || /\.pdf$/i.test(x.name));
    setError(f ? '' : t('error.onlypdf', locale));
    if (!f) return;
    setBusy(true);
    setResult(null);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      setFile({ name: f.name, bytes });
      const { verifyPdfSignatures } = await loadEngine();
      setResult(await verifyPdfSignatures(bytes));
    } catch (err: unknown) {
      setFile(null);
      setError(errorText(err, locale));
    } finally {
      setBusy(false);
    }
  };

  const downloadSignedVersion = (s: PdfSignatureReport) => {
    if (!file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    saveBlob(new Blob([file.bytes.slice(0, s.signedLength)], { type: 'application/pdf' }), `${base}${t('file.signed_version_suffix', locale)}.pdf`);
  };

  const counts = result ? {
    n: result.signatures.length,
    valid: result.signatures.filter((s) => s.status === 'valid').length,
    invalid: result.signatures.filter((s) => s.status === 'invalid').length,
    unknown: result.signatures.filter((s) => s.status === 'unknown').length,
  } : null;

  const certLine = (c: CertInfo) => (c.organization ? `${c.subject} (${c.organization})` : c.subject);
  const linkNote = (l: ChainLink, last: boolean) => {
    if (l.issuedByNext === false) return t('page.verify.chain_broken', locale);
    if (l.issuedByNext === null && !(last && l.cert.selfSigned)) return t('page.verify.chain_incomplete', locale);
    return '';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('verifysig')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.verifysig', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.verify.desc', locale)}</p>
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void check(Array.from(e.dataTransfer.files)); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('fileInput')?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('fileInput')?.click(); } }}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
          ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
        <div className="text-5xl mb-3"><ToolGlyph name="folderOpen" /></div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">{file ? file.name : t('page.verify.drop', locale)}</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{file ? t('page.verify.choose_another', locale) : t('drag.subtitle', locale)}</p>
        <input id="fileInput" type="file" accept=".pdf" className="hidden"
          onChange={(e) => { void check(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      </div>

      <div className="flex justify-center gap-2 mb-6">
        <CloudFilePicker onFilesPicked={(f) => void check(f)} label={t('cloud.add', locale)} />
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6" role="alert"><ToolGlyph name="warning" /> {error}</div>}
      {busy && <p className="text-center text-gray-600 dark:text-gray-300 mb-6" role="status"><ToolGlyph name="hourglass" /> {t('page.verify.reading', locale)}</p>}

      {result && counts && (
        <section aria-labelledby="verify-summary" className="mb-6">
          {/* role="status" on the h2 itself would replace its heading role (axe heading-order). */}
          <div role="status">
            <h2 id="verify-summary" className="font-bold tool-heading text-lg mb-3" data-testid="verify-summary">
              {counts.n === 0 ? t('page.verify.none', locale) : t('page.verify.summary', locale, counts)}
            </h2>
          </div>
          {counts.n === 0 && <p className="text-gray-600 dark:text-gray-300 mb-4">{t('page.verify.none_hint', locale)}</p>}
          <ol className="space-y-4" data-testid="verify-results">
            {result.signatures.map((s, i) => {
              const st = STATUS_STYLE[s.status];
              const rows: [string, string][] = [];
              if (s.signer) {
                rows.push([t(s.kind === 'timestamp' ? 'page.verify.authority' : 'page.verify.signer', locale), certLine(s.signer)]);
                rows.push([t('page.verify.issuer', locale), s.signer.issuer]);
                rows.push([t('page.verify.validity', locale), `${fmtDay(s.signer.notBefore)} – ${fmtDay(s.signer.notAfter)}`]);
              }
              if (s.kind !== 'timestamp' && s.claimedTime) rows.push([t('page.verify.claimed_time', locale), fmt(s.claimedTime)]);
              if (s.timestamp?.ok) rows.push([t('page.verify.timestamp', locale), `${fmt(s.timestamp.time)}${s.timestamp.authority && s.kind !== 'timestamp' ? ` — ${s.timestamp.authority}` : ''}`]);
              if (s.reason) rows.push([t('page.verify.reason', locale), s.reason]);
              if (s.location) rows.push([t('page.verify.location', locale), s.location]);
              if (s.permission) rows.push([t('page.verify.permission', locale), t(`page.verify.perm_${s.permission}`, locale)]);
              if (s.signatureAlgorithm) rows.push([t('page.verify.algorithm', locale), s.signatureAlgorithm]);
              const notes: string[] = [];
              if (s.status === 'valid') notes.push(t(s.coversWholeFile ? 'page.verify.covers_all' : 'page.verify.changed_after', locale));
              if (s.certValidAtSigning === false) notes.push(t('page.verify.cert_not_valid_at_signing', locale));
              if (s.signer?.selfSigned) notes.push(t('page.verify.self_signed', locale));
              if (s.timestamp && !s.timestamp.ok) notes.push(t('page.verify.timestamp_bad', locale));
              return (
                <li key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5" data-testid="verify-signature">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${st.box}`} data-testid="verify-status" data-status={s.status}>
                      <ToolGlyph name={st.glyph} /> {t(`page.verify.status_${s.status}`, locale)}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t(`page.verify.kind_${s.kind}`, locale)}{s.field ? ` · ${s.field}` : ''}
                    </span>
                  </div>
                  {s.problem && (
                    <p className="text-sm text-gray-800 dark:text-gray-200 mb-3" data-testid="verify-problem">
                      {t(`page.verify.problem_${s.problem.replace('-', '_')}`, locale, { detail: s.detail ?? '' })}
                    </p>
                  )}
                  {rows.length > 0 && (
                    <dl className="grid grid-cols-1 sm:grid-cols-[minmax(0,13rem)_1fr] gap-x-4 gap-y-1.5 text-sm">
                      {rows.map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-gray-500 dark:text-gray-400">{k}</dt>
                          <dd className="tool-heading break-words">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {notes.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300" data-testid="verify-notes">
                      {notes.map((n) => <li key={n}>{n}</li>)}
                    </ul>
                  )}
                  {s.status === 'valid' && !s.coversWholeFile && (
                    <button type="button" onClick={() => downloadSignedVersion(s)}
                      className="mt-3 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium tool-heading hover:border-blue-400">
                      {t('page.verify.download_signed', locale)}
                    </button>
                  )}
                  {s.chain.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold tool-heading mb-1">{t('page.verify.chain', locale)}</h3>
                      <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-0.5" data-testid="verify-chain">
                        {s.chain.map((l, j) => {
                          const note = linkNote(l, j === s.chain.length - 1);
                          return (
                            <li key={j} style={{ paddingInlineStart: `${j * 1}rem` }}>
                              {j > 0 ? '↳ ' : ''}{l.cert.subject}{note && <span className="text-red-700 dark:text-red-400"> — {note}</span>}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="tool-info-box rounded-2xl p-5 mt-8" data-testid="verify-limits">
        <h2 className="font-bold tool-heading mb-2">{t('page.verify.limits_title', locale)}</h2>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1.5">
          <li>{t('page.verify.limits_1', locale)}</li>
          <li>{t('page.verify.limits_2', locale)}</li>
          <li>{t('page.verify.limits_3', locale)}</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: 'shield' as const, text: t('feature.local_short', locale) },
          { icon: 'bolt' as const, text: t('feature.instant_result', locale) },
          { icon: 'gift' as const, text: t('feature.free_simple', locale) },
        ].map((item, i) => (
          <div key={i} className="tool-feature-card rounded-xl p-4 border">
            <div className="text-2xl mb-1"><ToolGlyph name={item.icon} /></div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
