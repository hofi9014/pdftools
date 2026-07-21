import AiTranslate from '../../ai-translate/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/ai-translate');
}

export default async function LocaleAiTranslate({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AiTranslate locale={locale as Locale} />;
}


