import PdfToImages from '../../pdf-to-images/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/pdf-to-images');
}

export default async function LocalePdfToImages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PdfToImages locale={locale as Locale} />;
}


