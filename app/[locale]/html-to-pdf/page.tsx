import HtmlToPdf from '../../html-to-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/html-to-pdf');
}

export default async function LocaleHtmlToPdf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <HtmlToPdf locale={locale as Locale} />;
}


