import OpenOfficeToPDF from '../../openoffice-to-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/openoffice-to-pdf');
}

export default async function LocaleOpenOfficeToPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <OpenOfficeToPDF locale={locale as Locale} />;
}


