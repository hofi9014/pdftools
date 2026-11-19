// The Polish KSeF guide under the tool: /pl/ksef-xml-na-pdf/jak-otworzyc-fakture-xml, Polish only.
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import KsefArticle from '@/components/ksef/KsefArticle';
import { socialMetadata, fullTitle } from '@/lib/metadata';
import { KSEF_GUIDE_DESCRIPTION, KSEF_GUIDE_PATH, KSEF_GUIDE_PUBLISHED, KSEF_GUIDE_TITLE, KSEF_GUIDE_UPDATED } from '@/content/pages/ksef-guide';

const PAGE_URL = `https://optimapdf.com${KSEF_GUIDE_PATH}`;

export function generateStaticParams() {
  return [{ locale: 'pl' }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'pl') notFound();
  return {
    title: KSEF_GUIDE_TITLE,
    description: KSEF_GUIDE_DESCRIPTION,
    alternates: { canonical: PAGE_URL },
    ...socialMetadata({ locale: 'pl', title: fullTitle(KSEF_GUIDE_TITLE), description: KSEF_GUIDE_DESCRIPTION, url: PAGE_URL, type: 'article', publishedTime: KSEF_GUIDE_PUBLISHED, modifiedTime: KSEF_GUIDE_UPDATED }),
  };
}

export default async function KsefGuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'pl') notFound();
  return <KsefArticle />;
}
