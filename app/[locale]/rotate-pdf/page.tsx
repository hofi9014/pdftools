import RotatePDF from '../../rotate-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/rotate-pdf');
}

export default async function LocaleRotatePDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RotatePDF locale={locale as Locale} />;
}


