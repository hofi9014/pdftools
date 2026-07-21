import WatermarkPDF from '../../watermark-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/watermark-pdf');
}

export default async function LocaleWatermarkPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <WatermarkPDF locale={locale as Locale} />;
}


