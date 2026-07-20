import Metadata from '../../metadata/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <Metadata locale={locale as Locale} />;
}

