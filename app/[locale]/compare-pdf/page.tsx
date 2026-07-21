import ComparePDF from '../../compare-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/compare-pdf');
}

export default async function LocaleComparePDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ComparePDF locale={locale as Locale} />;
}


