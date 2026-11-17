import Link from 'next/link';
import { t, isRtlLocale, type Locale } from '@/lib/i18n';
import { homePath, toolPath, tools, NON_LOCAL_TOOLS } from '@/lib/tools';
import ToolGlyph from '@/components/ToolGlyph';
import { content, rows, MEASURED_ON, SCRIPT_URL } from '@/content/pages/upload-comparison';

// /{locale}/where-your-file-goes — a server component: no script, one language in the HTML.
export default function UploadComparisonView({ locale }: { locale: Locale }) {
  const c = content[locale] ?? content.en!;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', calendar: 'gregory', timeZone: 'UTC' }).format(new Date(`${MEASURED_ON}T12:00:00Z`));
  const exceptions = tools.filter((x) => NON_LOCAL_TOOLS[x.key]).map((x) => t(`tool.${x.key}`, locale)).join(', ');
  const muted = { color: 'var(--coffee-text-secondary)' };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir={isRtlLocale(locale) ? 'rtl' : 'ltr'}>
      <Link href={homePath(locale)} className="text-sm text-[var(--coffee-accent-ink)] hover:underline mb-4 inline-block">{t('back.to_home', locale)}</Link>
      <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">{c.title}</h1>
      <p className="text-lg leading-relaxed mb-2" style={muted}>{c.lead}</p>
      <p className="text-sm mb-8" style={{ color: 'var(--coffee-text-tertiary)' }}>{c.measured.replace('{date}', date)}</p>

      <div className="tool-card rounded-2xl border overflow-hidden mb-10">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--coffee-border)' }}>
              <th scope="col" className="px-4 py-3 text-start font-semibold">{c.thService}</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">{c.thSent}</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold hidden md:table-cell">{c.thWhere}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b last:border-b-0 align-top" style={{ borderColor: 'var(--coffee-border)' }}>
                <th scope="row" className="px-4 py-3 text-start font-semibold">
                  {r.name}
                  {r.to && <span className="md:hidden block font-normal text-xs mt-1 break-words" style={muted}>{c.thWhere}: <code>{r.to}</code></span>}
                </th>
                <td className="px-4 py-3">
                  {!r.sent && <span className="inline-flex items-center gap-1.5 font-semibold text-green-800 dark:text-green-300"><ToolGlyph name="success" />{c.no}</span>}
                  {r.sent && <span className="inline-flex items-center gap-1.5 font-semibold text-red-800 dark:text-red-300"><ToolGlyph name="warning" />{c.yes}</span>}
                  {r.note && <span className="block text-xs mt-1 leading-relaxed" style={muted}>{c.notes[r.note]}</span>}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">{r.to ? <code className="text-xs whitespace-nowrap">{r.to}</code> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{c.methodTitle}</h2>
        <ol className="list-decimal ps-6 space-y-3 leading-relaxed" style={muted}>
          {c.method.map((m, i) => <li key={i}>{m}</li>)}
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{c.limitsTitle}</h2>
        <ul className="list-disc ps-6 space-y-3 leading-relaxed" style={muted}>
          {c.limits.map((m, i) => <li key={i}>{m.replace('{exceptions}', exceptions)}</li>)}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{c.verifyTitle}</h2>
        <ol className="list-decimal ps-6 space-y-3 leading-relaxed" style={muted}>
          {(['home.verify_step1', 'home.verify_step2', 'home.verify_step3'] as const).map((k) => <li key={k}>{t(k, locale)}</li>)}
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3">{c.codeTitle}</h2>
        <p className="leading-relaxed mb-2" style={muted}>{c.code}</p>
        <a href={SCRIPT_URL} className="link-accent font-semibold hover:underline" rel="noopener">{c.codeLink}</a>
      </section>

      <Link href={toolPath('compress', locale)} className="btn-accent inline-block rounded-2xl px-6 py-3 font-bold">{c.cta}</Link>
    </div>
  );
}
