import type { Metadata } from 'next';
import RootDocument from '@/app/_root/RootDocument';
import AllTranslations from '@/components/AllTranslations';
import NotFoundContent from '@/components/NotFoundContent';

// The app has several root layouts (app/[locale], app/guides/[locale], app/(unprefixed)), so there
// is no single layout to wrap a 404 in. This page renders the same document — header, footer,
// theme — for any address no route matches, as the one root layout used to.
export const metadata: Metadata = {
  title: '404: This page could not be found.',
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <RootDocument allTranslations={AllTranslations} notFound>
      <NotFoundContent />
    </RootDocument>
  );
}
