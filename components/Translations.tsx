'use client';
import type { ReactNode } from 'react';
import { registerMessages } from '@/lib/i18n';

/**
 * Gives the browser the page's dictionary. The client JavaScript carries no translations (see
 * lib/i18n.ts); app/_root/RootDocument.tsx passes this page's language as data. Registering
 * during render, before the children render, means every t() below sees it — on the first
 * render, during hydration and after a client-side switch to another language (the layout
 * renders again with the new dictionary).
 */
export default function Translations({ locale, messages, children }: { locale: string; messages: Record<string, string>; children: ReactNode }) {
  registerMessages(locale, messages);
  return children;
}
