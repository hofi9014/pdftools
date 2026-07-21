import ExtractPages from '../../extract-pages/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/extract-pages');
}

export default async function LocaleExtractPages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ExtractPages locale={locale as Locale} />;
}


