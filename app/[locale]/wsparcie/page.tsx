import SupportView from '@/components/pages/SupportView';
import { content } from '@/content/pages/wsparcie';
import { localizeData } from '@/lib/localize-data';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/wsparcie');
}

export default async function LocaleWsparcie({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <SupportView locale={locale as Locale} content={localizeData(content, locale as Locale)} />;
}

