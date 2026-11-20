// /{pl|en}/for-business — the page the owner sends to companies. Polish and English only.
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BusinessView from '@/components/pages/BusinessView';
import { content, BUSINESS_LOCALES, type BusinessLocale } from '@/content/pages/business';
import { socialMetadata, fullTitle } from '@/lib/metadata';

const SITE = 'https://optimapdf.com';
const isBusinessLocale = (l: string): l is BusinessLocale => (BUSINESS_LOCALES as readonly string[]).includes(l);

export function generateStaticParams() {
  return BUSINESS_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isBusinessLocale(locale)) notFound();
  const c = content[locale];
  const url = `${SITE}/${locale}/for-business`;
  return {
    title: c.seoTitle,
    description: c.seoDescription,
    alternates: { canonical: url, languages: { pl: `${SITE}/pl/for-business`, en: `${SITE}/en/for-business`, 'x-default': `${SITE}/en/for-business` } },
    ...socialMetadata({ locale, title: fullTitle(c.seoTitle), description: c.seoDescription, url }),
  };
}

export default async function ForBusiness({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isBusinessLocale(locale)) notFound();
  return <BusinessView locale={locale} />;
}
