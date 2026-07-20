import AiSummary from '../../ai-summary/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleAiSummary({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AiSummary locale={locale as Locale} />;
}

