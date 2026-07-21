import PdfToHtml from '../../pdf-to-html/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/pdf-to-html');
}

export default async function LocalePdfToHtml({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PdfToHtml locale={locale as Locale} />;
}


