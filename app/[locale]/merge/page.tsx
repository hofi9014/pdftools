import MergePDF from '../../merge/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleMerge({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <MergePDF locale={locale as Locale} />;
}
