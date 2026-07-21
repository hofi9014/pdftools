import PdfToEpub from '../../pdf-to-epub/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/pdf-to-epub');
}

export default async function LocalePdfToEpub({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PdfToEpub locale={locale as Locale} />;
}


