import GuidePage from '../../guide/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/guide');
}

export default async function LocaleGuide({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <GuidePage locale={locale as Locale} />;
}

