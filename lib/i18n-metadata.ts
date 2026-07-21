import type { Metadata } from 'next';
import { locales } from './i18n';

const baseUrl = 'https://optimapdf.com';

export function generatePageMetadata(locale: string, path: string): Metadata {
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = `${baseUrl}/${l}${path}`;
  }
  languages['x-default'] = `${baseUrl}/en${path}`;
  return {
    alternates: {
      canonical: `${baseUrl}/${locale}${path}`,
      languages,
    },
  };
}
