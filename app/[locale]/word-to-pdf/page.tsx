import WordToPDF from '../../word-to-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/word-to-pdf');
}

export default async function LocaleWordToPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <WordToPDF locale={locale as Locale} />;
}


