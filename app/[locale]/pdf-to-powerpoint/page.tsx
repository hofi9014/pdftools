import PDFToPowerPoint from '../../pdf-to-powerpoint/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/pdf-to-powerpoint');
}

export default async function LocalePDFToPowerPoint({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PDFToPowerPoint locale={locale as Locale} />;
}


