import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { LocaleProvider } from "@/lib/locale-context";
import LayoutShell from "@/components/LayoutShell";
import PwaRegister from "@/components/PwaRegister";
import Magnifier from "@/components/Magnifier";
import CookieConsent from "@/components/CookieConsent";
import MetaUpdater from "@/components/MetaUpdater";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OptimaPDF - Free online PDF tools",
    template: "%s | OptimaPDF",
  },
    description: "Merge, split, compress, convert and edit PDF files online for free. 40 PDF tools, AI Chat, AI Summary, AI Translate, PDF editor, electronic signature, OCR, password protection. No installation, secure and fast.",
    keywords: ["PDF", "merge PDF", "split PDF", "compress PDF", "convert PDF", "PDF editor", "OCR PDF", "AI PDF", "free PDF tools", "PDF to PowerPoint", "compare PDF", "Excel to PDF", "AI PDF translator"],
  robots: { index: true, follow: true },
  openGraph: {
    title: "OptimaPDF - Free online PDF tools",
    description: "Merge, split, compress, convert and edit PDFs for free online. 40 PDF tools, AI Chat, AI Summary, AI Translate, PDF editor, electronic signature, OCR, password protection. No installation, secure and fast.",
    url: "https://optimapdf.com",
    siteName: "OptimaPDF",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OptimaPDF - Free online PDF tools",
    description: "Merge, split, compress, convert and edit PDFs for free online. 40 PDF tools, AI Chat, AI Summary, AI Translate, PDF editor, electronic signature, OCR, password protection.",
  },
  icons: {
    icon: { url: "/icon?v=2", sizes: "32x32", type: "image/png" },
    apple: { url: "/logo.png", sizes: "180x180" },
  },
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-KN3C22GVP8" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
          gtag('js', new Date());
          gtag('config', 'G-KN3C22GVP8', { anonymize_ip: true });`}
        </Script>
      </head>
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
            <main className="flex-1">{children}</main>
          </LayoutShell>
        </LocaleProvider>
      </body>
    </html>
  );
}