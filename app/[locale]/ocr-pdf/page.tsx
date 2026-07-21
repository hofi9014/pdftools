import OCRPDF from '../../ocr-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/ocr-pdf');
}

export default async function LocaleOCRPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <OCRPDF locale={locale as Locale} />;
}


