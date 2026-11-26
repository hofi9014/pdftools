'use client';
import ImposeTool from '@/components/ImposeTool';
import type { Locale } from '@/lib/i18n';

export default function PagesPerSheet({ locale }: { locale?: Locale } = {}) {
  return <ImposeTool mode="nup" locale={locale} />;
}
