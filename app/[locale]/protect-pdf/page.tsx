import ProtectPDF from '../../protect-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleProtectPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ProtectPDF locale={locale as Locale} />;
}

