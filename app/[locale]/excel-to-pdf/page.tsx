import ExcelToPDF from '../../(unprefixed)/excel-to-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/excel-to-pdf');
}

export default async function LocaleExcelToPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <ExcelToPDF locale={locale as Locale} />
      <ToolGuide slug="excel-to-pdf" locale={locale as Locale} />
    </>
  );
}


