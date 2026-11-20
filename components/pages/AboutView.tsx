import Link from 'next/link';
import { t, isRtlLocale, type Locale } from '@/lib/i18n';
import { homePath, toolCounts, tools, NON_LOCAL_TOOLS } from '@/lib/tools';
import { DAILY_LIMIT } from '@/lib/ai-limit';
import ocrLanguages from '@/lib/ocr-languages.json';
import { safeJsonLd } from '@/lib/safe-json-ld';
import { content, OWNER_NAME, CONTACT_EMAIL, SOURCE_URL } from '@/content/pages/about';

const SITE = 'https://optimapdf.com';

/** Fills the page's placeholders with numbers and names taken from the code. */
export function fillAbout(text: string, locale: Locale): string {
  const counts = toolCounts(locale);
  const exceptions = tools.filter((x) => NON_LOCAL_TOOLS[x.key]).map((x) => t(`tool.${x.key}`, locale)).join(', ');
  return text
    .replace('{local}', String(counts.local))
    .replace('{total}', String(counts.total))
    .replace('{exceptions}', exceptions)
    .replace('{limit}', String(DAILY_LIMIT))
    .replace('{ocr}', String(ocrLanguages.length))
    .replace('{cookies}', t('cookie.settings', locale));
}

// /{locale}/about — a server component: no script, one language in the HTML.
export default function AboutView({ locale }: { locale: Locale }) {
  const c = content[locale] ?? content.en!;
  const fill = (s: string) => fillAbout(s, locale);
  const muted = { color: 'var(--coffee-text-secondary)' };
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: c.title,
    url: `${SITE}/${locale}/about`,
    inLanguage: locale,
    description: c.seoDescription,
    about: { '@type': 'WebSite', name: 'OptimaPDF', url: SITE },
    author: { '@type': 'Person', name: OWNER_NAME, email: CONTACT_EMAIL },
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir={isRtlLocale(locale) ? 'rtl' : 'ltr'}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Link href={homePath(locale)} className="text-sm text-[var(--coffee-accent-ink)] hover:underline mb-4 inline-block">{t('back.to_home', locale)}</Link>
      <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">{c.title}</h1>
      <p className="text-lg leading-relaxed mb-10" style={muted}>{c.lead}</p>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{c.whyTitle}</h2>
        <figure className="tool-card rounded-2xl border p-6 mb-4">
          <blockquote className="text-lg leading-relaxed">{c.quote}</blockquote>
          <figcaption className="mt-3 text-sm font-semibold" style={muted}>{c.quoteBy}</figcaption>
        </figure>
        <p className="leading-relaxed" style={muted}>{c.why}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{c.whoTitle}</h2>
        <p className="leading-relaxed" style={muted}>
          {c.who}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{c.howTitle}</h2>
        <ul className="list-disc ps-6 space-y-3 leading-relaxed" style={muted}>
          {c.how.map((m, i) => <li key={i}>{fill(m)}</li>)}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{c.verifyTitle}</h2>
        <p className="leading-relaxed mb-3" style={muted}>{c.verify}</p>
        <p className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href={`/${locale}/where-your-file-goes`} className="link-accent font-semibold hover:underline">{t('nav.upload_check', locale)}</Link>
          <a href={SOURCE_URL} className="link-accent font-semibold hover:underline" rel="noopener">{c.codeLink}</a>
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{c.moneyTitle}</h2>
        <p className="leading-relaxed" style={muted}>{c.money}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">{c.limitsTitle}</h2>
        <ul className="list-disc ps-6 space-y-3 leading-relaxed" style={muted}>
          {c.limits.map((m, i) => <li key={i}>{fill(m)}</li>)}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">{c.contactTitle}</h2>
        <p className="leading-relaxed" style={muted}>
          {c.contact}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="link-accent font-semibold hover:underline">{CONTACT_EMAIL}</a>
        </p>
      </section>
    </div>
  );
}
