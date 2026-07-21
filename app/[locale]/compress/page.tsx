import CompressPDF from '../../compress/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/compress');
}

export default async function LocaleCompressPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <CompressPDF locale={locale as Locale} />;
}


