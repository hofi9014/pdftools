import WatermarkPDF from '../../(unprefixed)/watermark-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/watermark-pdf');
}

export default async function LocaleWatermarkPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <WatermarkPDF locale={locale as Locale} />
      <ToolGuide slug="watermark-pdf" locale={locale as Locale} />
    </>
  );
}


