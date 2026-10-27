import Link from 'next/link';
import guides from '@/content/guides';
import { toolHowToSteps } from '@/content/tool-howto';
import { t, type Locale } from '@/lib/i18n';
import { getLocaleSegment } from '@/lib/guides-slugs';
import { keyBySlug, toolPath, toolProcessing, RELATED_TOOLS } from '@/lib/tools';
import { toolSearchMetadata } from '@/lib/metadata';
import { DAILY_LIMIT } from '@/lib/ai-rate-limit';
import { safeJsonLd } from '@/lib/safe-json-ld';

const SITE = 'https://optimapdf.com';

/** The questions every tool page answers, with the answer that is true for how this tool works. */
export function toolFaq(toolKey: string, locale: Locale): { q: string; a: string }[] {
  const processing = toolProcessing(toolKey);
  const online = processing === 'local' ? '' : ` ${t('toolpage.online_note', locale)}`;
  return [
    { q: t('toolpage.q_free', locale), a: t(`toolpage.a_free_${processing}`, locale, { limit: String(DAILY_LIMIT) }) },
    { q: t('toolpage.q_upload', locale), a: t(`toolpage.a_upload_${processing}`, locale) },
    { q: t('toolpage.q_device', locale), a: t('toolpage.a_device', locale) + online },
  ];
}

/**
 * The text under a tool: how to use it step by step, the three questions people ask before they
 * drop a file in, and the guide for the tool where there is one. A server component, so the page
 * carries only its own language and search engines read it in the HTML. Before, the steps existed
 * only in structured data built in the browser, and a tool page had about thirty words of its own.
 */
export default function ToolGuide({ slug, locale }: { slug: string; locale: Locale }) {
  const key = keyBySlug[slug];
  const steps = key ? toolHowToSteps(slug, locale) : undefined;
  if (!key || !steps) return null;

  const tool = t(`tool.${key}`, locale);
  const heading = t('toolpage.howto_heading', locale, { tool });
  const faq = toolFaq(key, locale);
  const guide = guides.find((g) => g.relatedTool === key);
  const url = `${SITE}/${locale}/${slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${url}#app`,
        name: tool,
        url,
        description: toolSearchMetadata(key, locale).description,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true,
        inLanguage: locale,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'PLN' },
        publisher: { '@id': `${SITE}/#organization` },
      },
      {
        '@type': 'HowTo',
        '@id': `${url}#howto`,
        name: heading,
        inLanguage: locale,
        step: steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, name: text, text, url: `${url}#step-${i + 1}` })),
      },
    ],
  };

  return (
    <section aria-labelledby="tool-howto" className="max-w-3xl mx-auto px-4 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <div
        className="rounded-[20px] border p-6 sm:p-8"
        style={{ backgroundColor: 'var(--coffee-surface-solid)', borderColor: 'var(--coffee-border)', boxShadow: 'var(--coffee-shadow)' }}
      >
        <h2 id="tool-howto" className="text-xl sm:text-2xl font-bold tool-heading mb-5">{heading}</h2>
        <ol role="list" className="space-y-3">
          {steps.map((text, i) => (
            <li key={i} id={`step-${i + 1}`} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: 'var(--coffee-accent-ink)', color: 'var(--coffee-on-accent)' }}
              >
                {i + 1}
              </span>
              <span className="pt-0.5" style={{ color: 'var(--coffee-text)' }}>{text}</span>
            </li>
          ))}
        </ol>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold tool-heading mt-10 mb-4">{t('toolpage.faq_heading', locale)}</h2>
      <dl className="space-y-5">
        {faq.map((item) => (
          <div key={item.q}>
            <dt className="font-semibold" style={{ color: 'var(--coffee-text)' }}>{item.q}</dt>
            <dd className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--coffee-text-secondary)' }}>{item.a}</dd>
          </div>
        ))}
      </dl>

      <h2 className="text-xl sm:text-2xl font-bold tool-heading mt-10 mb-4">{t('toolpage.related_heading', locale)}</h2>
      <ul role="list" className="grid gap-3 sm:grid-cols-3">
        {RELATED_TOOLS[key]!.map((k) => (
          <li key={k}>
            <Link
              href={toolPath(k, locale)}
              className="block h-full rounded-2xl border p-4 transition hover:border-[var(--coffee-accent)]"
              style={{ backgroundColor: 'var(--coffee-surface-solid)', borderColor: 'var(--coffee-border)' }}
            >
              <span className="block font-semibold" style={{ color: 'var(--coffee-accent-ink)' }}>{t(`tool.${k}`, locale)}</span>
              <span className="block mt-1 text-sm" style={{ color: 'var(--coffee-text-secondary)' }}>{t(`desc.${k}`, locale)}</span>
            </Link>
          </li>
        ))}
      </ul>

      {guide && (
        <p className="mt-8">
          <Link
            href={`/guides/${getLocaleSegment(locale)}/${guide.category}/${guide.slug}`}
            className="link-accent font-medium hover:underline"
          >
            📖 {t('toolpage.guide_link', locale, { title: guide.title[locale] || guide.title.en })}
          </Link>
        </p>
      )}
    </section>
  );
}
