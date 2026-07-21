import PdfToSvg from '../../pdf-to-svg/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/pdf-to-svg');
}

export default async function LocalePdfToSvg({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PdfToSvg locale={locale as Locale} />;
}


