import PDFToWord from '../../pdf-to-word/page';
import type { Locale } from '@/lib/i18n';

export default async function LocalePDFToWord({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PDFToWord locale={locale as Locale} />;
}

