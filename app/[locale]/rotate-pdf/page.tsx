import RotatePDF from '../../rotate-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleRotatePDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RotatePDF locale={locale as Locale} />;
}

