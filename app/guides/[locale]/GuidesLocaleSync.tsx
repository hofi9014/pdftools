'use client';
import { useLocale } from '@/lib/locale-context';
import { useEffect } from 'react';
import type { Locale } from '@/lib/i18n';

export default function GuidesLocaleSync({ locale }: { locale: Locale }) {
  const { setLocale } = useLocale();
  useEffect(() => { setLocale(locale); }, [locale, setLocale]);
  return null;
}
