import GrayscalePdf from '../../(unprefixed)/grayscale-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/grayscale-pdf');
}

export default async function LocaleGrayscalePdf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <GrayscalePdf locale={locale as Locale} />
      <ToolGuide slug="grayscale-pdf" locale={locale as Locale} />
    </>
  );
}
