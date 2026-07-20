import FillForm from '../../fill-form/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleFillForm({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <FillForm locale={locale as Locale} />;
}

