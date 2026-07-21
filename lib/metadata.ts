import type { Metadata } from 'next';
import { locales, t, type Locale } from '@/lib/i18n';
import { keyBySlug } from '@/lib/tools';

const baseUrl = 'https://optimapdf.com';

function stripLeading(s: string): string {
  return s.startsWith('/') ? s.slice(1) : s;
}

function localeAlternates(locale: string, slug: string): Metadata['alternates'] {
  const clean = stripLeading(slug);
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = `${baseUrl}/${l}/${clean}`;
  }
  languages['x-default'] = `${baseUrl}/en/${clean}`;
  return {
    canonical: `${baseUrl}/${locale}/${clean}`,
    languages,
  };
}

export function pageMetadata(locale: string, slug: string, overrides?: { title?: string; description?: string }): Metadata {
  const clean = stripLeading(slug);
  const toolKey = keyBySlug[clean];
  const title = overrides?.title ?? (toolKey ? t(`tool.${toolKey}`, locale as Locale) : t('meta.title', locale as Locale));
  const description = overrides?.description ?? (toolKey ? t(`desc.${toolKey}`, locale as Locale) : t('meta.description', locale as Locale));
  return {
    title,
    description,
    alternates: localeAlternates(locale, clean),
    openGraph: {
      url: `${baseUrl}/${locale}/${clean}`,
    },
  };
}
