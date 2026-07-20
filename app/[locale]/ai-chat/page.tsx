import AIChat from '../../ai-chat/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleAIChat({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AIChat locale={locale as Locale} />;
}

