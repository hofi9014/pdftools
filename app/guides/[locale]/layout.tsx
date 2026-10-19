import type { Metadata } from 'next';
import RootDocument from '@/app/_root/RootDocument';
import { rootMetadata } from '@/lib/root-metadata';
import { localeFromSegment } from '@/lib/guides-slugs';

export const metadata: Metadata = rootMetadata;

// Root layout of the guides: the language comes from the localized segment
// (/guides/anleitungen/… → de), so the server HTML carries the right lang/dir.
export default async function GuidesLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <RootDocument locale={localeFromSegment(locale)}>{children}</RootDocument>;
}
