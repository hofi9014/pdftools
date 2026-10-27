import { all as bundled } from '#translations';

export const defaultLocale = 'en' as const;
export const locales = ['ar', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'is', 'it', 'ja', 'no', 'pl', 'pt', 'sv', 'tr', 'zh'] as const;
export type Locale = (typeof locales)[number];

export const htmlLangMap: Record<Locale, string> = {
  ar: 'ar', de: 'de', en: 'en', es: 'es', fa: 'fa', fr: 'fr', hi: 'hi',
  is: 'is', it: 'it', ja: 'ja', no: 'no', pl: 'pl', pt: 'pt-PT',
  sv: 'sv', tr: 'tr', zh: 'zh-Hans',
};

export function localeToHtmlLang(locale: Locale): string {
  return htmlLangMap[locale] ?? locale;
}

const rtlLocales: readonly Locale[] = ['ar', 'fa'];

export function isRtlLocale(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

// Where the dictionaries live (2026-10-22). They are in lib/translations/<locale>.ts. On the
// server and in tests `all` below holds all 16. The browser bundle gets an empty object instead:
// package.json "imports" maps '#translations' to lib/translations/none.ts for the browser.
// Each page loads its own language as one cached script, /<locale>/messages.js (lib/i18n-asset.ts,
// components/Translations.tsx; until 2026-10-27 it was passed as page data, four copies in every
// prerendered page), and pages whose language is known only in
// the browser register all of them (components/AllTranslations.tsx). Before, every page loaded
// one 918 kB script holding all 16 languages (176 kB over the wire with brotli).
export const all: Record<string, Record<string, string>> = { ...bundled };

/** The global /<locale>/messages.js fills in the browser (lib/i18n-asset.ts, components/Translations.tsx). */
export const MESSAGES_GLOBAL = '__OPTIMA_I18N';

/** Makes a dictionary available to t() — used in the browser, where none are bundled. */
export function registerMessages(locale: string, messages: Record<string, string>): void {
  all[locale] = messages;
}

/**
 * A page's complete dictionary: its language with the en fallback already applied, so the
 * browser needs only this one object. Server only — in the browser `all` starts empty.
 */
export function messagesFor(locale: Locale): Record<string, string> {
  return { ...bundled[defaultLocale], ...bundled[locale] };
}

const reportedMissing = new Set<string>();

export function t(key: string, locale?: string, params?: Record<string, string | number>): string {
  const lang = locale || defaultLocale;
  const dict = all[lang];
  if (!dict && typeof window !== 'undefined' && !reportedMissing.has(lang)) {
    // A component asked for a language the page did not load: it would show keys. Reported once
    // per language so tests (e2e/i18n-page-bundle.mts) and the console catch it.
    reportedMissing.add(lang);
    console.error(`[i18n] translations for "${lang}" are not loaded on this page`);
  }
  let val = dict?.[key] ?? all[defaultLocale]?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      // FINDING (2026-09-22): a string passed directly as String.replace()'s second argument
      // is not inserted literally — sequences like $&, $`, $', $$, $1 are special replacement
      // patterns (MDN). Any user-typed value containing '$' (e.g. typing a price into the
      // homepage search box, which flows into 'home.search_no_results' via { query: search })
      // got silently mangled — '$&' means "re-insert the matched substring", so searching for
      // "foo$&bar" rendered as "...pasujących do „foo{query}bar”." instead of the literal
      // typed text. A replacer FUNCTION always inserts its return value literally, with no
      // special-pattern parsing, so it's used here instead of the raw string.
      val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), () => String(v));
    }
  }
  return val;
}


