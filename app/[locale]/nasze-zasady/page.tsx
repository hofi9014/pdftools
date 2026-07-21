import RulesPage from '../../nasze-zasady/page';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/nasze-zasady');
}

export default async function LocaleNaszeZasady({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RulesPage locale={locale as Locale} />;
}

