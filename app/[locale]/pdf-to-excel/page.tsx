import PdfToExcel from '../../(unprefixed)/pdf-to-excel/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/pdf-to-excel');
}

export default async function LocalePdfToExcel({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PdfToExcel locale={locale as Locale} />
      <ToolGuide slug="pdf-to-excel" locale={locale as Locale} />
    </>
  );
}


