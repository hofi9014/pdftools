import PDFToTxt from '../../pdf-to-txt/page';
import type { Locale } from '@/lib/i18n';

export default async function LocalePDFToTxt({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PDFToTxt locale={locale as Locale} />;
}

