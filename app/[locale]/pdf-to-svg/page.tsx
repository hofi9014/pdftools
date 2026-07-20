import PdfToSvg from '../../pdf-to-svg/page';
import type { Locale } from '@/lib/i18n';

export default async function LocalePdfToSvg({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PdfToSvg locale={locale as Locale} />;
}

