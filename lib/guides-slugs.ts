import type { Locale } from '@/lib/i18n';

export const localeGuidesSlug: Record<Locale, string> = {
  pl: 'przewodnik', en: 'guides', de: 'anleitungen',
  es: 'guias', fr: 'guides', it: 'guide', pt: 'guias',
  sv: 'guider', no: 'guider', is: 'handbaekur',
  tr: 'rehber', ar: 'دليل', fa: 'راهنما',
  hi: 'गाइड', ja: 'ガイド', zh: '指南',
};

const segmentToLocaleMap: Record<string, Locale> = {};
for (const [locale, segment] of Object.entries(localeGuidesSlug)) {
  segmentToLocaleMap[segment] = locale as Locale;
}

export function localeFromSegment(segment: string): Locale {
  return segmentToLocaleMap[segment] || 'en';
}

export function getLocaleSegment(locale: Locale): string {
  return localeGuidesSlug[locale];
}
