import PageNumbers from '../../page-numbers/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/page-numbers');
}

export default async function LocalePageNumbers({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PageNumbers locale={locale as Locale} />;
}


