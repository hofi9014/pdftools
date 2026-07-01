'use client';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Locale } from './i18n';

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleCtx>({ locale: 'pl', setLocale: () => {} });

export function LocaleProvider({ children, defaultLocale }: { children: ReactNode; defaultLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale || 'pl');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved && ['ar','de','en','es','fa','fr','hi','is','it','ja','no','pl','pt','sv','tr','zh'].includes(saved)) setLocale(saved);
  }, []);

  const handleSet = (l: Locale) => {
    setLocale(l);
    localStorage.setItem('locale', l);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale: handleSet }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
