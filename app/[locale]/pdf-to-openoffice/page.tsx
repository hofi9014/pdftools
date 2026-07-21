import PDFToOpenOffice from '../../pdf-to-openoffice/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/pdf-to-openoffice');
}

export default async function LocalePDFToOpenOffice({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PDFToOpenOffice locale={locale as Locale} />;
}


