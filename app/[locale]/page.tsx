import HomeView from '@/components/pages/HomeView';
import { homeGuideCards } from '@/lib/guide-cards';
import { localizeData } from '@/lib/localize-data';
import type { Locale } from '@/lib/i18n';

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <HomeView locale={locale as Locale} guides={localizeData(homeGuideCards(), locale as Locale)} />;
}
