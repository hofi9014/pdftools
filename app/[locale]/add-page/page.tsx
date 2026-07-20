import AddPage from '../../add-page/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleAddPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AddPage locale={locale as Locale} />;
}

