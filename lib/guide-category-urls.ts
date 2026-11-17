// Guide category address segments — the small half of lib/guide-urls.ts, kept apart so the
// breadcrumbs (on every page) can name a category without loading every article's address.

import type { Locale } from '@/lib/i18n';
import { GUIDE_CATEGORY_SLUGS } from '@/lib/guide-category-slugs';

/** Path segments arrive percent-encoded (pages) or decoded (metadata); compare the decoded NFC form. */
export function normalizeSegment(segment: string): string {
  let s = segment;
  try { s = decodeURIComponent(segment); } catch { /* a stray % — compare as is */ }
  return s.normalize('NFC');
}

/** The localized address segment of a category (the English id if a language has none). */
export function categorySegment(locale: Locale, category: string): string {
  return GUIDE_CATEGORY_SLUGS[category]?.[locale] ?? category;
}

/**
 * Which category an address segment names in this language. `legacy` marks the English id used in
 * a non-English address before 2026-11-14 (the address is then redirected to the localized one).
 */
export function resolveCategorySegment(locale: Locale, segment: string): { category: string; legacy: boolean } | null {
  const s = normalizeSegment(segment);
  for (const [category, names] of Object.entries(GUIDE_CATEGORY_SLUGS)) {
    if ((names[locale] ?? category).normalize('NFC') === s) return { category, legacy: false };
  }
  if (GUIDE_CATEGORY_SLUGS[s]) return { category: s, legacy: true };
  return null;
}
