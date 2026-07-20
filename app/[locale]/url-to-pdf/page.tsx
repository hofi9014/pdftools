import UrlToPdf from '../../url-to-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleUrlToPdf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <UrlToPdf locale={locale as Locale} />;
}

