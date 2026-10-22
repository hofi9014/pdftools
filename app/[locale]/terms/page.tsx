import TermsView from '@/components/pages/TermsView';
import { content } from '@/content/pages/terms';
import { localizeData } from '@/lib/localize-data';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/terms');
}

export default async function LocaleTerms({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <TermsView locale={locale as Locale} content={localizeData(content, locale as Locale)} />;
}

