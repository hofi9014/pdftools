'use client';
import { useEffect } from 'react';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

export default function MetaUpdater() {
  const locale = useHydrationSafeLocale();

  useEffect(() => {
    const title = t('meta.title', locale);
    const desc = t('meta.description', locale);

    document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', desc);
    } else {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      meta.setAttribute('content', desc);
      document.head.appendChild(meta);
    }

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);

    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', title);

    let twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute('content', desc);
  }, [locale]);

  return null;
}
