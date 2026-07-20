import RedactPdf from '../../redact-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleRedactPdf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RedactPdf locale={locale as Locale} />;
}

