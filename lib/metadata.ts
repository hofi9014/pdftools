import type { Metadata } from 'next';
import { all, locales, t, type Locale } from '@/lib/i18n';
import { keyBySlug, toolProcessing, tools, NON_LOCAL_TOOLS } from '@/lib/tools';
import { legalFor } from '@/lib/legal';
import { content as termsContent } from '@/content/pages/terms';
import { content as supportContent } from '@/content/pages/wsparcie';
import { content as principlesContent } from '@/content/pages/nasze-zasady';
import { helpData } from '@/content/pages/help';

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
  help: { title: 'help.link' },
  guide: { title: 'nav.guide', description: 'page.guide.subtitle' },
  'nasze-zasady': { title: 'nav.rules' },
  wsparcie: { title: 'nav.support' },
};

/** Google shows about this many characters of a description; longer ones are cut mid-sentence. */
export const SEARCH_DESCRIPTION_MAX = 160;
/** Japanese and Chinese characters are about twice as wide, so a snippet holds about 100 of them. */
const CJK_DESCRIPTION_MAX = 100;
function descriptionMax(locale: Locale): number {
  return locale === 'ja' || locale === 'zh' ? CJK_DESCRIPTION_MAX : SEARCH_DESCRIPTION_MAX;
}

/** The first sentence of a text. A CJK full stop ends a sentence with no space after it; the others need one. */
function firstSentence(text: string): string {
  const end = text.search(/[。．！？]|[.!?؟।](\s|$)/);
  return (end > 0 ? text.slice(0, end + 1) : text).trim();
}

/** Shortened at a word boundary to fit a search result. */
function clip(text: string, max = SEARCH_DESCRIPTION_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:—–-]+$/, '')}…`;
}

/** The first sentence of a legal page's introduction (or of its first section) — what the page is about, in its language. */
function legalLead(locale: Locale, doc: 'privacy' | 'security'): string | undefined {
  const d = legalFor(locale)[doc];
  const intro = d.intro ?? d.sections[0]?.p;
  return intro ? firstSentence(intro) : undefined;
}

/**
 * Descriptions of the info pages that have no lead sentence of their own. Before 2026-11-10 the
 * terms, support and principles pages fell back to the home page's description and the GDPR page
 * reused the privacy policy's — duplicate snippets for different pages.
 */
function infoLead(locale: Locale, slug: string): string | undefined {
  const pick = <T,>(c: Record<string, T>): T | undefined => c[locale] ?? c.en;
  const max = descriptionMax(locale);
  const cjk = locale === 'ja' || locale === 'zh';
  const space = cjk ? '' : ' ';
  /** `head` followed by as many of `parts` as fit. */
  const fill = (head: string, parts: string[], sep: string): string => {
    let out = head;
    for (const [i, part] of parts.entries()) {
      const next = `${out}${i === 0 ? '' : sep}${part}`;
      if (next.length > max) break;
      out = next;
    }
    return out;
  };
  if (slug === 'terms') {
    const c = pick(termsContent as Record<string, { sections: { p: string }[] }>);
    return c?.sections[0] ? clip(firstSentence(c.sections[0].p), max) : undefined;
  }
  if (slug === 'wsparcie') {
    const c = pick(supportContent as Record<string, { subtitle: string; donateSection: { p: string } }>);
    return c ? clip(`${c.subtitle}${space}${firstSentence(c.donateSection.p)}`, max) : undefined;
  }
  if (slug === 'nasze-zasady') {
    const c = pick(principlesContent);
    return c ? clip(`${c.subtitle}${space}${c.sections[0] ? firstSentence(c.sections[0].p ?? '') : ''}`.trim(), max) : undefined;
  }
  if (slug === 'help') {
    // The problems the page answers, in its words: "Common issues and how to solve them. The PDF
    // file is too large and won't load? File is not recognized as PDF? …"
    const questions = helpData.flatMap((c) => c.items.map((i) => i.q[locale] ?? i.q.en ?? ''));
    return fill(`${t('help.subtitle', locale)}${space}`, questions, space);
  }
  if (slug === 'rodo') {
    // What the GDPR information covers: its section headings without numbers, after the first
    // (the controller's name), e.g. "Informacja o RODO: Jakie dane przetwarzamy i po co, Podstawy prawne, …".
    const d = legalFor(locale).rodo;
    const heads = d.sections.slice(1).map((s) => s.h.replace(/^\d+\.\s*/, ''));
    return fill(`${d.title}${cjk ? '：' : ': '}`, heads, cjk ? '、' : locale === 'ar' || locale === 'fa' ? '، ' : ', ');
  }
  return undefined;
}

/**
 * A lead followed by as many items as fit in a search result, in the language's list style:
 * "Step-by-step guides for OptimaPDF tools: Compress PDF, Merge PDF, …".
 */
export function fitList(locale: Locale, lead: string, items: string[]): string {
  const cjk = locale === 'ja' || locale === 'zh';
  const sep = cjk ? '、' : locale === 'ar' || locale === 'fa' ? '، ' : ', ';
  const head = `${lead.replace(/[.。．:：]$/, '')}${cjk ? '：' : ': '}`;
  let out = '';
  for (const item of items) {
    const next = out ? `${out}${sep}${item}` : item;
    if ((head + next).length + 1 > descriptionMax(locale)) break;
    out = next;
  }
  return out ? `${head}${out}${cjk ? '。' : '.'}` : lead;
}

/** The home page's description; the number of tools that work in the browser comes from the tool list. */
export function homeDescription(locale: Locale): string {
  return t('meta.description', locale, { local: String(tools.length - Object.keys(NON_LOCAL_TOOLS).length), total: String(tools.length) });
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
  const kind = toolProcessing(toolKey);
  const desc = t(`desc.${toolKey}`, locale);
  const full = t(`seo.desc_${kind}`, locale, { desc });
  return {
    // Each tool's own title with the words people search for (2026-11-10, from Search Console:
    // "rearrange PDF pages", "OpenOffice to PDF", "PDF to SVG vector"…); the generic
    // "{tool} online for free" stays only for a tool that has none yet.
    title: all[locale]?.[`seo.tool_title.${toolKey}`] ?? all.en?.[`seo.tool_title.${toolKey}`] ?? t('seo.title', locale, { tool: t(`tool.${toolKey}`, locale) }),
    // The same promise, said shorter, when the long one would be cut off in a search result.
    description: full.length <= SEARCH_DESCRIPTION_MAX ? full : t(`seo.desc_${kind}_short`, locale, { desc }),
  };
}

export function pageMetadata(locale: string, slug: string, overrides?: { title?: string; description?: string }): Metadata {
  const clean = stripLeading(slug);
  const toolKey = keyBySlug[clean];
  const info = INFO_PAGES[clean];
  const l = locale as Locale;
  const toolSearch = toolKey ? toolSearchMetadata(toolKey, l) : undefined;
  const title = overrides?.title ?? (toolSearch ? toolSearch.title : info ? t(info.title, l) : t('meta.title', l));
  // The GDPR page's introduction opens with the controller's name, so it gets a summary of its sections (infoLead).
  const lead = clean === 'security' ? legalLead(l, 'security') : clean === 'privacy' ? legalLead(l, 'privacy') : infoLead(l, clean);
  const description = overrides?.description ?? (toolSearch ? toolSearch.description : info?.description ? t(info.description, l) : lead ?? homeDescription(l));
  return {
    title,
    description,
    alternates: localeAlternates(locale, clean),
    ...socialMetadata({ locale: locale as Locale, title: fullTitle(title), description, url: `${baseUrl}/${locale}/${clean}` }),
  };
}
