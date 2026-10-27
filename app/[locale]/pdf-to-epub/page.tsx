import PdfToEpub from '../../(unprefixed)/pdf-to-epub/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/pdf-to-epub');
}

export default async function LocalePdfToEpub({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PdfToEpub locale={locale as Locale} />
      <ToolGuide slug="pdf-to-epub" locale={locale as Locale} />
    </>
  );
}


