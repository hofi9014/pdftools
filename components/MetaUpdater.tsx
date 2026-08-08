'use client';
import { useEffect } from 'react';

export default function MetaUpdater() {
  useEffect(() => {
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
  }, []);

  return null;
}
