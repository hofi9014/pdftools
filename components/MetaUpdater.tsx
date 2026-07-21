'use client';
import { useEffect } from 'react';
import { useHydrationSafeLocale } from '@/lib/locale-context';

export default function MetaUpdater() {
  const locale = useHydrationSafeLocale();

  useEffect(() => {
    document.documentElement.lang = locale;

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
  }, [locale]);

  return null;
}
