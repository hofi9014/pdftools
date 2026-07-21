import GuidePage from '../../guide/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/guide');
}

export default async function LocaleGuide({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <GuidePage locale={locale as Locale} />;
}

