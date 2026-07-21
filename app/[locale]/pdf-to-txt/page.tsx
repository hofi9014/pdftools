import PDFToTxt from '../../pdf-to-txt/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/pdf-to-txt');
}

export default async function LocalePDFToTxt({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PDFToTxt locale={locale as Locale} />;
}


