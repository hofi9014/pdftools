import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, t, type Locale } from '@/lib/i18n';
import RootDocument from '@/app/_root/RootDocument';
import { rootMetadata } from '@/lib/root-metadata';
import { socialMetadata } from '@/lib/metadata';

const baseUrl = 'https://optimapdf.com';


export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = `${baseUrl}/${l}`;
  }
  languages['x-default'] = `${baseUrl}/en`;
  // The home page has no metadata of its own: its title, description and link preview are these,
  // in the language of the address (before, /pl, /de, … all said "Free online PDF tools").
  const known = (locales as readonly string[]).includes(locale) ? (locale as Locale) : 'en';
  const title = t('meta.title', known);
  const description = t('meta.description', known);
  return {
    ...rootMetadata,
    title: { default: title, template: '%s | OptimaPDF' },
    description,
    ...socialMetadata({ locale: known, title, description, url: `${baseUrl}/${known}` }),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages,
    },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Any single-path-segment request that doesn't match a more specific static route
  // (bots probing /wp-admin, /.env, etc.) falls through to this dynamic [locale]
  // segment, outside generateStaticParams' 16 locales — Next.js then renders it live
  // instead of serving a prebuilt file, which crashed with an unvalidated `locale`
  // cast. Confirmed root cause of the "/[locale] 100% errors" in Observability:
  // reproduced live on production (GET /xx -> 500, ~2.3s) before this fix.
  // See AUDYT-BEZPIECZENSTWA.md, Drobne obserwacje.
  // This check is also why there is no `dynamicParams = false` here (removed 2026-10-22): with it
  // Next 16.4.2 answered /xx with HTTP 500 (NoFallbackError). Unknown single segments are sent
  // to the 404 page by proxy.ts; addresses it does not see (/.env) end here with a 404.
  if (!(locales as readonly string[]).includes(locale)) {
    notFound();
  }
  // Root layout: the language comes from the URL, so the server HTML carries the right lang/dir.
  return <RootDocument locale={locale as Locale}>{children}</RootDocument>;
}
