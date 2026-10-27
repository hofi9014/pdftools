import { t, type Locale } from '@/lib/i18n';

const SITE = 'https://optimapdf.com';

/**
 * Who runs the site and what it is, for search engines: the Organization (name, logo, contact —
 * the same address as /.well-known/security.txt) and the WebSite in the page's language. Tool
 * pages point their WebApplication's publisher at the Organization's @id.
 */
export function siteJsonLd(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE}/#organization`,
        name: 'OptimaPDF',
        url: `${SITE}/`,
        logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-512x512.png`, width: 512, height: 512 },
        email: 'kontakt@optimapdf.com',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}/${locale}#website`,
        name: 'OptimaPDF',
        url: `${SITE}/${locale}`,
        description: t('meta.description', locale),
        inLanguage: locale,
        publisher: { '@id': `${SITE}/#organization` },
      },
    ],
  };
}
