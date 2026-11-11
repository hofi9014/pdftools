import guides from '@/content/guides';
import type { GuideArticle } from '@/types/guide';

export function getAllArticles(): GuideArticle[] {
  return guides;
}

export function getArticle(category: string, slug: string): GuideArticle | undefined {
  return guides.find(a => a.category === category && a.slug === slug);
}

export function getArticlesByCategory(category: string): GuideArticle[] {
  return guides.filter(a => a.category === category);
}

export function getAllCategories(): string[] {
  return [...new Set(guides.map(a => a.category))];
}

/**
 * A category page lists its articles. With one article it is a thin copy of that article's title
 * and lead, so it is kept out of search (noindex, follow — links still count) and out of the
 * sitemap until a second article makes it a real list (2026-11-10).
 */
export const MIN_ARTICLES_TO_INDEX_CATEGORY = 2;

export function isCategoryIndexable(category: string): boolean {
  return getArticlesByCategory(category).length >= MIN_ARTICLES_TO_INDEX_CATEGORY;
}

/** The newest article date in the guides — the real last change of the hub pages. */
export function guidesLastModified(): string {
  return guides.map((a) => a.updatedAt).sort().at(-1) ?? '2026-01-01';
}
