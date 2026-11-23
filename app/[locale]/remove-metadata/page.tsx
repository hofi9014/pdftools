import RemoveMetadata from '../../(unprefixed)/remove-metadata/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/remove-metadata');
}

export default async function LocaleRemoveMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <RemoveMetadata locale={locale as Locale} />
      <ToolGuide slug="remove-metadata" locale={locale as Locale} />
    </>
  );
}
