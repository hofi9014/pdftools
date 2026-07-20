import JPGToPDF from '../../jpg-to-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleJPGToPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <JPGToPDF locale={locale as Locale} />;
}

