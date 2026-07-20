import SplitPDF from '../../split/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleSplit({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <SplitPDF locale={locale as Locale} />;
}
