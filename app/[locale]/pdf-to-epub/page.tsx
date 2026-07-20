import PdfToEpub from '../../pdf-to-epub/page';
import type { Locale } from '@/lib/i18n';

export default async function LocalePdfToEpub({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PdfToEpub locale={locale as Locale} />;
}

