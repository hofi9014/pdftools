// KSeF XML to PDF — Polish only: the page exists at /pl/ksef-xml-na-pdf and nowhere else.
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import KsefTool from '@/components/ksef/KsefTool';
import KsefGuide from '@/components/ksef/KsefGuide';
import { socialMetadata, fullTitle } from '@/lib/metadata';
import { KSEF_DESCRIPTION, KSEF_LEAD, KSEF_SLUG, KSEF_TITLE } from '@/content/pages/ksef';

const PAGE_URL = `https://optimapdf.com/pl/${KSEF_SLUG}`;

export function generateStaticParams() {
  return [{ locale: 'pl' }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'pl') notFound();
  return {
    title: KSEF_TITLE,
    description: KSEF_DESCRIPTION,
    alternates: { canonical: PAGE_URL },
    ...socialMetadata({ locale: 'pl', title: fullTitle(KSEF_TITLE), description: KSEF_DESCRIPTION, url: PAGE_URL }),
  };
}

export default async function KsefXmlToPdfPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'pl') notFound();
  return (
    <>
      <KsefTool title={KSEF_TITLE} lead={KSEF_LEAD} />
      <KsefGuide />
    </>
  );
}
