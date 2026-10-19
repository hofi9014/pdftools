import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { LocaleProvider } from "@/lib/locale-context";
import LayoutShell from "@/components/LayoutShell";
import PwaRegister from "@/components/PwaRegister";
import Magnifier from "@/components/Magnifier";
import CookieConsent from "@/components/CookieConsent";
import MetaUpdater from "@/components/MetaUpdater";
import { localeToHtmlLang, isRtlLocale, type Locale } from "@/lib/i18n";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The <html> document shared by the app's root layouts. The page's language and direction are
 * written into the server HTML (crawlers, link previews, screen readers and the first paint of
 * Arabic/Persian pages read them before any script runs); components/HtmlLang.tsx keeps them in
 * sync on the client afterwards. `locale` is undefined only for the unprefixed legacy routes,
 * whose language is the visitor's stored preference and is known only in the browser.
 */
export default function RootDocument({ locale, children }: { locale?: Locale; children: React.ReactNode }) {
  return (
    <html
      lang={locale ? localeToHtmlLang(locale) : "en"}
      dir={locale && isRtlLocale(locale) ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{const t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`}
        </Script>
        <Script id="locale-detect" strategy="beforeInteractive">
          {`try{(function(){var ls=localStorage.getItem('locale');if(ls)return;var c=document.cookie.replace(/(?:(?:^|.*;\\s*)x-detected-locale\\s*=\\s*([^;]*).*$)|^.*$/,"$1");if(c)return;var L=['ar','de','en','es','fa','fr','hi','is','it','ja','no','pl','pt','sv','tr','zh'];var d='en',nl=navigator.languages||[navigator.language||'en'];for(var i=0;i<nl.length;i++){var b=nl[i].split('-')[0].toLowerCase();if(L.indexOf(b)!==-1){d=b;break}}document.cookie='x-detected-locale='+d+';path=/;max-age='+(365*24*60*60)+';SameSite=Lax'})()}catch(e){}`}
        </Script>
        <div className="mesh-bg" />
        <div className="grain-overlay" />
        <LocaleProvider defaultLocale="en">
          <LayoutShell>
            <PwaRegister />
            <MetaUpdater />
            <CookieConsent />
            <Magnifier />
            <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
          </LayoutShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
