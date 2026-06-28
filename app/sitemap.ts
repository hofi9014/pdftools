import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://optimapdf.com';
  const pages = [
    '', '/merge', '/split', '/compress', '/pdf-to-word', '/word-to-pdf',
    '/jpg-to-pdf', '/protect-pdf', '/unlock-pdf', '/rotate-pdf',
    '/page-numbers', '/watermark-pdf', '/ocr-pdf', '/extract-pages', '/delete-pages',
    '/reorder-pages', '/crop-pdf', '/add-page', '/edit-pdf', '/metadata', '/openoffice-to-pdf', '/sign-pdf',
    '/pdf-to-openoffice', '/pdf-to-excel', '/ai-chat', '/ai-summary', '/privacy',
    '/pdf-to-powerpoint', '/compare-pdf', '/excel-to-pdf', '/pdf-to-txt',
    '/html-to-pdf', '/url-to-pdf', '/pdf-to-html', '/flatten-pdf',
    '/pdf-to-svg', '/redact-pdf', '/pdf-to-epub', '/ai-translate', '/fill-form', '/pdf-to-images', '/to-pdfa', '/faq', '/help', '/rodo', '/security',
  ];
  return pages.map(path => ({
    url: base + path,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1.0 : 0.8,
  }));
}
