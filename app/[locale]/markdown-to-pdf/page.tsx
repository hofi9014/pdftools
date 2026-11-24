import MarkdownToPdf from '../../(unprefixed)/markdown-to-pdf/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import ToolGuide from '@/components/ToolGuide';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/markdown-to-pdf');
}

export default async function LocaleMarkdownToPdf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <MarkdownToPdf locale={locale as Locale} />
      <ToolGuide slug="markdown-to-pdf" locale={locale as Locale} />
    </>
  );
}
