import SecurityPage from '../../security/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/security');
}

export default async function LocaleSecurity({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <SecurityPage locale={locale as Locale} />;
}

