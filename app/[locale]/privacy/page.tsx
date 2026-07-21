import PrivacyPage from '../../privacy/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/privacy');
}

export default async function LocalePrivacy({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PrivacyPage locale={locale as Locale} />;
}

