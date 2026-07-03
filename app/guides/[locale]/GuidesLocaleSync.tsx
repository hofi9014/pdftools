'use client';
import { useLocale } from '@/lib/locale-context';
import { useEffect } from 'react';
import type { Locale } from '@/lib/i18n';

export default function GuidesLocaleSync({ locale }: { locale: Locale }) {
  const { setLocaleLocal } = useLocale();
  useEffect(() => { setLocaleLocal(locale); }, [locale, setLocaleLocal]);
  return null;
}
