import OCRPDF from '../../ocr-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleOCRPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <OCRPDF locale={locale as Locale} />;
}

