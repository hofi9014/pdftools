'use client';
import { useLocale } from '@/lib/locale-context';
import type { Locale } from '@/lib/i18n';
import LegalDocument from '@/components/LegalDocument';
import { legalFor } from '@/lib/legal';

// The text lives in lib/legal/<locale>.ts (see lib/legal/types.ts for why).
export default function RodoPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  return <LegalDocument doc={legalFor(locale).rodo} icon="🛡️" locale={locale} />;
}
