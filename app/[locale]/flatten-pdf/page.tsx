import FlattenPdf from '../../flatten-pdf/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleFlattenPdf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <FlattenPdf locale={locale as Locale} />;
}

