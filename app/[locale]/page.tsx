import Home from '../page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <Home locale={locale as Locale} />;
}
