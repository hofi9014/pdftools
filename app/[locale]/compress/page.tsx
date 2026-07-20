import CompressPDF from '../../compress/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleCompressPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <CompressPDF locale={locale as Locale} />;
}

