// The Polish KSeF guide (content/pages/ksef-guide.ts) — a server component, so the whole text is in
// the HTML, with Article, FAQPage and BreadcrumbList data built from the same text.
import Image from 'next/image';
import { safeJsonLd } from '@/lib/safe-json-ld';
import { getToolIcon } from '@/lib/icons';
import { KSEF_GUIDE_CRUMB, KSEF_TOOL_NAME } from '@/lib/ksef/route';
import {
  KSEF_GUIDE_BODY, KSEF_GUIDE_DESCRIPTION, KSEF_GUIDE_FAQ, KSEF_GUIDE_LEAD, KSEF_GUIDE_PATH, KSEF_GUIDE_PUBLISHED,
  KSEF_GUIDE_SOURCES, KSEF_GUIDE_TITLE, KSEF_GUIDE_UPDATED, KSEF_PATH, type GuideInline,
} from '@/content/pages/ksef-guide';

const SITE = 'https://optimapdf.com';

function Inline({ parts }: { parts: GuideInline[] }) {
  return (
    <>
      {parts.map((p, i) => (typeof p === 'string'
        ? <span key={i}>{p}</span>
        : <a key={i} href={p.href} className="link-accent underline" rel="noopener" target="_blank">{p.text}</a>))}
    </>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export default function KsefArticle() {
  const url = `${SITE}${KSEF_GUIDE_PATH}`;
  const images = KSEF_GUIDE_BODY.flatMap((b) => (b.t === 'figure' ? [`${SITE}${b.src}`] : []));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: KSEF_GUIDE_TITLE,
        description: KSEF_GUIDE_DESCRIPTION,
        inLanguage: 'pl',
        datePublished: KSEF_GUIDE_PUBLISHED,
        dateModified: KSEF_GUIDE_UPDATED,
        image: images,
        mainEntityOfPage: url,
        author: { '@id': `${SITE}/#organization` },
        publisher: { '@id': `${SITE}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumbs`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Strona główna', item: `${SITE}/pl` },
          { '@type': 'ListItem', position: 2, name: KSEF_TOOL_NAME, item: `${SITE}${KSEF_PATH}` },
          { '@type': 'ListItem', position: 3, name: KSEF_GUIDE_CRUMB, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        inLanguage: 'pl',
        mainEntity: KSEF_GUIDE_FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };

  const text = { color: 'var(--coffee-text)' };
  const muted = { color: 'var(--coffee-text-secondary)' };

  return (
    <article className="ksef-article max-w-3xl mx-auto px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-4">{KSEF_GUIDE_TITLE}</h1>
        <p className="text-base sm:text-lg leading-relaxed" style={muted}>{KSEF_GUIDE_LEAD}</p>
        <p className="mt-3 text-sm" style={muted}>
          Aktualizacja: <time dateTime={KSEF_GUIDE_UPDATED}>{formatDate(KSEF_GUIDE_UPDATED)}</time>
        </p>
      </header>

      <nav aria-labelledby="ksef-toc" className="ksef-toc rounded-2xl border p-5 mb-10">
        <h2 id="ksef-toc" className="text-base font-bold mb-2" style={text}>Spis treści</h2>
        <ol className="list-decimal ps-5 space-y-1 text-sm">
          {KSEF_GUIDE_BODY.flatMap((b) => (b.t === 'h2' ? [<li key={b.id}><a className="link-accent" href={`#${b.id}`}>{b.text}</a></li>] : []))}
          <li><a className="link-accent" href="#pytania">Najczęstsze pytania</a></li>
        </ol>
      </nav>

      <div className="space-y-5 leading-relaxed" style={text}>
        {KSEF_GUIDE_BODY.map((b, i) => {
          switch (b.t) {
            case 'h2':
              return <h2 key={i} id={b.id} className="text-xl sm:text-2xl font-bold tool-heading pt-6 scroll-mt-20">{b.text}</h2>;
            case 'p':
              return <p key={i}><Inline parts={b.parts} /></p>;
            case 'ul':
              return (
                <ul key={i} className="list-disc ps-6 space-y-2">
                  {b.items.map((parts, j) => <li key={j}><Inline parts={parts} /></li>)}
                </ul>
              );
            case 'steps':
              return (
                <ol key={i} role="list" className="space-y-4">
                  {b.items.map((s, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <span aria-hidden="true" className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'var(--coffee-accent-ink)', color: 'var(--coffee-on-accent)' }}>{j + 1}</span>
                      <span className="pt-0.5">
                        <strong className="block">{s.title}</strong>
                        <span style={muted}>{s.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              );
            case 'figure':
              return (
                <figure key={i} className="my-6">
                  <Image src={b.src} alt={b.alt} width={b.width} height={b.height} unoptimized
                    className="w-full h-auto rounded-xl border" style={{ borderColor: 'var(--coffee-border)' }} sizes="(max-width: 768px) 100vw, 720px" loading="lazy" />
                  <figcaption className="mt-2 text-sm" style={muted}>{b.caption}</figcaption>
                </figure>
              );
            case 'table':
              return (
                <div key={i} className="ksef-table-wrap">
                  <table className="ksef-table">
                    <caption className="sr-only">{b.caption}</caption>
                    <thead><tr>{b.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                    <tbody>{b.rows.map((r) => <tr key={r[0]}>{r.map((c, k) => (k === 0 ? <th key={k} scope="row">{c}</th> : <td key={k}>{c}</td>))}</tr>)}</tbody>
                  </table>
                </div>
              );
            case 'cta':
              return (
                <p key={i} className="py-2">
                  <a href={KSEF_PATH} className="btn-accent inline-flex items-center gap-2 no-underline">
                    <span aria-hidden="true">{getToolIcon('ksef')}</span>{b.text}
                  </a>
                </p>
              );
          }
        })}
      </div>

      <h2 id="pytania" className="text-xl sm:text-2xl font-bold tool-heading mt-12 mb-4 scroll-mt-20">Najczęstsze pytania</h2>
      <dl className="space-y-5">
        {KSEF_GUIDE_FAQ.map((f) => (
          <div key={f.q}>
            <dt className="font-semibold" style={text}>{f.q}</dt>
            <dd className="mt-1 leading-relaxed" style={muted}>{f.a}</dd>
          </div>
        ))}
      </dl>

      <h2 className="text-lg font-bold tool-heading mt-12 mb-3">Źródła</h2>
      <ul className="list-disc ps-6 space-y-1 text-sm" style={muted}>
        {KSEF_GUIDE_SOURCES.map((s) => <li key={s.href}><a className="link-accent underline" href={s.href} rel="noopener" target="_blank">{s.text}</a></li>)}
      </ul>
    </article>
  );
}
