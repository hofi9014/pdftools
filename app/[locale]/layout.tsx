import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n';
import RootDocument from '@/app/_root/RootDocument';
import { rootMetadata } from '@/lib/root-metadata';

const baseUrl = 'https://optimapdf.com';

// Only the 16 languages exist: anything else in this position (/xx, /wp-admin) is an unknown
// address and gets the site's 404 page (app/global-not-found.tsx), not a page rendered on demand.
export const dynamicParams = false;

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
  return {
    ...rootMetadata,
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
  if (!(locales as readonly string[]).includes(locale)) {
    notFound();
  }
  // Root layout: the language comes from the URL, so the server HTML carries the right lang/dir.
  return <RootDocument locale={locale as Locale}>{children}</RootDocument>;
}
