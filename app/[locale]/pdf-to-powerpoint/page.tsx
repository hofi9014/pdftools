import PDFToPowerPoint from '../../pdf-to-powerpoint/page';
import type { Locale } from '@/lib/i18n';

export default async function LocalePDFToPowerPoint({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PDFToPowerPoint locale={locale as Locale} />;
}

