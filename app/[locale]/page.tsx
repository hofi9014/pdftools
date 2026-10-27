import HomeView from '@/components/pages/HomeView';
import { homeGuideCards } from '@/lib/guide-cards';
import { localizeData } from '@/lib/localize-data';
import type { Locale } from '@/lib/i18n';
import { siteJsonLd } from '@/lib/site-schema';
import { safeJsonLd } from '@/lib/safe-json-ld';

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(siteJsonLd(locale as Locale)) }} />
      <HomeView locale={locale as Locale} guides={localizeData(homeGuideCards(), locale as Locale)} />
    </>
  );
}
