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
  // Safe: the regex's one capture group always matches when `match` is non-null.
  return match ? decodeURIComponent(match[1]!) : null;
}

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  setLocaleLocal: (l: Locale) => void;
  mounted: boolean;
  /** The language in the address (/de/…, /guides/anleitungen/…); undefined on unprefixed pages. */
  routeLocale?: Locale;
}

const LocaleContext = createContext<LocaleCtx>({ locale: 'en', setLocale: () => {}, setLocaleLocal: () => {}, mounted: false });

export function LocaleProvider({ children, defaultLocale, routeLocale }: { children: ReactNode; defaultLocale?: Locale; routeLocale?: Locale }) {
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
    <LocaleContext.Provider value={{ locale, setLocale: handleSet, setLocaleLocal: handleSetLocal, mounted, routeLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

/**
 * The language to render in. On a page with a language in its address, that language — from the
 * server render on. Elsewhere 'en' during SSR/hydration, then the stored or detected one.
 *
 * FINDING (2026-10-22): this used to ignore the address, so components without a locale prop (the
 * PDF editor's toolbar and panels, page thumbnails, cloud pickers/savers, the install section)
 * rendered in English on the server and then in the visitor's STORED language — on /de/edit-pdf
 * the toolbar said "Select (V)", or "Zaznacz (V)" with Polish stored. With one dictionary per
 * page (lib/i18n.ts) such a component would not find its language at all.
 */
export function useHydrationSafeLocale(): Locale {
  const { locale, mounted, routeLocale } = useLocale();
  if (routeLocale) return routeLocale;
  if (typeof window === 'undefined' || !mounted) return 'en';
  return locale;
}
