import UrlToPdf from '../../url-to-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/url-to-pdf');
}

export default async function LocaleUrlToPdf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <UrlToPdf locale={locale as Locale} />;
}


