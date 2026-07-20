import WatermarkPDF from '../../watermark-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleWatermarkPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <WatermarkPDF locale={locale as Locale} />;
}

