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
