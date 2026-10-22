import { locales, defaultLocale, type Locale } from '@/lib/i18n';

const LOCALES = new Set<string>(locales);

/** An object keyed by language codes only ({ pl: …, en: …, de: … }). */
function isLocaleMap(v: object): v is Record<string, unknown> {
  const keys = Object.keys(v);
  return keys.length >= 2 && keys.every((k) => LOCALES.has(k));
}

/**
 * Page text in one language, for a server page to hand its client view (2026-10-22). Every
 * `{ pl, en, de, … }` object inside `data` keeps only `locale` — or the en text under the
 * locale's key when that language is missing, which is what the views' own fallback
 * (`obj[locale] || obj.en`) would show — so the view renders exactly as with all 16 languages
 * while the page carries one. Checked view by view in tests/localize-page-data.mts.
 */
export function localizeData<T>(data: T, locale: Locale): T {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v === null || typeof v !== 'object') return v;
    const o = v as Record<string, unknown>;
    if (isLocaleMap(o)) {
      const own = o[locale];
      return { [locale]: walk(own === undefined || own === '' ? o[defaultLocale] : own) };
    }
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, walk(x)]));
  };
  return walk(data) as T;
}
