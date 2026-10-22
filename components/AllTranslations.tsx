'use client';
import type { ReactNode } from 'react';
import { registerMessages } from '@/lib/i18n';
import { all } from '@/lib/translations/bundle';

// Pages whose language is known only in the browser — the addresses without a language prefix
// (proxy.ts redirects them, so they are rarely served) and the 404 page — follow the visitor's
// stored choice, which can be any language, so they load all 16. Every other page loads one.
for (const [locale, messages] of Object.entries(all)) registerMessages(locale, messages);

export default function AllTranslations({ children }: { children: ReactNode }) {
  return children;
}
