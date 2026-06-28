'use client';
import { useLocale } from '@/lib/locale-context';
import { useEffect } from 'react';

export default function HtmlLang() {
  const { locale } = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
