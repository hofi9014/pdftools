import SearchPdf from '../../(unprefixed)/search-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/search-pdf');
}

export default async function LocaleSearchPdf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <SearchPdf locale={locale as Locale} />
      <ToolGuide slug="search-pdf" locale={locale as Locale} />
    </>
  );
}
