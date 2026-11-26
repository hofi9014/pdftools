import PagesPerSheet from '../../(unprefixed)/pages-per-sheet/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/pages-per-sheet');
}

export default async function LocalePagesPerSheet({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PagesPerSheet locale={locale as Locale} />
      <ToolGuide slug="pages-per-sheet" locale={locale as Locale} />
    </>
  );
}
