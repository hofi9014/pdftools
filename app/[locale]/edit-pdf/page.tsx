import EditPdfPage from '../../edit-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleEditPdfPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <EditPdfPage locale={locale as Locale} />;
}

