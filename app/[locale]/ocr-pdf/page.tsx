import OCRPDF from '../../(unprefixed)/ocr-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/ocr-pdf');
}

export default async function LocaleOCRPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <OCRPDF locale={locale as Locale} />
      <ToolGuide slug="ocr-pdf" locale={locale as Locale} />
    </>
  );
}


