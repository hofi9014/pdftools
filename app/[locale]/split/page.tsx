import SplitPDF from '../../split/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/split');
}

export default async function LocaleSplit({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <SplitPDF locale={locale as Locale} />;
}

