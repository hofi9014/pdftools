import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LocaleProvider } from "@/lib/locale-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PwaRegister from "@/components/PwaRegister";
import Breadcrumbs from "@/components/Breadcrumbs";
import HtmlLang from "@/components/HtmlLang";
import SchemaHowTo from "@/components/SchemaHowTo";
import Magnifier from "@/components/Magnifier";
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
    default: "PDFTools - Darmowe narzedzia PDF online",
    template: "%s | PDFTools",
  },
    description: "Scalaj, dziel, kompresuj, konwertuj i edytuj pliki PDF za darmo online. 41 narzedzi PDF, AI Chat, AI Streszczenie, Tlumacz AI, edytor PDF, podpis elektroniczny, OCR, ochrona haslem. Bez instalacji, bezpiecznie i szybko.",
    keywords: ["PDF", "laczenie PDF", "dzielenie PDF", "kompresja PDF", "konwersja PDF", "edytor PDF", "OCR PDF", "AI PDF", "darmowe narzedzia PDF", "PDF do PowerPoint", "porownaj PDF", "Excel do PDF", "tlumacz PDF AI"],
  robots: { index: true, follow: true },
  openGraph: {
    title: "PDFTools - Darmowe narzedzia PDF online",
    description: "41 darmowych narzedzi PDF: scalaj, dziel, kompresuj, konwertuj, edytuj PDF, tlumacz AI, podpisz PDF, OCR, AI Chat, AI Streszczenie, porownaj PDF, PowerPoint, HTML. Bez instalacji, za darmo.",
    url: "https://optimapdf.com",
    siteName: "PDFTools",
    locale: "pl_PL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFTools - Darmowe narzedzia PDF online",
    description: "41 darmowych narzedzi PDF: scalaj, dziel, kompresuj, konwertuj, edytuj PDF, tlumacz AI, podpisz PDF, OCR, AI Chat, AI Streszczenie, porownaj PDF, PowerPoint, HTML.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/manifest.webmanifest",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const theme = localStorage.getItem('theme');
              if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          `,
        }} />
        <link rel="alternate" hrefLang="pl" href="https://optimapdf.com" />
        <link rel="alternate" hrefLang="en" href="https://optimapdf.com/en" />
        <link rel="alternate" hrefLang="es" href="https://optimapdf.com/es" />
        <link rel="alternate" hrefLang="de" href="https://optimapdf.com/de" />
        <link rel="alternate" hrefLang="fr" href="https://optimapdf.com/fr" />
        <link rel="alternate" hrefLang="it" href="https://optimapdf.com/it" />
        <link rel="alternate" hrefLang="pt" href="https://optimapdf.com/pt" />
        <link rel="alternate" hrefLang="is" href="https://optimapdf.com/is" />
        <link rel="alternate" hrefLang="tr" href="https://optimapdf.com/tr" />
        <link rel="alternate" hrefLang="sv" href="https://optimapdf.com/sv" />
        <link rel="alternate" hrefLang="no" href="https://optimapdf.com/no" />
        <link rel="alternate" hrefLang="ja" href="https://optimapdf.com/ja" />
        <link rel="alternate" hrefLang="hi" href="https://optimapdf.com/hi" />
        <link rel="alternate" hrefLang="x-default" href="https://optimapdf.com" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <div className="mesh-bg" />
        <div className="grain-overlay" />
        <LocaleProvider>
          <HtmlLang />
          <SchemaHowTo />
          <Header />
          <PwaRegister />
          <Breadcrumbs />
          <Magnifier />
          <main className="flex-1">{children}</main>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}