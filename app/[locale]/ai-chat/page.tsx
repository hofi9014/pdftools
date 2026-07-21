import AIChat from '../../ai-chat/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/ai-chat');
}

export default async function LocaleAIChat({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AIChat locale={locale as Locale} />;
}


