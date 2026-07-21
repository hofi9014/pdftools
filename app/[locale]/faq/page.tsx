import FaqPage from '../../faq/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/faq');
}

export default async function LocaleFaq({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <FaqPage locale={locale as Locale} />;
}

