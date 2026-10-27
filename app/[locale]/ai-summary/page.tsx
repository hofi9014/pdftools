import AiSummary from '../../(unprefixed)/ai-summary/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/ai-summary');
}

export default async function LocaleAiSummary({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <AiSummary locale={locale as Locale} />
      <ToolGuide slug="ai-summary" locale={locale as Locale} />
    </>
  );
}


