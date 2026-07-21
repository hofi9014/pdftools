import SplitPDF from '../../split/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/split');
}

export default async function LocaleSplit({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <SplitPDF locale={locale as Locale} />;
}

