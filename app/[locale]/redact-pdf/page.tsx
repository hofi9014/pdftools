import RedactPdf from '../../redact-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/redact-pdf');
}

export default async function LocaleRedactPdf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RedactPdf locale={locale as Locale} />;
}


