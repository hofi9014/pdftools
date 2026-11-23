import MakePdfFillable from '../../(unprefixed)/make-pdf-fillable/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/make-pdf-fillable');
}

export default async function LocaleMakePdfFillable({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <MakePdfFillable locale={locale as Locale} />
      <ToolGuide slug="make-pdf-fillable" locale={locale as Locale} />
    </>
  );
}
