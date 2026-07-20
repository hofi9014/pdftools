import HtmlToPdf from '../../html-to-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleHtmlToPdf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <HtmlToPdf locale={locale as Locale} />;
}

