import FillForm from '../../fill-form/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/fill-form');
}

export default async function LocaleFillForm({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <FillForm locale={locale as Locale} />;
}


