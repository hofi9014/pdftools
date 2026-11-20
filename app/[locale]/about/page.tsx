import AboutView from '@/components/pages/AboutView';
import { content } from '@/content/pages/about';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const c = content[locale] ?? content.en!;
  return pageMetadata(locale, '/about', { title: c.seoTitle, description: c.seoDescription });
}

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AboutView locale={locale as Locale} />;
}
