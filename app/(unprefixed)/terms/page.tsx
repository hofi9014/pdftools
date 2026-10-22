import TermsView from '@/components/pages/TermsView';
import { content } from '@/content/pages/terms';

// No language in the address: the view follows the visitor's stored one, so it gets them all.
export default function Page() {
  return <TermsView content={content} />;
}
