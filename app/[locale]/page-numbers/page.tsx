import PageNumbers from '../../page-numbers/page';
import type { Locale } from '@/lib/i18n';

export default async function LocalePageNumbers({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PageNumbers locale={locale as Locale} />;
}

