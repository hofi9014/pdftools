import { locales, type Locale } from '@/lib/i18n';

export const localeGuidesSlug: Record<Locale, string> = {
  pl: 'przewodnik', en: 'guides', de: 'anleitungen',
  es: 'guias', fr: 'guides-fr', it: 'guide', pt: 'guias-pt',
  sv: 'guider', no: 'guider-no', is: 'handbaekur',
  tr: 'rehber', ar: 'دليل', fa: 'راهنما',
  hi: 'गाइड', ja: 'ガイド', zh: '指南',
};

export function localeFromSegment(segment: string): Locale {
  for (const locale of locales) {
    if (localeGuidesSlug[locale] === segment) return locale;
  }
  return 'en';
}

export function getLocaleSegment(locale: Locale): string {
  return localeGuidesSlug[locale];
}
