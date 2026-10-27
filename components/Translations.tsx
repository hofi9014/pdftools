'use client';
import { use, type ReactNode } from 'react';
import { all, registerMessages, MESSAGES_GLOBAL } from '@/lib/i18n';

// The client JavaScript carries no translations (see lib/i18n.ts). Each page loads its language's
// dictionary as a script, /<locale>/messages.js (lib/i18n-asset.ts), which app/_root/RootDocument.tsx
// loads before hydration; the script fills self.__OPTIMA_I18N[locale]. Registering during render,
// before the children render, means every t() below sees it.

function fromGlobal(locale: string): boolean {
  const loaded = (globalThis as unknown as Record<string, Record<string, Record<string, string>> | undefined>)[MESSAGES_GLOBAL]?.[locale];
  if (loaded) registerMessages(locale, loaded);
  return !!loaded;
}

const pending = new Map<string, Promise<void>>();

/** For a switch to another language without a page load: fetch that language's script first. */
function load(locale: string, src: string): Promise<void> {
  let promise = pending.get(locale);
  if (!promise) {
    promise = new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      // Resolve anyway: t() then reports the missing language once and shows the fallback,
      // instead of the error page.
      script.onerror = () => { pending.delete(locale); resolve(); };
      document.head.appendChild(script);
    }).then(() => { fromGlobal(locale); });
    pending.set(locale, promise);
  }
  return promise;
}

export default function Translations({ locale, src, children }: { locale: string; src: string; children: ReactNode }) {
  // On the server every dictionary is bundled. In the browser the page's own script has already
  // run; only a client-side switch to another language suspends here until its script arrives.
  if (typeof window !== 'undefined' && !all[locale] && !fromGlobal(locale)) use(load(locale, src));
  return children;
}
