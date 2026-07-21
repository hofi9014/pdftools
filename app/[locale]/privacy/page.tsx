import PrivacyPage from '../../privacy/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/privacy');
}

export default async function LocalePrivacy({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PrivacyPage locale={locale as Locale} />;
}

