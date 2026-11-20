import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n';
import { homePath, toolCounts, toolPath, tools, NON_LOCAL_TOOLS } from '@/lib/tools';
import { getToolIcon } from '@/lib/icons';
import { DAILY_LIMIT } from '@/lib/ai-limit';
import { KSEF_PATH } from '@/lib/ksef/route';
import { CONTACT_EMAIL, SOURCE_URL } from '@/content/pages/about';
import { content, BUSINESS_TOOLS, type BusinessLocale } from '@/content/pages/business';

/** Fills the page's placeholders with numbers and names taken from the code. */
export function fillBusiness(text: string, locale: Locale): string {
  const counts = toolCounts(locale);
  const exceptions = tools.filter((x) => NON_LOCAL_TOOLS[x.key]).map((x) => t(`tool.${x.key}`, locale)).join(', ');
  return text
    .replace('{local}', String(counts.local))
    .replace('{total}', String(counts.total))
    .replace('{exceptions}', exceptions)
    .replace('{limit}', String(DAILY_LIMIT));
}

// /{pl|en}/for-business — a server component: no script, one language in the HTML.
export default function BusinessView({ locale }: { locale: BusinessLocale }) {
  const c = content[locale];
  const fill = (s: string) => fillBusiness(s, locale);
  const muted = { color: 'var(--coffee-text-secondary)' };
  const h2 = 'text-2xl font-bold mb-4';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href={homePath(locale)} className="text-sm text-[var(--coffee-accent-ink)] hover:underline mb-4 inline-block">{t('back.to_home', locale)}</Link>
      <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">{c.title}</h1>
      <p className="text-lg leading-relaxed mb-10" style={muted}>{c.lead}</p>

      <section className="mb-10">
        <h2 className={h2}>{c.whoTitle}</h2>
        <ul className="list-disc ps-6 space-y-2 leading-relaxed" style={muted}>
          {c.who.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className={h2}>{c.filesTitle}</h2>
        <ul className="list-disc ps-6 space-y-3 leading-relaxed" style={muted}>
          {c.files.map((m, i) => <li key={i}>{fill(m)}</li>)}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className={h2}>{c.gdprTitle}</h2>
        <p className="leading-relaxed mb-3" style={muted}>{c.gdpr}</p>
        <p className="text-sm leading-relaxed" style={muted}>
          {c.gdprNote}{' '}
          <Link href={`/${locale}/privacy`} className="link-accent hover:underline">{t('nav.privacy', locale)}</Link>
          {' · '}
          <Link href={`/${locale}/security`} className="link-accent hover:underline">{t('security.link', locale)}</Link>
        </p>
      </section>

      <section className="mb-10">
        <h2 className={h2}>{c.itTitle}</h2>
        <ul className="list-disc ps-6 space-y-3 leading-relaxed mb-3" style={muted}>
          {c.it.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
        <p className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href={`/${locale}/where-your-file-goes`} className="link-accent font-semibold hover:underline">{t('nav.upload_check', locale)}</Link>
          <a href={SOURCE_URL} className="link-accent font-semibold hover:underline" rel="noopener">GitHub</a>
        </p>
      </section>

      <section className="mb-10">
        <h2 className={h2}>{c.toolsTitle}</h2>
        <p className="leading-relaxed mb-4" style={muted}>{c.toolsIntro}</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BUSINESS_TOOLS.map((key) => (
            <li key={key}>
              <a href={toolPath(key, locale)} className="coffee-card flex items-start gap-3 p-4 no-underline h-full">
                <span className="text-2xl shrink-0">{getToolIcon(key)}</span>
                <span>
                  <span className="block font-semibold" style={{ color: 'var(--coffee-text)' }}>{t(`tool.${key}`, locale)}</span>
                  <span className="block text-sm leading-snug" style={muted}>{t(`desc.${key}`, locale)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="leading-relaxed mt-4" style={muted}>
          {c.ksef}{' '}
          <a href={KSEF_PATH} className="link-accent font-semibold hover:underline" hrefLang="pl">KSeF XML → PDF</a>
        </p>
      </section>

      <section className="mb-10">
        <h2 className={h2}>{c.practicalTitle}</h2>
        <ul className="list-disc ps-6 space-y-3 leading-relaxed" style={muted}>
          {c.practical.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className={h2}>{c.limitsTitle}</h2>
        <p className="leading-relaxed" style={muted}>
          {c.limits}{' '}
          <Link href={`/${locale}/about`} className="link-accent hover:underline">{t('nav.about', locale)}</Link>
        </p>
      </section>

      <section className="tool-card rounded-2xl border p-6">
        <h2 className={h2}>{c.contactTitle}</h2>
        <p className="leading-relaxed mb-3" style={muted}>
          {c.contact}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="link-accent font-semibold hover:underline">{CONTACT_EMAIL}</a>
        </p>
        <p className="leading-relaxed" style={muted}>{c.contactIdeas}</p>
      </section>
    </div>
  );
}
