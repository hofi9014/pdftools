import PDFToWord from '../../pdf-to-word/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/pdf-to-word');
}

export default async function LocalePDFToWord({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PDFToWord locale={locale as Locale} />;
}


