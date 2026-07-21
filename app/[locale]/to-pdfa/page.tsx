import ToPdfA from '../../to-pdfa/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/to-pdfa');
}

export default async function LocaleToPdfA({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ToPdfA locale={locale as Locale} />;
}


