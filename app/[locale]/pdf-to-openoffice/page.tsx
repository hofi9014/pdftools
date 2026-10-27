import PDFToOpenOffice from '../../(unprefixed)/pdf-to-openoffice/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/pdf-to-openoffice');
}

export default async function LocalePDFToOpenOffice({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PDFToOpenOffice locale={locale as Locale} />
      <ToolGuide slug="pdf-to-openoffice" locale={locale as Locale} />
    </>
  );
}


