import PdfToHtml from '../../pdf-to-html/page';
import type { Locale } from '@/lib/i18n';

export default async function LocalePdfToHtml({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PdfToHtml locale={locale as Locale} />;
}

