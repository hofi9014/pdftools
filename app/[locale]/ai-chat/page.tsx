import AIChat from '../../ai-chat/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/ai-chat');
}

export default async function LocaleAIChat({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AIChat locale={locale as Locale} />;
}


