import UnlockPDF from '../../unlock-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/unlock-pdf');
}

export default async function LocaleUnlockPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <UnlockPDF locale={locale as Locale} />;
}


