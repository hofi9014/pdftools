import RulesView from '@/components/pages/RulesView';
import { content } from '@/content/pages/nasze-zasady';
import { localizeData } from '@/lib/localize-data';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/nasze-zasady');
}

export default async function LocaleNaszeZasady({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RulesView locale={locale as Locale} content={localizeData(content, locale as Locale)} />;
}

