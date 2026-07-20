import ExtractPages from '../../extract-pages/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleExtractPages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ExtractPages locale={locale as Locale} />;
}

