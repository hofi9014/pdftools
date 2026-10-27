import EditPdfPage from '../../(unprefixed)/edit-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/edit-pdf');
}

export default async function LocaleEditPdfPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <EditPdfPage locale={locale as Locale} />
      <ToolGuide slug="edit-pdf" locale={locale as Locale} />
    </>
  );
}


