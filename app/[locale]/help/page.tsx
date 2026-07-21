import HelpPage from '../../help/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/help');
}

export default async function LocaleHelp({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <HelpPage locale={locale as Locale} />;
}

