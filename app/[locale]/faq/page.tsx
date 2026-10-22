import FaqView from '@/components/pages/FaqView';
import { faqData } from '@/content/pages/faq';
import { localizeData } from '@/lib/localize-data';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/faq');
}

export default async function LocaleFaq({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <FaqView locale={locale as Locale} faqData={localizeData(faqData, locale as Locale)} />;
}

