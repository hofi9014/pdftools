import UnlockPDF from '../../unlock-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleUnlockPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <UnlockPDF locale={locale as Locale} />;
}

