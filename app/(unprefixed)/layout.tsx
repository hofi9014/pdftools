import type { Metadata } from 'next';
import RootDocument from '@/app/_root/RootDocument';
import AllTranslations from '@/components/AllTranslations';
import { rootMetadata } from '@/lib/root-metadata';

// Root layout for addresses without a language prefix (/, /merge, /privacy…). proxy.ts redirects
// them to /{locale}/…; the pages here are also the client components the /[locale] pages render.
export const metadata: Metadata = rootMetadata;

export default function UnprefixedRootLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument allTranslations={AllTranslations}>{children}</RootDocument>;
}
