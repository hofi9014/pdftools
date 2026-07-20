import WordToPDF from '../../word-to-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleWordToPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <WordToPDF locale={locale as Locale} />;
}

