import ReorderPages from '../../reorder-pages/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleReorderPages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ReorderPages locale={locale as Locale} />;
}

