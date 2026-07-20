import AiTranslate from '../../ai-translate/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleAiTranslate({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AiTranslate locale={locale as Locale} />;
}

