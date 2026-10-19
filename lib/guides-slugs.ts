import { locales, type Locale } from '@/lib/i18n';

export const localeGuidesSlug: Record<Locale, string> = {
  pl: 'przewodnik', en: 'guides', de: 'anleitungen',
  es: 'guias', fr: 'guides-fr', it: 'guide', pt: 'guias-pt',
  sv: 'guider', no: 'guider-no', is: 'handbaekur',
  tr: 'rehber', ar: 'دليل', fa: 'راهنما',
  hi: 'गाइड', ja: 'ガイド', zh: '指南',
};

/** The locale of a guides URL segment. Accepts the segment percent-encoded too: a page component
    receives `/guides/دليل` as "%D8%AF%D9%84%D9%8A%D9%84" while generateMetadata receives it decoded,
    and comparing the encoded form made every ar/fa/hi/ja/zh guide page fall back to English. */
export function localeFromSegment(segment: string): Locale {
  let decoded = segment;
  try { decoded = decodeURIComponent(segment); } catch { /* a stray % — compare as is */ }
  const normalized = decoded.normalize('NFC');
  for (const locale of locales) {
    if (localeGuidesSlug[locale].normalize('NFC') === normalized) return locale;
  }
  return 'en';
}

export function getLocaleSegment(locale: Locale): string {
  return localeGuidesSlug[locale];
}
