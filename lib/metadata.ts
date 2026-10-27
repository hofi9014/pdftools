import type { Metadata } from 'next';
import { locales, t, type Locale } from '@/lib/i18n';
import { keyBySlug, toolProcessing } from '@/lib/tools';
import { legalFor } from '@/lib/legal';

const baseUrl = 'https://optimapdf.com';

/** The picture link previews show for every page (scripts/build-og-image.mjs): brand and formats, no words. */
export const OG_IMAGE = { url: `${baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: 'OptimaPDF', type: 'image/jpeg' } as const;

/** og:locale (language_TERRITORY), the form Facebook, LinkedIn and others read. */
export const OG_LOCALES: Record<Locale, string> = {
  ar: 'ar_AR', de: 'de_DE', en: 'en_US', es: 'es_ES', fa: 'fa_IR', fr: 'fr_FR', hi: 'hi_IN', is: 'is_IS',
  it: 'it_IT', ja: 'ja_JP', no: 'nb_NO', pl: 'pl_PL', pt: 'pt_PT', sv: 'sv_SE', tr: 'tr_TR', zh: 'zh_CN',
};

/**
 * The link-preview tags of one page: Open Graph (Facebook, LinkedIn, Slack, WhatsApp, Discord…) and
 * the X card, in the page's language, with the picture. A page's `openGraph` replaces the layout's
 * as a whole in Next's metadata merge, so every page states all of it — before, a tool page kept
 * only og:url (no site name, type, locale or picture) and every card was in English.
 */
export function socialMetadata(o: { locale: Locale; title: string; description: string; url: string; type?: 'website' | 'article'; publishedTime?: string; modifiedTime?: string }): Pick<Metadata, 'openGraph' | 'twitter'> {
  const alternateLocale = locales.filter((l) => l !== o.locale).map((l) => OG_LOCALES[l]);
  const openGraph: Metadata['openGraph'] = o.type === 'article'
    ? { type: 'article', title: o.title, description: o.description, url: o.url, siteName: 'OptimaPDF', locale: OG_LOCALES[o.locale], alternateLocale, images: [OG_IMAGE], publishedTime: o.publishedTime, modifiedTime: o.modifiedTime }
    : { type: 'website', title: o.title, description: o.description, url: o.url, siteName: 'OptimaPDF', locale: OG_LOCALES[o.locale], alternateLocale, images: [OG_IMAGE] };
  return {
    openGraph,
    twitter: { card: 'summary_large_image', title: o.title, description: o.description, images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }] },
  };
}

/** "Połącz PDF" → "Połącz PDF | OptimaPDF", the same as the page's <title> (template in lib/root-metadata.ts). */
export function fullTitle(title: string): string {
  return /OptimaPDF/.test(title) ? title : `${title} | OptimaPDF`;
}

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

/**
 * Pages that are not tools: their name (the same translation the breadcrumbs use) and, where the
 * page has a translated lead, its description. Before, each of them got the home page's title
 * through the "%s | OptimaPDF" template — "OptimaPDF - … | OptimaPDF" on nine different pages.
 */
const INFO_PAGES: Record<string, { title: string; description?: string }> = {
  privacy: { title: 'breadcrumb.privacy' },
  rodo: { title: 'rodo.link' },
  security: { title: 'security.link' },
  terms: { title: 'breadcrumb.terms' },
  faq: { title: 'faq.link', description: 'faq.subtitle' },
  help: { title: 'help.link', description: 'help.subtitle' },
  guide: { title: 'nav.guide', description: 'page.guide.subtitle' },
  'nasze-zasady': { title: 'nav.rules' },
  wsparcie: { title: 'nav.support' },
};

/** The first sentence of a legal page's introduction (or of its first section) — what the page is about, in its language. */
function legalLead(locale: Locale, doc: 'privacy' | 'security'): string | undefined {
  const d = legalFor(locale)[doc];
  const intro = d.intro ?? d.sections[0]?.p;
  if (!intro) return undefined;
  // A CJK full stop ends a sentence with no space after it; the others need one.
  const end = intro.search(/[。．！？]|[.!?؟।](\s|$)/);
  return (end > 0 ? intro.slice(0, end + 1) : intro).trim();
}

/**
 * A tool page's title and description as search results show them. The title names the tool and
 * what people search for with it ("online", "free"); the description is the tool's one-line
 * purpose followed by what sets it apart — no sign-up, no watermark, and where the file goes
 * (stays in the browser; for the AI tools only extracted text leaves it; URL to PDF has our
 * server fetch the page). Before, the description was the bare purpose, 20-55 characters, so
 * search engines built the snippet from the page text, which is mostly the menu.
 */
export function toolSearchMetadata(toolKey: string, locale: Locale): { title: string; description: string } {
  const tool = t(`tool.${toolKey}`, locale);
  return {
    title: t('seo.title', locale, { tool }),
    description: t(`seo.desc_${toolProcessing(toolKey)}`, locale, { desc: t(`desc.${toolKey}`, locale) }),
  };
}

export function pageMetadata(locale: string, slug: string, overrides?: { title?: string; description?: string }): Metadata {
  const clean = stripLeading(slug);
  const toolKey = keyBySlug[clean];
  const info = INFO_PAGES[clean];
  const l = locale as Locale;
  const toolSearch = toolKey ? toolSearchMetadata(toolKey, l) : undefined;
  const title = overrides?.title ?? (toolSearch ? toolSearch.title : info ? t(info.title, l) : t('meta.title', l));
  // The GDPR page's introduction opens with the controller's name, so it reuses the privacy lead.
  const lead = clean === 'security' ? legalLead(l, 'security') : clean === 'privacy' || clean === 'rodo' ? legalLead(l, 'privacy') : undefined;
  const description = overrides?.description ?? (toolSearch ? toolSearch.description : info?.description ? t(info.description, l) : lead ?? t('meta.description', l));
  return {
    title,
    description,
    alternates: localeAlternates(locale, clean),
    ...socialMetadata({ locale: locale as Locale, title: fullTitle(title), description, url: `${baseUrl}/${locale}/${clean}` }),
  };
}
