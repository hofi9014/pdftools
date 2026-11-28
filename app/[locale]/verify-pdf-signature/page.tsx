import VerifyPdfSignature from '../../(unprefixed)/verify-pdf-signature/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/verify-pdf-signature');
}

export default async function LocaleVerifyPdfSignature({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <VerifyPdfSignature locale={locale as Locale} />
      <ToolGuide slug="verify-pdf-signature" locale={locale as Locale} />
    </>
  );
}
