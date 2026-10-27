import ReorderPages from '../../(unprefixed)/reorder-pages/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/reorder-pages');
}

export default async function LocaleReorderPages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <ReorderPages locale={locale as Locale} />
      <ToolGuide slug="reorder-pages" locale={locale as Locale} />
    </>
  );
}


