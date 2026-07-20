import DeletePages from '../../delete-pages/page';
import type { Locale } from '@/lib/i18n';

export default async function LocaleDeletePages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <DeletePages locale={locale as Locale} />;
}

