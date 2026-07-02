import type { Locale } from '@/lib/i18n';

export type LocalizedString = Record<Locale, string>;

/** Klucze zgodne z istniejącymi 'tool.{key}' w i18n i Breadcrumbs.segmentToKey.
 *  Uwaga: niespójna konwencja nazewnictwa istnieje w kodzie źródłowym
 *  (jpgTopdf camelCase vs wordtopdf lowercase) — zachowana celowo,
 *  żeby zgadzać się z faktycznie używanymi kluczami. */
export type ToolSlug =
  | 'merge' | 'split' | 'compress' | 'word' | 'wordtopdf'
  | 'jpg' | 'jpgTopdf' | 'protect' | 'unlock' | 'rotate'
  | 'pagenumbers' | 'watermark' | 'ocr' | 'extract' | 'delete'
  | 'reorder' | 'crop' | 'addpage' | 'metadata' | 'edit' | 'sign'
  | 'excel' | 'excel2pdf' | 'txt' | 'svg' | 'redact' | 'epub'
  | 'aichat' | 'aisummary' | 'translate' | 'ppt' | 'compare'
  | 'html' | 'url' | 'html2pdf' | 'flatten' | 'openoffice'
  | 'pdf2openoffice' | 'fillform' | 'images' | 'pdfa';

export type ContentBlock =
  | { type: 'paragraph'; text: LocalizedString }
  | { type: 'heading'; level: 2 | 3; text: LocalizedString }
  | { type: 'step'; title: LocalizedString; text: LocalizedString }
  | { type: 'list'; items: LocalizedString[] }
  | { type: 'cta'; tool: ToolSlug };

export interface GuideArticle {
  slug: string;
  category: string;
  title: LocalizedString;
  excerpt: LocalizedString;
  body: ContentBlock[];
  relatedTool: ToolSlug;
  faq: { q: LocalizedString; a: LocalizedString }[];
  canonicalOverride?: Partial<Record<Locale, string>>;
  publishedAt: string;
  updatedAt: string;
}
