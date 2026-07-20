import PDFToOpenOffice from '../../pdf-to-openoffice/page';
import type { Locale } from '@/lib/i18n';

export default async function LocalePDFToOpenOffice({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PDFToOpenOffice locale={locale as Locale} />;
}

