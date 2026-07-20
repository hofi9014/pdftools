import PdfToImages from '../../pdf-to-images/page';
import type { Locale } from '@/lib/i18n';

export default async function LocalePdfToImages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PdfToImages locale={locale as Locale} />;
}

