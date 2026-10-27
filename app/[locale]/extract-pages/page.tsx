import ExtractPages from '../../(unprefixed)/extract-pages/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/extract-pages');
}

export default async function LocaleExtractPages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <ExtractPages locale={locale as Locale} />
      <ToolGuide slug="extract-pages" locale={locale as Locale} />
    </>
  );
}


