import MergePDF from '../../merge/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/merge');
}

export default async function LocaleMerge({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <MergePDF locale={locale as Locale} />;
}

