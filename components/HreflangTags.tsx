'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const LOCALES = ['ar', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'is', 'it', 'ja', 'no', 'pl', 'pt', 'sv', 'tr', 'zh'];
const BASE = 'https://optimapdf.com';

export default function HreflangTags() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/guides/') || pathname.startsWith('/_not-found')) return;

    document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]').forEach(el => {
      if (el.parentNode !== document.head) {
        document.head.appendChild(el);
      }
    });
  }, [pathname]);

  if (pathname.startsWith('/guides/') || pathname.startsWith('/_not-found')) return null;

  const url = BASE + (pathname === '/' ? '' : pathname.replace(/\/$/, ''));

  return (
    <>
      {LOCALES.map(locale => (
        <link key={locale} {...{ rel: 'alternate', hreflang: locale, href: url } as any} />
      ))}
      <link key="x-default" {...{ rel: 'alternate', hreflang: 'x-default', href: url } as any} />
    </>
  );
}
