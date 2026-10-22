import guides from '@/content/guides';

/** What the home page shows of a guide: its address, title and excerpt. */
export interface GuideCard {
  slug: string;
  category: string;
  title: Record<string, string>;
  excerpt: Record<string, string>;
}

/** The four guides the home page lists — server only, so the articles stay out of the browser. */
export function homeGuideCards(): GuideCard[] {
  return guides.slice(0, 4).map((a) => ({ slug: a.slug, category: a.category, title: a.title, excerpt: a.excerpt }));
}
