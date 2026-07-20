import ToPdfA from '../../to-pdfa/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleToPdfA({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ToPdfA locale={locale as Locale} />;
}

