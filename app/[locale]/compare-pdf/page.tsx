import ComparePDF from '../../(unprefixed)/compare-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/compare-pdf');
}

export default async function LocaleComparePDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <ComparePDF locale={locale as Locale} />
      <ToolGuide slug="compare-pdf" locale={locale as Locale} />
    </>
  );
}


