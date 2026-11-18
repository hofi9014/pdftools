// The text under the KSeF tool: three steps, what it does not do, the questions people ask, and
// the structured data (WebApplication, FAQPage, BreadcrumbList) built from the same text.
// A server component, so search engines read it in the HTML.
import { safeJsonLd } from '@/lib/safe-json-ld';
import ToolGlyph from '@/components/ToolGlyph';
import { KSEF_DESCRIPTION, KSEF_FAQ, KSEF_LIMITS, KSEF_SLUG, KSEF_SOURCE_URL, KSEF_STEPS, KSEF_TOOL_NAME } from '@/content/pages/ksef';

const SITE = 'https://optimapdf.com';

export default function KsefGuide() {
  const url = `${SITE}/pl/${KSEF_SLUG}`;
  const heading = 'Jak zamienić plik XML z KSeF na PDF';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${url}#app`,
        name: KSEF_TOOL_NAME,
        url,
        description: KSEF_DESCRIPTION,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true,
        inLanguage: 'pl',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'PLN' },
        publisher: { '@id': `${SITE}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumbs`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Strona główna', item: `${SITE}/pl` },
          { '@type': 'ListItem', position: 2, name: KSEF_TOOL_NAME, item: url },
        ],
      },
      {
        '@type': 'HowTo',
        '@id': `${url}#howto`,
        name: heading,
        inLanguage: 'pl',
        step: KSEF_STEPS.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, name: text, text, url: `${url}#step-${i + 1}` })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        inLanguage: 'pl',
        mainEntity: KSEF_FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };

  return (
    <section aria-labelledby="ksef-howto" className="max-w-4xl mx-auto px-4 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <div className="rounded-[20px] border p-6 sm:p-8" style={{ backgroundColor: 'var(--coffee-surface-solid)', borderColor: 'var(--coffee-border)', boxShadow: 'var(--coffee-shadow)' }}>
        <h2 id="ksef-howto" className="text-xl sm:text-2xl font-bold tool-heading mb-5">{heading}</h2>
        <ol role="list" className="space-y-3">
          {KSEF_STEPS.map((text, i) => (
            <li key={i} id={`step-${i + 1}`} className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'var(--coffee-accent-ink)', color: 'var(--coffee-on-accent)' }}>{i + 1}</span>
              <span className="pt-0.5" style={{ color: 'var(--coffee-text)' }}>{text}</span>
            </li>
          ))}
        </ol>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold tool-heading mt-10 mb-4">Czego to narzędzie nie robi</h2>
      <ul role="list" className="space-y-2">
        {KSEF_LIMITS.map((text) => (
          <li key={text} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: 'var(--coffee-text-secondary)' }}>
            <span aria-hidden="true" className="mt-1.5 shrink-0"><ToolGlyph name="info" /></span>
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <h2 className="text-xl sm:text-2xl font-bold tool-heading mt-10 mb-4">Najczęstsze pytania</h2>
      <dl className="space-y-5">
        {KSEF_FAQ.map((item) => (
          <div key={item.q}>
            <dt className="font-semibold" style={{ color: 'var(--coffee-text)' }}>{item.q}</dt>
            <dd className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--coffee-text-secondary)' }}>{item.a}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-sm" style={{ color: 'var(--coffee-text-secondary)' }}>
        Terminy wdrożenia KSeF: <a className="link-accent underline" href={KSEF_SOURCE_URL} rel="noopener" target="_blank">Ministerstwo Finansów – etapy wdrożenia KSeF 2.0</a>.
      </p>
    </section>
  );
}
