import { localeFromSegment } from '@/lib/guides-slugs';
import type { Locale } from '@/lib/i18n';
import GuidesLocaleSync from './GuidesLocaleSync';

export default async function GuidesLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeSegment } = await params;
  return (
    <>
      <GuidesLocaleSync locale={localeFromSegment(localeSegment) as Locale} />
      {children}
    </>
  );
}
