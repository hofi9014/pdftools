import CropPDF from '../../crop-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/crop-pdf');
}

export default async function LocaleCropPDF({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <CropPDF locale={locale as Locale} />;
}


