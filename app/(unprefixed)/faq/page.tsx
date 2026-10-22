import FaqView from '@/components/pages/FaqView';
import { faqData } from '@/content/pages/faq';

// No language in the address: the view follows the visitor's stored one, so it gets them all.
export default function Page() {
  return <FaqView faqData={faqData} />;
}
