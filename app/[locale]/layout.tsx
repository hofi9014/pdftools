import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales } from '@/lib/i18n';

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
  return {
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
  return <>{children}</>;
}
