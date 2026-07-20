'use client';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Locale } from './i18n';

const VALID_LOCALES = ['ar', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'is', 'it', 'ja', 'no', 'pl', 'pt', 'sv', 'tr', 'zh'];

function isValidLocale(l: string): l is Locale {
  return VALID_LOCALES.includes(l);
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  setLocaleLocal: (l: Locale) => void;
  mounted: boolean;
}

const LocaleContext = createContext<LocaleCtx>({ locale: 'en', setLocale: () => {}, setLocaleLocal: () => {}, mounted: false });

export function LocaleProvider({ children, defaultLocale }: { children: ReactNode; defaultLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale || 'en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved && isValidLocale(saved)) {
      setLocale(saved);
      return;
    }
    const detected = getCookie('x-detected-locale') as Locale | null;
    if (detected && isValidLocale(detected)) {
      setLocale(detected);
    }
  }, []);

  const handleSet = (l: Locale) => {
    setLocale(l);
    localStorage.setItem('locale', l);
  };

  const handleSetLocal = (l: Locale) => {
    setLocale(l);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale: handleSet, setLocaleLocal: handleSetLocal, mounted }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

/** Returns locale during SSR/hydration, only switching to the detected locale after mount. */
export function useHydrationSafeLocale(): Locale {
  const { locale, mounted } = useLocale();
  if (typeof window === 'undefined' || !mounted) return 'en';
  return locale;
}
