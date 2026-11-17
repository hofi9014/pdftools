import UploadComparisonView from '@/components/pages/UploadComparisonView';
import { content } from '@/content/pages/upload-comparison';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const c = content[locale] ?? content.en!;
  return pageMetadata(locale, '/where-your-file-goes', { title: c.seoTitle, description: c.seoDescription });
}

export default async function WhereYourFileGoes({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <UploadComparisonView locale={locale as Locale} />;
}
