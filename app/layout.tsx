import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { LocaleProvider } from "@/lib/locale-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PwaRegister from "@/components/PwaRegister";
import InstallBanner from "@/components/InstallBanner";
import Breadcrumbs from "@/components/Breadcrumbs";
import HtmlLang from "@/components/HtmlLang";
import SchemaHowTo from "@/components/SchemaHowTo";
import HreflangTags from "@/components/HreflangTags";
import Magnifier from "@/components/Magnifier";
import CookieConsent from "@/components/CookieConsent";
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
    default: "OptimaPDF - Darmowe narzędzia PDF online",
    template: "%s | OptimaPDF",
  },
    description: "Scalaj, dziel, kompresuj, konwertuj i edytuj pliki PDF za darmo online. 40 narzędzi PDF, AI Chat, AI Streszczenie, Tłumacz AI, edytor PDF, podpis elektroniczny, OCR, ochrona hasłem. Bez instalacji, bezpiecznie i szybko.",
    keywords: ["PDF", "łączenie PDF", "dzielenie PDF", "kompresja PDF", "konwersja PDF", "edytor PDF", "OCR PDF", "AI PDF", "darmowe narzędzia PDF", "PDF do PowerPoint", "porównaj PDF", "Excel do PDF", "tłumacz PDF AI"],
  robots: { index: true, follow: true },
  openGraph: {
    title: "OptimaPDF - Darmowe narzędzia PDF online",
    description: "40 darmowych narzędzi PDF: scalaj, dziel, kompresuj, konwertuj, edytuj PDF, tłumacz AI, podpisz PDF, OCR, AI Chat, AI Streszczenie, porównaj PDF, PowerPoint, HTML. Bez instalacji, za darmo.",
    url: "https://optimapdf.com",
    siteName: "OptimaPDF",
    locale: "pl_PL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OptimaPDF - Darmowe narzędzia PDF online",
    description: "40 darmowych narzędzi PDF: scalaj, dziel, kompresuj, konwertuj, edytuj PDF, tłumacz AI, podpisz PDF, OCR, AI Chat, AI Streszczenie, porównaj PDF, PowerPoint, HTML.",
  },
  icons: {
    icon: { url: "/icon", sizes: "32x32", type: "image/png" },
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
    <html lang="pl" suppressHydrationWarning>
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
        <LocaleProvider>
          <HreflangTags />
          <HtmlLang />
          <SchemaHowTo />
          <Header />
          <PwaRegister />
          <Breadcrumbs />
          <InstallBanner />
          <CookieConsent />
          <Magnifier />
          <main className="flex-1">{children}</main>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}