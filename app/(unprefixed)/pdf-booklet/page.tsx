'use client';
import ImposeTool from '@/components/ImposeTool';
import type { Locale } from '@/lib/i18n';

export default function PdfBooklet({ locale }: { locale?: Locale } = {}) {
  return <ImposeTool mode="booklet" locale={locale} />;
}
