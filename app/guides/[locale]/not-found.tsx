import type { Metadata } from 'next';
import NotFoundContent from '@/components/NotFoundContent';

// Rendered inside the guides root layout (header, footer, theme) when a guides page calls
// notFound(): an unknown language segment, category or article. Without it Next answered with
// its bare error document. The same title and robots as the global 404, so the layout's
// "index, follow" does not stay next to Next's injected noindex.
export const metadata: Metadata = {
  title: '404: This page could not be found.',
  robots: { index: false, follow: false },
};

export default function GuidesNotFound() {
  return <NotFoundContent />;
}
