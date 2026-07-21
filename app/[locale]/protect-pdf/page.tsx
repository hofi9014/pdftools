import ProtectPDF from '../../protect-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/protect-pdf');
}

export default async function LocaleProtectPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ProtectPDF locale={locale as Locale} />;
}


