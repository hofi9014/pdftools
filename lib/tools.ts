export interface ToolDef {
  key: string;
  slug: string;
  category: string;
  redirectTo?: string;
}

export const tools: ToolDef[] = [
  // Edit
  { key: 'merge',       slug: 'merge',         category: 'edit' },
  { key: 'split',       slug: 'split',         category: 'edit' },
  { key: 'compress',    slug: 'compress',      category: 'edit' },
  { key: 'rotate',      slug: 'rotate-pdf',    category: 'edit' },
  { key: 'crop',        slug: 'crop-pdf',      category: 'edit' },
  { key: 'delete',      slug: 'delete-pages',  category: 'edit' },
  { key: 'extract',     slug: 'extract-pages', category: 'edit' },
  { key: 'reorder',     slug: 'reorder-pages', category: 'edit' },
  { key: 'addpage',     slug: 'add-page',      category: 'edit' },
  { key: 'edit',        slug: 'edit-pdf',      category: 'edit' },
  { key: 'pagenumbers', slug: 'page-numbers',  category: 'edit' },
  { key: 'watermark',   slug: 'watermark-pdf', category: 'edit' },
  { key: 'redact',      slug: 'redact-pdf',    category: 'edit' },
  { key: 'flatten',     slug: 'flatten-pdf',   category: 'edit' },
  { key: 'metadata',    slug: 'metadata',      category: 'edit' },

  // Convert
  { key: 'word',         slug: 'pdf-to-word',        category: 'convert' },
  { key: 'wordtopdf',    slug: 'word-to-pdf',        category: 'convert' },
  { key: 'jpgTopdf',     slug: 'jpg-to-pdf',         category: 'convert' },
  { key: 'jpg',          slug: 'pdf-to-jpg',         category: 'convert', redirectTo: 'images' },
  { key: 'images',       slug: 'pdf-to-images',      category: 'convert' },
  { key: 'excel',        slug: 'pdf-to-excel',       category: 'convert' },
  { key: 'excel2pdf',    slug: 'excel-to-pdf',       category: 'convert' },
  { key: 'ppt',          slug: 'pdf-to-powerpoint',  category: 'convert' },
  { key: 'openoffice',   slug: 'openoffice-to-pdf',  category: 'convert' },
  { key: 'pdf2openoffice', slug: 'pdf-to-openoffice', category: 'convert' },
  { key: 'txt',          slug: 'pdf-to-txt',         category: 'convert' },
  { key: 'svg',          slug: 'pdf-to-svg',         category: 'convert' },
  { key: 'epub',         slug: 'pdf-to-epub',        category: 'convert' },
  { key: 'html',         slug: 'html-to-pdf',        category: 'convert' },
  { key: 'html2pdf',     slug: 'pdf-to-html',        category: 'convert' },
  { key: 'url',          slug: 'url-to-pdf',         category: 'convert' },

  // Secure
  { key: 'protect',  slug: 'protect-pdf', category: 'secure' },
  { key: 'unlock',   slug: 'unlock-pdf',  category: 'secure' },
  { key: 'sign',     slug: 'sign-pdf',    category: 'secure' },

  // More
  { key: 'aichat',    slug: 'ai-chat',       category: 'more' },
  { key: 'aisummary', slug: 'ai-summary',    category: 'more' },
  { key: 'translate', slug: 'ai-translate',  category: 'more' },
  { key: 'ocr',       slug: 'ocr-pdf',       category: 'more' },
  { key: 'compare',   slug: 'compare-pdf',   category: 'more' },
  { key: 'fillform',  slug: 'fill-form',     category: 'more' },
  { key: 'pdfa',      slug: 'to-pdfa',       category: 'more' },
];

export const slugByKey: Record<string, string> = {};
export const keyBySlug: Record<string, string> = {};
export const toolCategory: Record<string, string> = {};

for (const t of tools) {
  slugByKey[t.key] = t.slug;
  keyBySlug[t.slug] = t.key;
  toolCategory[t.key] = t.category;
}

export interface CategoryDef {
  key: string;
  icon: string;
}

export const categories: CategoryDef[] = [
  { key: 'edit',    icon: '✏️' },
  { key: 'convert', icon: '🔄' },
  { key: 'secure',  icon: '🔒' },
  { key: 'more',    icon: '🧩' },
];

export function toolsByCategory(categoryKey: string): ToolDef[] {
  return tools.filter(t => t.category === categoryKey);
}

export function toolPath(key: string, locale?: string): string {
  const slug = slugByKey[key];
  if (!slug) return locale ? `/${locale}/${key}` : `/${key}`;
  return locale ? `/${locale}/${slug}` : `/${slug}`;
}

export default tools;
