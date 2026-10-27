import { Bricolage_Grotesque, Figtree, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { LocaleProvider } from "@/lib/locale-context";
import LayoutShell from "@/components/LayoutShell";
import PwaRegister from "@/components/PwaRegister";
import Magnifier from "@/components/Magnifier";
import CookieConsent from "@/components/CookieConsent";
import MetaUpdater from "@/components/MetaUpdater";
import Translations from "@/components/Translations";
import { localeToHtmlLang, isRtlLocale, messagesFor, type Locale } from "@/lib/i18n";
import "@/app/globals.css";

// latin-ext carries Polish, Czech, Turkish and Icelandic letters; with "latin" alone those glyphs
// fell back to a system face in the middle of a word.
const bodyFont = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
});

const displayFont = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
});

// Used only in a few code/number fields, so it is not preloaded: a preload on every page competed
// with the page's own CSS and text fonts on slow connections.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

/**
 * The <html> document shared by the app's root layouts. The page's language and direction are
 * written into the server HTML (crawlers, link previews, screen readers and the first paint of
 * Arabic/Persian pages read them before any script runs); components/HtmlLang.tsx keeps them in
 * sync on the client afterwards. `locale` is undefined only for the unprefixed legacy routes,
 * whose language is the visitor's stored preference and is known only in the browser.
 */
export default function RootDocument({ locale, allTranslations: AllTranslations, notFound = false, children }: {
  locale?: Locale;
  /**
   * Required when there is no locale: components/AllTranslations.tsx, passed in by the two callers
   * that need it (app/(unprefixed)/layout.tsx, app/global-not-found.tsx). Importing it here would
   * put all 16 dictionaries on every page — Next loads every client component a layout imports.
   */
  allTranslations?: React.ComponentType<{ children: React.ReactNode }>;
  /**
   * The 404 page (app/global-not-found.tsx). It is rendered once at build time, under the address
   * /_not-found, and served for every unknown address, so a trail built from the address said
   * "Home / _not found" in the HTML and something else in the browser — React then threw away
   * the server HTML (error #418) on every 404. A page that does not exist has no trail, and it
   * takes the language of the address only after hydration (components/LayoutShell.tsx).
   */
  notFound?: boolean;
  children: React.ReactNode;
}) {
  // `locale` is also the language every client component uses (lib/locale-context.tsx), so the
  // page loads just this one dictionary (components/Translations.tsx).
  const shell = (
    <LocaleProvider defaultLocale={locale ?? "en"} routeLocale={locale}>
      <LayoutShell notFound={notFound}>
        <PwaRegister />
        <MetaUpdater />
        <CookieConsent />
        <Magnifier />
        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
      </LayoutShell>
    </LocaleProvider>
  );
  return (
    <html
      lang={locale ? localeToHtmlLang(locale) : "en"}
      dir={locale && isRtlLocale(locale) ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <body className={`${bodyFont.variable} ${displayFont.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{const t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`}
        </Script>
        <Script id="locale-detect" strategy="beforeInteractive">
          {`try{(function(){var ls=localStorage.getItem('locale');if(ls)return;var c=document.cookie.replace(/(?:(?:^|.*;\\s*)x-detected-locale\\s*=\\s*([^;]*).*$)|^.*$/,"$1");if(c)return;var L=['ar','de','en','es','fa','fr','hi','is','it','ja','no','pl','pt','sv','tr','zh'];var d='en',nl=navigator.languages||[navigator.language||'en'];for(var i=0;i<nl.length;i++){var b=nl[i].split('-')[0].toLowerCase();if(L.indexOf(b)!==-1){d=b;break}}document.cookie='x-detected-locale='+d+';path=/;max-age='+(365*24*60*60)+';SameSite=Lax'})()}catch(e){}`}
        </Script>
        <div className="mesh-bg" />
        <div className="grain-overlay" />
        {locale ? (
          <Translations locale={locale} messages={messagesFor(locale)}>{shell}</Translations>
        ) : (
          AllTranslations ? <AllTranslations>{shell}</AllTranslations> : shell
        )}
      </body>
    </html>
  );
}
