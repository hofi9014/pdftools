import ComparePDF from '../../compare-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleComparePDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ComparePDF locale={locale as Locale} />;
}

