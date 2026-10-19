import type { Metadata } from 'next';
import RootDocument from '@/app/_root/RootDocument';

// The app has several root layouts (app/[locale], app/guides/[locale], app/(unprefixed)), so there
// is no single layout to wrap a 404 in. This page renders the same document — header, footer,
// theme — for any address no route matches, as the one root layout used to.
export const metadata: Metadata = {
  title: '404: This page could not be found.',
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <RootDocument>
      <div className="flex flex-col items-center justify-center gap-2 py-24 px-4 text-center">
        <h1 className="text-4xl font-bold tool-heading">404</h1>
        <p className="text-gray-500 dark:text-gray-400">This page could not be found.</p>
      </div>
    </RootDocument>
  );
}
