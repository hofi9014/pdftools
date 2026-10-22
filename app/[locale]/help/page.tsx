import HelpView from '@/components/pages/HelpView';
import { helpData } from '@/content/pages/help';
import { localizeData } from '@/lib/localize-data';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/help');
}

export default async function LocaleHelp({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <HelpView locale={locale as Locale} helpData={localizeData(helpData, locale as Locale)} />;
}

