import JPGToPDF from '../../(unprefixed)/jpg-to-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/jpg-to-pdf');
}

export default async function LocaleJPGToPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <JPGToPDF locale={locale as Locale} />
      <ToolGuide slug="jpg-to-pdf" locale={locale as Locale} />
    </>
  );
}


