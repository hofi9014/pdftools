import CropPDF from '../../crop-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleCropPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <CropPDF locale={locale as Locale} />;
}

