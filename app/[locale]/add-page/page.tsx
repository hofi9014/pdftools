import AddPage from '../../(unprefixed)/add-page/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/add-page');
}

export default async function LocaleAddPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <AddPage locale={locale as Locale} />
      <ToolGuide slug="add-page" locale={locale as Locale} />
    </>
  );
}


