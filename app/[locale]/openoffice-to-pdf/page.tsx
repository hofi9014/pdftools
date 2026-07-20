import OpenOfficeToPDF from '../../openoffice-to-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleOpenOfficeToPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <OpenOfficeToPDF locale={locale as Locale} />;
}

