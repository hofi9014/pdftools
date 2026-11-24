import AddQrCodeToPdf from '../../(unprefixed)/add-qr-code-to-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/add-qr-code-to-pdf');
}

export default async function LocaleAddQrCodeToPdf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <AddQrCodeToPdf locale={locale as Locale} />
      <ToolGuide slug="add-qr-code-to-pdf" locale={locale as Locale} />
    </>
  );
}
