import SignPdf from '../../sign-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleSignPdf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <SignPdf locale={locale as Locale} />;
}

