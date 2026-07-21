import DeletePages from '../../delete-pages/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/delete-pages');
}

export default async function LocaleDeletePages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DeletePages locale={locale as Locale} />;
}


