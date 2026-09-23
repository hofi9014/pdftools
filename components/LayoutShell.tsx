'use client';
import { usePathname } from 'next/navigation';
import { type Locale, locales } from '@/lib/i18n';
import { localeFromSegment } from '@/lib/guides-slugs';
import Header from './Header';
import Footer from './Footer';
import Breadcrumbs from './Breadcrumbs';
import HtmlLang from './HtmlLang';
import SchemaHowTo from './SchemaHowTo';

// FINDING (2026-09-23) — this only ever recognized a BARE locale code as segments[0] (e.g.
// /de/merge). Guide URLs are routed as /guides/{localizedSlug}/{category}/{slug} (app/guides/
// [locale]/[category]/[slug]/page.tsx; {localizedSlug} is a per-locale string from
// localeGuidesSlug — "anleitungen" for de, "przewodnik" for pl, "guides" for en, etc. — NOT a
// bare locale code), so segments[0] is literally "guides" for every locale and never matched.
// Header/Footer/Breadcrumbs/SchemaHowTo/HtmlLang all fall back to the stored/browser-detected
// locale on EVERY guide page as a result, while app/guides/[locale]/[category]/[slug]/page.tsx
// itself correctly resolves the real locale via localeFromSegment() and renders the article body
// in that language — producing a page mixing a German article body with an English header/
// breadcrumb/footer whenever there's no matching stored preference. Recognizing the /guides/
// {localizedSlug} shape here too, via the same localeFromSegment() the article page itself
// already uses, fixes all five sibling components at once.
// Exported so tests/layout-shell-guides-locale.mts can call it directly — it's a pure function
// of its string argument, no need to mount the whole client component (which needs an app-router
// context for usePathname()) just to exercise this logic.
export function extractLocaleFromPath(pathname: string): Locale | undefined {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && (locales as readonly string[]).includes(segments[0]!)) {
    return segments[0] as Locale;
  }
  if (segments[0] === 'guides' && segments[1]) {
    return localeFromSegment(segments[1]);
  }
  return undefined;
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = extractLocaleFromPath(pathname);

  return (
    <>
      <HtmlLang locale={locale} />
      <SchemaHowTo locale={locale} />
      <Header locale={locale} />
      <Breadcrumbs locale={locale} />
      {children}
      <Footer locale={locale} />
    </>
  );
}
