import type { Metadata } from 'next';
import { tools } from '@/lib/tools';
import { OG_IMAGE } from '@/lib/metadata';

/** Metadata shared by every root layout (app/[locale], app/guides/[locale], app/(unprefixed)). */
export const rootMetadata: Metadata = {
  title: {
    default: 'OptimaPDF - Free online PDF tools',
    template: '%s | OptimaPDF',
  },
  description: `Merge, split, compress, convert and edit PDF files online for free. ${tools.length} PDF tools, AI Chat, AI Summary, AI Translate, PDF editor, electronic signature, OCR, password protection. No installation, secure and fast.`,
  keywords: ['PDF', 'merge PDF', 'split PDF', 'compress PDF', 'convert PDF', 'PDF editor', 'OCR PDF', 'AI PDF', 'free PDF tools', 'PDF to PowerPoint', 'compare PDF', 'Excel to PDF', 'AI PDF translator'],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'OptimaPDF - Free online PDF tools',
    description: `Merge, split, compress, convert and edit PDFs for free online. ${tools.length} PDF tools, AI Chat, AI Summary, AI Translate, PDF editor, electronic signature, OCR, password protection. No installation, secure and fast.`,
    url: 'https://optimapdf.com',
    siteName: 'OptimaPDF',
    locale: 'en_US',
    type: 'website',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OptimaPDF - Free online PDF tools',
    description: `Merge, split, compress, convert and edit PDFs for free online. ${tools.length} PDF tools, AI Chat, AI Summary, AI Translate, PDF editor, electronic signature, OCR, password protection.`,
    images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }],
  },
  icons: {
    icon: { url: '/icon?v=2', sizes: '32x32', type: 'image/png' },
    apple: { url: '/icons/apple-touch-icon-180.png', sizes: '180x180' },
  },
  manifest: '/manifest.json',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'mobile-web-app-capable': 'yes',
  },
};
