import RodoPage from '../../rodo/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/rodo');
}

export default async function LocaleRodo({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RodoPage locale={locale as Locale} />;
}

