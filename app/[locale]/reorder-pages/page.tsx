import ReorderPages from '../../reorder-pages/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/reorder-pages');
}

export default async function LocaleReorderPages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ReorderPages locale={locale as Locale} />;
}


