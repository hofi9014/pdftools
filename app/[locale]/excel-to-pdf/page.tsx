import ExcelToPDF from '../../excel-to-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleExcelToPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ExcelToPDF locale={locale as Locale} />;
}

