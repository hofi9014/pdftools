import PdfToExcel from '../../pdf-to-excel/page';
import type { Locale } from '@/lib/i18n';

export default async function LocalePdfToExcel({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PdfToExcel locale={locale as Locale} />;
}

